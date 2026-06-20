"use server"

import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { ServiceError } from "@/lib/errors"
import { expenseCreateSchema } from "@pfms/shared"
import {
  listExpenses,
  createExpense as createExpenseService,
  updateExpense as updateExpenseService,
  deleteExpense as deleteExpenseService,
} from "@/lib/services/expense.service"

export type ExpenseState = {
  error?: string
  success?: string
}

/** Normalizes the expense FormData into a plain object for the shared Zod schema. */
function parseExpenseForm(formData: FormData) {
  return {
    amount: formData.get("amount"),
    expenseDate: formData.get("expenseDate"),
    category: formData.get("category"),
    subcategory: formData.get("subcategory") || undefined,
    description: formData.get("description"),
    paymentMethod: formData.get("paymentMethod"),
    bankAccountId: formData.get("bankAccountId") || undefined,
    creditCardId: formData.get("creditCardId") || undefined,
    debitCardId: formData.get("debitCardId") || undefined,
    isRecurring: formData.get("isRecurring") === "on",
    frequency: formData.get("frequency") || undefined,
    isBusinessExpense: formData.get("isBusinessExpense") === "on",
    isTaxDeductible: formData.get("isTaxDeductible") === "on",
    taxSection: formData.get("taxSection") || undefined,
    notes: formData.get("notes") || undefined,
  }
}

function toErrorState(error: unknown, fallback: string): ExpenseState {
  if (error instanceof ServiceError) return { error: error.message }
  console.error(fallback, error)
  return { error: fallback }
}

export async function createExpense(prevState: ExpenseState | undefined, formData: FormData): Promise<ExpenseState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = expenseCreateSchema.safeParse(parseExpenseForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input data" }

  try {
    await createExpenseService(session.user.id, parsed.data)
    revalidatePath("/dashboard/expenses")
    revalidatePath("/dashboard/accounts")
    revalidatePath("/dashboard")
    return { success: "Expense added successfully" }
  } catch (error) {
    return toErrorState(error, "Failed to create expense")
  }
}

export async function getExpenses(limit = 20, offset = 0) {
  const session = await auth()
  if (!session?.user?.id) return []
  const { items } = await listExpenses(session.user.id, {}, limit, offset)
  return items
}

export async function deleteExpense(expenseId: string): Promise<ExpenseState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  try {
    await deleteExpenseService(session.user.id, expenseId)
    revalidatePath("/dashboard/expenses")
    revalidatePath("/dashboard/accounts")
    revalidatePath("/dashboard")
    return { success: "Expense deleted" }
  } catch (error) {
    return toErrorState(error, "Failed to delete expense")
  }
}

export async function updateExpense(expenseId: string, formData: FormData): Promise<ExpenseState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = expenseCreateSchema.safeParse(parseExpenseForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input data" }

  try {
    await updateExpenseService(session.user.id, expenseId, parsed.data)
    revalidatePath("/dashboard/expenses")
    revalidatePath("/dashboard/accounts")
    revalidatePath("/dashboard")
    return { success: "Expense updated successfully" }
  } catch (error) {
    return toErrorState(error, "Failed to update expense")
  }
}
