"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import {
  createReceipt,
  deleteReceipt,
  listReceiptsForTransaction,
} from "@/lib/services/receipt.service"
import { requireUserId, toErrorState, type ActionState } from "./_helpers"

export async function getReceiptsForTransaction(transactionId: string) {
  const session = await auth()
  if (!session?.user?.id) return []
  return listReceiptsForTransaction(session.user.id, transactionId)
}

/** Called by the client uploader after a blob upload succeeds. */
export async function linkReceipt(
  fileUrl: string,
  opts: { thumbnailUrl?: string | null; transactionId?: string | null } = {}
): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state
  if (!fileUrl) return { error: "Missing file" }
  try {
    const receipt = await createReceipt(ctx.userId, {
      fileUrl,
      thumbnailUrl: opts.thumbnailUrl ?? null,
      transactionId: opts.transactionId ?? null,
    })
    revalidatePath("/dashboard/budget/transactions")
    return { success: "Receipt attached", data: { id: receipt.id, fileUrl: receipt.fileUrl } }
  } catch (error) {
    return toErrorState(error)
  }
}

export async function removeReceipt(id: string): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state
  try {
    await deleteReceipt(ctx.userId, id)
    revalidatePath("/dashboard/budget/transactions")
    return { success: "Receipt removed" }
  } catch (error) {
    return toErrorState(error)
  }
}
