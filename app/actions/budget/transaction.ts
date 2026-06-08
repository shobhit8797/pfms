"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { transactionSchema, transactionUpdateSchema } from "@/lib/validation/budget"
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  softDeleteTransaction,
  type TransactionFilters,
} from "@/lib/services/transaction.service"
import { requireUserId, toErrorState, type ActionState } from "./_helpers"

export async function getTransactions(
  filters: TransactionFilters = {},
  limit = 50,
  offset = 0
) {
  const session = await auth()
  if (!session?.user?.id) return { items: [], total: 0, limit, offset }
  return listTransactions(session.user.id, filters, limit, offset)
}

function parseTxnForm(formData: FormData) {
  return {
    date: formData.get("date"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    paymentModeId: (formData.get("paymentModeId") as string) || undefined,
    type: (formData.get("type") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  }
}

export async function saveTransaction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state

  const id = (formData.get("id") as string) || undefined
  const raw = parseTxnForm(formData)

  try {
    if (id) {
      const parsed = transactionUpdateSchema.safeParse(raw)
      if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
      await updateTransaction(ctx.userId, id, parsed.data)
    } else {
      const parsed = transactionSchema.safeParse(raw)
      if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
      await createTransaction(ctx.userId, parsed.data)
    }
    revalidatePath("/dashboard/budget")
    revalidatePath("/dashboard/budget/transactions")
    return { success: id ? "Transaction updated" : "Transaction added" }
  } catch (error) {
    return toErrorState(error)
  }
}

export async function removeTransaction(id: string): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state
  try {
    await softDeleteTransaction(ctx.userId, id)
    revalidatePath("/dashboard/budget")
    revalidatePath("/dashboard/budget/transactions")
    return { success: "Transaction deleted" }
  } catch (error) {
    return toErrorState(error)
  }
}
