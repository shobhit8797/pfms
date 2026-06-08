"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { bulkReviewSchema } from "@/lib/validation/budget"
import {
  createImport,
  runExtractionForImport,
  listImports,
  getImportWithStaged,
  applyReview,
  commitImport,
  undoImport,
} from "@/lib/services/import.service"
import { requireUserId, toErrorState, type ActionState } from "./_helpers"
import type { ImportFileType } from "@prisma/client"

export async function getImports() {
  const session = await auth()
  if (!session?.user?.id) return []
  return listImports(session.user.id)
}

export async function getImportDetail(id: string) {
  const session = await auth()
  if (!session?.user?.id) return null
  try {
    return await getImportWithStaged(session.user.id, id)
  } catch {
    return null
  }
}

/** Creates the import row and kicks off extraction in the background via after(). */
export async function startImport(
  fileUrl: string,
  fileName: string,
  fileType: ImportFileType
): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state
  if (!fileUrl) return { error: "Missing file" }

  try {
    const imp = await createImport(ctx.userId, { fileUrl, fileName, fileType })
    // Run extraction after the response is sent (no queue infra in v1).
    after(async () => {
      await runExtractionForImport(ctx.userId, imp.id)
    })
    revalidatePath("/dashboard/budget/imports")
    return { success: "Import started", data: { id: imp.id } }
  } catch (error) {
    return toErrorState(error)
  }
}

export async function saveReview(
  importId: string,
  rows: unknown
): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state

  const parsed = bulkReviewSchema.safeParse({ rows })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  try {
    await applyReview(ctx.userId, importId, parsed.data.rows)
    revalidatePath(`/dashboard/budget/imports/${importId}/review`)
    return { success: "Review saved" }
  } catch (error) {
    return toErrorState(error)
  }
}

export async function commitImportAction(importId: string): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state
  try {
    const result = await commitImport(ctx.userId, importId)
    revalidatePath("/dashboard/budget")
    revalidatePath("/dashboard/budget/transactions")
    revalidatePath("/dashboard/budget/imports")
    return { success: `Committed ${result.committed} transaction(s)` }
  } catch (error) {
    return toErrorState(error)
  }
}

export async function undoImportAction(importId: string): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state
  try {
    const result = await undoImport(ctx.userId, importId)
    revalidatePath("/dashboard/budget")
    revalidatePath("/dashboard/budget/transactions")
    revalidatePath("/dashboard/budget/imports")
    return { success: `Reverted ${result.reverted} transaction(s)` }
  } catch (error) {
    return toErrorState(error)
  }
}
