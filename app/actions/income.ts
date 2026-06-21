"use server"

import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { ServiceError } from "@/lib/errors"
import { incomeCreateSchema } from "@pfms/shared"
import {
  listIncome,
  createIncome as createIncomeService,
  updateIncome as updateIncomeService,
  deleteIncome as deleteIncomeService,
} from "@/lib/services/income.service"

export type IncomeState = {
  error?: string
  success?: string
}

/** Normalizes the income FormData into a plain object for the shared Zod schema. */
function parseIncomeForm(formData: FormData) {
  return {
    source: formData.get("source"),
    amount: formData.get("amount"),
    incomeDate: formData.get("incomeDate"),
    type: formData.get("type"),
    isRecurring: formData.get("isRecurring") === "on",
    frequency: formData.get("frequency") || undefined,
    isTaxable: formData.get("isTaxable") === "on",
    bankAccountId: formData.get("bankAccountId") || undefined,
    category: formData.get("category"),
    notes: formData.get("notes") || undefined,
    receiptUrl: formData.get("receiptUrl") || undefined,
    receiptName: formData.get("receiptName") || undefined,
  }
}

function toErrorState(error: unknown, fallback: string): IncomeState {
  if (error instanceof ServiceError) return { error: error.message }
  console.error(fallback, error)
  return { error: fallback }
}

export async function createIncome(prevState: IncomeState | undefined, formData: FormData): Promise<IncomeState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = incomeCreateSchema.safeParse(parseIncomeForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input data" }

  try {
    await createIncomeService(session.user.id, parsed.data)
    revalidatePath("/dashboard/income")
    revalidatePath("/dashboard")
    return { success: "Income added successfully" }
  } catch (error) {
    return toErrorState(error, "Failed to create income")
  }
}

export async function getIncomes() {
  const session = await auth()
  if (!session?.user?.id) return []
  const { items } = await listIncome(session.user.id, 200, 0)
  return items
}

export async function deleteIncome(incomeId: string): Promise<IncomeState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  try {
    await deleteIncomeService(session.user.id, incomeId)
    revalidatePath("/dashboard/income")
    revalidatePath("/dashboard/accounts")
    revalidatePath("/dashboard")
    return { success: "Income deleted" }
  } catch (error) {
    return toErrorState(error, "Failed to delete income")
  }
}

export async function updateIncome(incomeId: string, formData: FormData): Promise<IncomeState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = incomeCreateSchema.safeParse(parseIncomeForm(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input data" }

  try {
    await updateIncomeService(session.user.id, incomeId, parsed.data)
    revalidatePath("/dashboard/income")
    revalidatePath("/dashboard/accounts")
    revalidatePath("/dashboard")
    return { success: "Income updated successfully" }
  } catch (error) {
    return toErrorState(error, "Failed to update income")
  }
}
