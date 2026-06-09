"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Income, IncomeType, Frequency } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const incomeSchema = z.object({
  source: z.string().min(1, "Source is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  incomeDate: z.date(),
  type: z.nativeEnum(IncomeType),
  isRecurring: z.boolean().optional(),
  frequency: z.nativeEnum(Frequency).optional(),
  isTaxable: z.boolean().optional(),
  bankAccountId: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  notes: z.string().optional(),
})

export type IncomeState = {
  error?: string
  success?: string
}

export async function createIncome(prevState: IncomeState | undefined, formData: FormData): Promise<IncomeState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const rawData = {
    source: formData.get("source"),
    amount: formData.get("amount"),
    incomeDate: new Date(formData.get("incomeDate") as string),
    type: formData.get("type"),
    isRecurring: formData.get("isRecurring") === "on",
    frequency: formData.get("frequency") || undefined, // Handle empty string
    isTaxable: formData.get("isTaxable") === "on",
    bankAccountId: formData.get("bankAccountId") || undefined,
    category: formData.get("category"),
    notes: formData.get("notes"),
  }

  const validated = incomeSchema.safeParse(rawData)

  if (!validated.success) {
    console.log(validated.error.flatten())
    return { error: "Invalid input data" }
  }

  const data = validated.data

  // If recurring, frequency is required
  if (data.isRecurring && !data.frequency) {
    return { error: "Frequency is required for recurring income" }
  }

  const userId = session.user.id

  // Verify the linked bank account belongs to this user (prevents cross-tenant balance writes)
  if (data.bankAccountId) {
    const owned = await prisma.bankAccount.findUnique({
      where: { id: data.bankAccountId, userId },
      select: { id: true },
    })
    if (!owned) return { error: "Bank account not found" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.income.create({
        data: {
          userId,
          source: data.source,
          amount: data.amount,
          incomeDate: data.incomeDate,
          type: data.type,
          isRecurring: data.isRecurring || false,
          frequency: data.isRecurring ? data.frequency : null,
          isTaxable: data.isTaxable || false,
          bankAccountId: data.bankAccountId,
          category: data.category,
          notes: data.notes,
        },
      })

      // Update bank balance if linked (scoped by userId)
      if (data.bankAccountId) {
        await tx.bankAccount.updateMany({
          where: { id: data.bankAccountId, userId },
          data: { currentBalance: { increment: data.amount } },
        })
      }
    })

    revalidatePath("/dashboard/income")
    revalidatePath("/dashboard") // For net worth update
    return { success: "Income added successfully" }
  } catch (error) {
    console.error("Create income error:", error)
    return { error: "Failed to create income" }
  }
}

export async function getIncomes() {
  const session = await auth()
  if (!session?.user?.id) return []

  return await prisma.income.findMany({
    where: { userId: session.user.id },
    include: {
      bankAccount: {
        select: {
          accountName: true,
          bankName: true
        }
      }
    },
    orderBy: { incomeDate: "desc" },
  })
}

export async function deleteIncome(incomeId: string): Promise<IncomeState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  const userId = session.user.id

  try {
    await prisma.$transaction(async (tx) => {
      const income = await tx.income.findUnique({ where: { id: incomeId, userId } })
      if (!income) throw new Error("Income not found")

      // Revert the bank balance increment applied at creation
      if (income.bankAccountId) {
        await tx.bankAccount.updateMany({
          where: { id: income.bankAccountId, userId },
          data: { currentBalance: { decrement: income.amount } },
        })
      }

      await tx.income.delete({ where: { id: incomeId } })
    })

    revalidatePath("/dashboard/income")
    revalidatePath("/dashboard/accounts")
    revalidatePath("/dashboard")
    return { success: "Income deleted" }
  } catch (error) {
    console.error("Delete income error:", error)
    return { error: "Failed to delete income" }
  }
}

export async function updateIncome(
  incomeId: string,
  formData: FormData
): Promise<IncomeState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  const userId = session.user.id

  const rawData = {
    source: formData.get("source"),
    amount: formData.get("amount"),
    incomeDate: new Date(formData.get("incomeDate") as string),
    type: formData.get("type"),
    isRecurring: formData.get("isRecurring") === "on",
    frequency: formData.get("frequency") || undefined,
    isTaxable: formData.get("isTaxable") === "on",
    bankAccountId: formData.get("bankAccountId") || undefined,
    category: formData.get("category"),
    notes: formData.get("notes") || undefined,
  }

  const validated = incomeSchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || "Invalid input data" }
  }
  const data = validated.data

  if (data.isRecurring && !data.frequency) {
    return { error: "Frequency is required for recurring income" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.income.findUnique({ where: { id: incomeId, userId } })
      if (!existing) throw new Error("Income not found")

      // Verify new linked account ownership (if any)
      if (data.bankAccountId) {
        const owned = await tx.bankAccount.findUnique({
          where: { id: data.bankAccountId, userId },
          select: { id: true },
        })
        if (!owned) throw new Error("Bank account not found")
      }

      // Revert old balance effect, then apply new (handles amount and account changes)
      if (existing.bankAccountId) {
        await tx.bankAccount.updateMany({
          where: { id: existing.bankAccountId, userId },
          data: { currentBalance: { decrement: existing.amount } },
        })
      }
      if (data.bankAccountId) {
        await tx.bankAccount.updateMany({
          where: { id: data.bankAccountId, userId },
          data: { currentBalance: { increment: data.amount } },
        })
      }

      await tx.income.update({
        where: { id: incomeId },
        data: {
          source: data.source,
          amount: data.amount,
          incomeDate: data.incomeDate,
          type: data.type,
          isRecurring: data.isRecurring || false,
          frequency: data.isRecurring ? data.frequency : null,
          isTaxable: data.isTaxable || false,
          bankAccountId: data.bankAccountId ?? null,
          category: data.category,
          notes: data.notes,
        },
      })
    })

    revalidatePath("/dashboard/income")
    revalidatePath("/dashboard/accounts")
    revalidatePath("/dashboard")
    return { success: "Income updated successfully" }
  } catch (error) {
    console.error("Update income error:", error)
    const msg = error instanceof Error ? error.message : "Failed to update income"
    return { error: msg === "Income not found" || msg === "Bank account not found" ? msg : "Failed to update income" }
  }
}


