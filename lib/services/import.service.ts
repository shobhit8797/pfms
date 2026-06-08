import { prisma } from "@/lib/db"
import { notFound, validation } from "@/lib/errors"
import { fetchBlobBuffer } from "@/lib/blob"
import { parseCSV } from "@/lib/statement-parser"
import {
  extractFromText,
  extractFromImage,
  type ExtractedRow,
  type CategoryHint,
  type PaymentModeHint,
} from "@/lib/llm/extraction"
import type { ImportFileType, CategoryType, Prisma } from "@prisma/client"

/** A normalized raw row prior to enrichment. */
type RawRow = {
  date: Date | null
  description: string
  amount: number
  direction: "DEBIT" | "CREDIT"
  suggestedCategoryId?: string | null
  suggestedPaymentModeId?: string | null
  suggestedType?: CategoryType | null
  confidence?: number
}

export async function createImport(
  userId: string,
  input: { fileUrl: string; fileName?: string; fileType: ImportFileType }
) {
  return prisma.statementImport.create({
    data: {
      userId,
      fileUrl: input.fileUrl,
      fileName: input.fileName ?? null,
      fileType: input.fileType,
      status: "EXTRACTING",
    },
  })
}

export async function listImports(userId: string) {
  return prisma.statementImport.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { stagedTxns: true, committedTxns: true } } },
  })
}

export async function getImportWithStaged(userId: string, id: string) {
  const imp = await prisma.statementImport.findFirst({
    where: { id, userId, deletedAt: null },
    include: { stagedTxns: { orderBy: { rawDate: "asc" } } },
  })
  if (!imp) throw notFound("Import not found")
  return imp
}

// ---------------------------------------------------------------------------
// Extraction worker
// ---------------------------------------------------------------------------

async function loadHints(userId: string): Promise<{ categories: CategoryHint[]; paymentModes: PaymentModeHint[] }> {
  const [cats, modes] = await Promise.all([
    prisma.category.findMany({
      where: { userId, deletedAt: null, isArchived: false },
      select: { id: true, name: true, type: true },
    }),
    prisma.paymentMode.findMany({
      where: { userId, deletedAt: null, isArchived: false },
      select: { id: true, name: true },
    }),
  ])
  return { categories: cats, paymentModes: modes }
}

function toRawFromParsed(parsed: { date: Date; description: string; amount: number; type: "CREDIT" | "DEBIT" }): RawRow {
  return {
    date: parsed.date,
    description: parsed.description,
    amount: Math.abs(parsed.amount),
    direction: parsed.type,
    confidence: 1,
  }
}

function toRawFromExtracted(row: ExtractedRow): RawRow {
  return {
    date: row.date ? new Date(row.date) : null,
    description: row.description,
    amount: Math.abs(row.amount),
    direction: row.direction,
    suggestedCategoryId: row.suggestedCategoryId,
    suggestedPaymentModeId: row.suggestedPaymentModeId,
    suggestedType: row.suggestedType,
    confidence: row.confidence,
  }
}

/**
 * Server-side enrichment of raw rows: validates suggested ids against the user's
 * own data, derives type from category, and flags likely duplicates against the
 * existing ledger (batched, not N+1).
 */
async function enrich(userId: string, rows: RawRow[], categories: CategoryHint[], paymentModes: PaymentModeHint[]) {
  const catById = new Map(categories.map((c) => [c.id, c]))
  const modeIds = new Set(paymentModes.map((p) => p.id))
  const firstOfType = new Map<CategoryType, string>()
  for (const c of categories) if (!firstOfType.has(c.type)) firstOfType.set(c.type, c.id)

  // Batch-fetch ledger rows within the import's date span for duplicate matching.
  const dates = rows.map((r) => r.date).filter((d): d is Date => !!d)
  let existing: { id: string; date: Date; amount: Prisma.Decimal; description: string }[] = []
  if (dates.length) {
    const min = new Date(Math.min(...dates.map((d) => d.getTime())))
    const max = new Date(Math.max(...dates.map((d) => d.getTime())))
    min.setDate(min.getDate() - 3)
    max.setDate(max.getDate() + 3)
    existing = await prisma.transaction.findMany({
      where: { userId, deletedAt: null, date: { gte: min, lte: max } },
      select: { id: true, date: true, amount: true, description: true },
    })
  }

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24)

  return rows.map((r) => {
    let categoryId = r.suggestedCategoryId && catById.has(r.suggestedCategoryId) ? r.suggestedCategoryId : null
    const type = categoryId ? catById.get(categoryId)!.type : r.suggestedType ?? null
    // Fallback: if a type is known but no category, pick the first category of that type.
    if (!categoryId && type && firstOfType.has(type)) categoryId = firstOfType.get(type)!
    const paymentModeId =
      r.suggestedPaymentModeId && modeIds.has(r.suggestedPaymentModeId) ? r.suggestedPaymentModeId : null

    // Duplicate guess: same rounded amount within ±3 days + fuzzy description.
    let isDuplicateGuess = false
    let duplicateOfTxnId: string | null = null
    if (r.date) {
      const match = existing.find((e) => {
        const sameAmount = Math.abs(Number(e.amount) - r.amount) < 0.01
        const dayDiff = Math.abs(e.date.getTime() - r.date!.getTime()) / 86400000
        const descClose = norm(e.description) === norm(r.description)
        return sameAmount && dayDiff <= 3 && descClose
      })
      if (match) {
        isDuplicateGuess = true
        duplicateOfTxnId = match.id
      }
    }

    return {
      rawDate: r.date,
      rawDescription: r.description,
      rawAmount: r.amount,
      direction: r.direction,
      suggestedCategoryId: categoryId,
      suggestedPaymentModeId: paymentModeId,
      suggestedType: type,
      confidence: r.confidence ?? null,
      isDuplicateGuess,
      duplicateOfTxnId,
    }
  })
}

/**
 * Runs extraction for an import: routes by file type, enriches, and stages the
 * rows. Marks the import NEEDS_REVIEW on success or FAILED on error. Idempotent
 * enough to be re-driven by the cron sweep (clears prior staged rows first).
 */
export async function runExtractionForImport(userId: string, importId: string): Promise<void> {
  const imp = await prisma.statementImport.findFirst({ where: { id: importId, userId } })
  if (!imp) throw notFound("Import not found")

  try {
    const { categories, paymentModes } = await loadHints(userId)
    let rawRows: RawRow[]
    let model: string | null = null
    let tokensUsed: number | null = null
    let cost: number | null = null

    if (imp.fileType === "CSV") {
      const buf = await fetchBlobBuffer(imp.fileUrl)
      const result = parseCSV(buf.toString("utf-8"))
      if (!result.success) throw new Error(result.error || "CSV parse failed")
      rawRows = result.transactions.map(toRawFromParsed)
    } else if (imp.fileType === "PDF") {
      const buf = await fetchBlobBuffer(imp.fileUrl)
      // Try deterministic XLSX-ish? No — PDF text via pdf-parse, then LLM.
      const { PDFParse } = await import("pdf-parse")
      const parser = new PDFParse({ data: buf })
      const text = (await parser.getText()).text
      const extraction = await extractFromText(text, categories, paymentModes)
      rawRows = extraction.rows.map(toRawFromExtracted)
      model = extraction.model
      tokensUsed = extraction.usage.total_tokens ?? null
      cost = extraction.usage.cost ?? null
    } else {
      // IMAGE → vision model directly on the blob URL.
      const extraction = await extractFromImage(imp.fileUrl, categories, paymentModes)
      rawRows = extraction.rows.map(toRawFromExtracted)
      model = extraction.model
      tokensUsed = extraction.usage.total_tokens ?? null
      cost = extraction.usage.cost ?? null
    }

    const staged = await enrich(userId, rawRows, categories, paymentModes)

    await prisma.$transaction(async (tx) => {
      await tx.stagedTransaction.deleteMany({ where: { importBatchId: importId } })
      if (staged.length) {
        await tx.stagedTransaction.createMany({
          data: staged.map((s) => ({ ...s, userId, importBatchId: importId })),
        })
      }
      await tx.statementImport.update({
        where: { id: importId },
        data: {
          status: "NEEDS_REVIEW",
          modelUsed: model,
          tokensUsed,
          costEstimate: cost,
          errorMessage: null,
        },
      })
    })
  } catch (error) {
    await prisma.statementImport.update({
      where: { id: importId },
      data: { status: "FAILED", errorMessage: (error as Error).message.slice(0, 1000) },
    })
  }
}

// ---------------------------------------------------------------------------
// Review + commit + undo
// ---------------------------------------------------------------------------

type ReviewRowInput = {
  id: string
  rawDate?: Date | null
  rawDescription?: string
  rawAmount?: number
  suggestedCategoryId?: string | null
  suggestedPaymentModeId?: string | null
  suggestedType?: CategoryType | null
  reviewStatus?: "PENDING" | "EDITED" | "APPROVED" | "REJECTED"
}

export async function applyReview(userId: string, importId: string, rows: ReviewRowInput[]) {
  await getImportWithStaged(userId, importId) // ownership check
  await prisma.$transaction(
    rows.map((r) =>
      prisma.stagedTransaction.update({
        where: { id: r.id },
        data: {
          ...(r.rawDate !== undefined ? { rawDate: r.rawDate } : {}),
          ...(r.rawDescription !== undefined ? { rawDescription: r.rawDescription } : {}),
          ...(r.rawAmount !== undefined ? { rawAmount: r.rawAmount } : {}),
          ...(r.suggestedCategoryId !== undefined ? { suggestedCategoryId: r.suggestedCategoryId } : {}),
          ...(r.suggestedPaymentModeId !== undefined ? { suggestedPaymentModeId: r.suggestedPaymentModeId } : {}),
          ...(r.suggestedType !== undefined ? { suggestedType: r.suggestedType } : {}),
          ...(r.reviewStatus !== undefined ? { reviewStatus: r.reviewStatus } : {}),
        },
      })
    )
  )
  return { updated: rows.length }
}

/**
 * Commits all APPROVED staged rows into the ledger with a shared importBatchId.
 * Approved rows must have a category. Sets the import COMPLETED (or
 * PARTIALLY_APPROVED if some rows remain unreviewed/rejected).
 */
export async function commitImport(userId: string, importId: string) {
  const imp = await getImportWithStaged(userId, importId)
  const approved = imp.stagedTxns.filter((s) => s.reviewStatus === "APPROVED")

  if (approved.length === 0) throw validation("No approved rows to commit")

  const missingCategory = approved.find((s) => !s.suggestedCategoryId)
  if (missingCategory) throw validation("Every approved row needs a category before committing")

  // Validate referenced categories belong to the user.
  const catIds = [...new Set(approved.map((s) => s.suggestedCategoryId!))]
  const cats = await prisma.category.findMany({
    where: { userId, id: { in: catIds }, deletedAt: null },
    select: { id: true, type: true },
  })
  const catType = new Map(cats.map((c) => [c.id, c.type]))
  if (cats.length !== catIds.length) throw validation("An approved row references an invalid category")

  const created = await prisma.$transaction(async (tx) => {
    const txns = await Promise.all(
      approved.map((s) =>
        tx.transaction.create({
          data: {
            userId,
            date: s.rawDate ?? new Date(),
            description: s.rawDescription,
            categoryId: s.suggestedCategoryId!,
            amount: s.rawAmount,
            paymentModeId: s.suggestedPaymentModeId ?? null,
            type: s.suggestedType ?? catType.get(s.suggestedCategoryId!)!,
            source: "STATEMENT_IMPORT",
            importBatchId: importId,
          },
        })
      )
    )

    const remaining = await tx.stagedTransaction.count({
      where: { importBatchId: importId, reviewStatus: { notIn: ["APPROVED", "REJECTED"] } },
    })

    await tx.statementImport.update({
      where: { id: importId },
      data: {
        status: remaining > 0 ? "PARTIALLY_APPROVED" : "COMPLETED",
        completedAt: new Date(),
      },
    })

    return txns
  })

  return { committed: created.length }
}

/** Undoes an import batch by soft-deleting all transactions committed from it. */
export async function undoImport(userId: string, importId: string) {
  await getImportWithStaged(userId, importId) // ownership check
  const result = await prisma.transaction.updateMany({
    where: { userId, importBatchId: importId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
  await prisma.statementImport.update({
    where: { id: importId },
    data: { status: "NEEDS_REVIEW", completedAt: null },
  })
  return { reverted: result.count }
}
