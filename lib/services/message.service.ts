import { createHash } from "crypto"
import { prisma } from "@/lib/db"
import { notFound, validation } from "@/lib/errors"
import { extractTransactionMessage } from "@/lib/llm/message"
import { createExpense } from "@/lib/services/expense.service"
import { createIncome } from "@/lib/services/income.service"
import {
  learnFromSave,
  merchantKeyOf,
  recordReceiptDecline,
  recordSighting,
} from "@/lib/services/merchant-preference.service"
import type { MessageIngestInput, MessageResolveInput } from "@pfms/shared"
import type { Prisma } from "@prisma/client"

/**
 * Message-capture business logic. A raw bank/UPI message (from an iOS Shortcut,
 * an Android SMS reader, a share sheet, or manual paste) is deduped, parsed by
 * the LLM, enriched with the user's learned merchant preferences, and queued for
 * review. On review the user saves it as an expense/income (which feeds the
 * learning loop) or clears it. Every query is userId-scoped.
 */

// Only these fields are returned to clients (never userId / dedupeHash / raw metadata).
const messageSelect = {
  id: true,
  source: true,
  rawText: true,
  sender: true,
  receivedAt: true,
  status: true,
  parsedAmount: true,
  parsedMerchant: true,
  parsedDate: true,
  parsedPaymentMethod: true,
  parsedDirection: true,
  parsedAccountHint: true,
  confidence: true,
  suggestedCategory: true,
  askReceipt: true,
  expenseId: true,
  incomeId: true,
  createdAt: true,
} satisfies Prisma.InboundMessageSelect

/** Stable dedupe key: same text on the same day from the same user = one row. */
function dedupeHashOf(userId: string, text: string, receivedAt: Date): string {
  const day = receivedAt.toISOString().slice(0, 10)
  const norm = text.replace(/\s+/g, " ").trim().toLowerCase()
  return createHash("sha256").update(`${userId}|${day}|${norm}`).digest("hex")
}

// How far apart two captures of the "same" transaction may sit (SMS often beats
// the email by hours; some banks email the next day).
const DEDUPE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000

/**
 * Fingerprint of the *transaction itself* (independent of the raw text): same
 * user + direction + amount + merchant. An SMS and an email for one payment
 * produce the same fingerprint even though their wording differs.
 */
function txnFingerprintOf(userId: string, direction: string | null, amount: number, merchantKey: string): string {
  return createHash("sha256").update(`${userId}|${direction ?? "NA"}|${amount.toFixed(2)}|${merchantKey}`).digest("hex")
}

/**
 * Finds an already-captured message for the same transaction (same fingerprint,
 * within the dedupe window), so a second source doesn't create a duplicate. Only
 * "live" rows count as canonical — PENDING_REVIEW, DONE, or a user-DISMISSED one
 * (re-capturing a dismissed txn shouldn't resurface it).
 */
async function findCanonicalTxn(userId: string, fingerprint: string, anchor: Date) {
  const candidates = await prisma.inboundMessage.findMany({
    where: { userId, txnFingerprint: fingerprint, status: { in: ["PENDING_REVIEW", "DONE", "DISMISSED"] } },
    orderBy: { receivedAt: "desc" },
    take: 10,
  })
  return candidates.find((c) => {
    if (!c.parsedDate) return true // undated existing row — assume same txn
    return Math.abs(c.parsedDate.getTime() - anchor.getTime()) <= DEDUPE_WINDOW_MS
  })
}

export async function ingestMessage(userId: string, input: MessageIngestInput) {
  const receivedAt = input.receivedAt ?? new Date()
  const source = input.source ?? "MANUAL"
  const dedupeHash = dedupeHashOf(userId, input.text, receivedAt)

  // Idempotent: a re-fired shortcut / re-paste returns the existing row.
  const existing = await prisma.inboundMessage.findUnique({ where: { dedupeHash }, select: messageSelect })
  if (existing) return { message: existing, duplicate: true }

  // Parse the message. A parse failure still records the row (status FAILED) so
  // nothing is silently dropped, but it stays out of the review queue.
  let parse: Awaited<ReturnType<typeof extractTransactionMessage>> | null = null
  let parseError: string | null = null
  try {
    parse = await extractTransactionMessage(input.text)
  } catch (err) {
    parseError = err instanceof Error ? err.message : "parse failed"
  }

  if (!parse) {
    const row = await safeCreate(dedupeHash, {
      userId,
      source,
      rawText: input.text,
      sender: input.sender ?? null,
      receivedAt,
      dedupeHash,
      status: "FAILED",
      parseError,
      metadata: { sender: input.sender ?? null },
    })
    return { message: row, duplicate: false }
  }

  const f = parse.fields
  const isTxn = f.isTransaction && f.amount != null
  const txnDate = f.date ? new Date(f.date) : receivedAt

  // Look up / seed the learned merchant preference + build the txn fingerprint.
  let suggestedCategory = f.category
  let askReceipt = true
  let paymentMethod = f.paymentMethod
  let fingerprint: string | null = null
  if (isTxn && f.merchant) {
    const key = merchantKeyOf(f.merchant)
    if (key) {
      const pref = await recordSighting(userId, key, f.merchant)
      suggestedCategory = pref.category ?? f.category
      askReceipt = pref.askReceipt
      paymentMethod = f.paymentMethod ?? pref.paymentMethod
      fingerprint = txnFingerprintOf(userId, f.direction, f.amount!, key)
    }
  }

  // Cross-source dedupe: if this same transaction already arrived (e.g. by SMS
  // and now by email), record this capture as a DUPLICATE pointing at the
  // canonical row, and surface the canonical — so only ONE expense is ever made.
  if (isTxn && fingerprint) {
    const canonical = await findCanonicalTxn(userId, fingerprint, txnDate)
    if (canonical) {
      await safeCreate(dedupeHash, {
        userId,
        source,
        rawText: input.text,
        sender: input.sender ?? null,
        receivedAt,
        dedupeHash,
        status: "DUPLICATE",
        duplicateOfId: canonical.id,
        expenseId: canonical.expenseId, //   same expense (if the canonical was already saved)
        incomeId: canonical.incomeId,
        txnFingerprint: fingerprint,
        parsedAmount: f.amount ?? undefined,
        parsedMerchant: f.merchant,
        parsedDate: txnDate,
        parsedPaymentMethod: paymentMethod ?? undefined,
        parsedDirection: f.direction ?? undefined,
        parsedAccountHint: f.accountHint,
        confidence: f.confidence ?? undefined,
        metadata: {
          sender: input.sender ?? null,
          model: parse.model,
          duplicateOf: canonical.id,
          duplicateOfSource: canonical.source,
        },
      })
      const message = await prisma.inboundMessage.findUnique({ where: { id: canonical.id }, select: messageSelect })
      return { message: message!, duplicate: true }
    }
  }

  const row = await safeCreate(dedupeHash, {
    userId,
    source,
    rawText: input.text,
    sender: input.sender ?? null,
    receivedAt,
    dedupeHash,
    status: isTxn ? "PENDING_REVIEW" : "IGNORED",
    txnFingerprint: fingerprint,
    parsedAmount: f.amount ?? undefined,
    parsedMerchant: f.merchant,
    parsedDate: f.date ? new Date(f.date) : undefined,
    parsedPaymentMethod: paymentMethod ?? undefined,
    parsedDirection: f.direction ?? undefined,
    parsedAccountHint: f.accountHint,
    confidence: f.confidence ?? undefined,
    suggestedCategory,
    askReceipt,
    metadata: {
      sender: input.sender ?? null,
      model: parse.model,
      usage: parse.usage,
      isTransaction: f.isTransaction,
    },
  })
  return { message: row, duplicate: false }
}

/**
 * Creates the row, tolerating a concurrent insert that wins the unique race on
 * `dedupeHash` (returns the existing row instead of throwing).
 */
async function safeCreate(dedupeHash: string, data: Prisma.InboundMessageUncheckedCreateInput) {
  try {
    return await prisma.inboundMessage.create({ data, select: messageSelect })
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      const existing = await prisma.inboundMessage.findUnique({ where: { dedupeHash }, select: messageSelect })
      if (existing) return existing
    }
    throw err
  }
}

export async function listMessages(
  userId: string,
  status: Prisma.InboundMessageWhereInput["status"] = "PENDING_REVIEW",
  limit = 50
) {
  const where: Prisma.InboundMessageWhereInput = { userId, status }
  const [items, total] = await Promise.all([
    prisma.inboundMessage.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: limit,
      select: messageSelect,
    }),
    prisma.inboundMessage.count({ where }),
  ])
  return { items, total, limit, offset: 0 }
}

async function getMessageOrThrow(userId: string, id: string) {
  const msg = await prisma.inboundMessage.findFirst({ where: { id, userId } })
  if (!msg) throw notFound("Message not found")
  return msg
}

/**
 * Resolve a queued message: save it as an expense/income (recording the learned
 * category + receipt preference), or dismiss/ignore it. Marked DONE/DISMISSED/
 * IGNORED so it never reappears in the queue.
 */
export async function resolveMessage(userId: string, id: string, input: MessageResolveInput) {
  const msg = await getMessageOrThrow(userId, id)
  const merchant = msg.parsedMerchant
  const key = merchant ? merchantKeyOf(merchant) : ""

  if (input.action === "dismiss" || input.action === "ignore") {
    // A dismissal can also carry "don't ask me for a receipt here again".
    if (input.receiptDeclined && merchant && key) {
      await recordReceiptDecline(userId, key, merchant)
    }
    const message = await prisma.inboundMessage.update({
      where: { id },
      data: { status: input.action === "ignore" ? "IGNORED" : "DISMISSED", askReceipt: input.receiptDeclined ? false : msg.askReceipt },
      select: messageSelect,
    })
    return { message }
  }

  // action === "save"
  const kind = input.kind ?? "expense"

  if (kind === "income") {
    if (!input.income) throw validation("income payload is required to save")
    const income = await createIncome(userId, input.income)
    const message = await prisma.inboundMessage.update({
      where: { id },
      data: { status: "DONE", incomeId: income.id },
      select: messageSelect,
    })
    return { message, income }
  }

  if (!input.expense) throw validation("expense payload is required to save")
  const expense = await createExpense(userId, input.expense)

  // Learn the category + receipt preference for this merchant.
  if (merchant && key) {
    await learnFromSave(userId, key, merchant, {
      category: input.expense.category,
      paymentMethod: input.expense.paymentMethod,
      receiptDeclined: input.receiptDeclined,
      receiptAttached: Boolean(input.expense.receiptUrl),
    })
  }

  const message = await prisma.inboundMessage.update({
    where: { id },
    data: { status: "DONE", expenseId: expense.id },
    select: messageSelect,
  })
  return { message, expense }
}
