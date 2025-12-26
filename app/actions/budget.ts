"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Budget, BudgetPeriod } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const budgetSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  period: z.nativeEnum(BudgetPeriod),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  alertThreshold: z.coerce.number().min(1).max(100).optional(),
  carryForward: z.boolean().optional(),
})

export type BudgetState = {
  error?: string
  success?: string
}

export async function createBudget(prevState: BudgetState | undefined, formData: FormData): Promise<BudgetState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const rawData = {
    category: formData.get("category"),
    amount: formData.get("amount"),
    period: formData.get("period"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    alertThreshold: formData.get("alertThreshold"),
    carryForward: formData.get("carryForward") === "on",
  }

  const validated = budgetSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: "Invalid input data" }
  }

  const data = validated.data

  try {
    await prisma.budget.create({
      data: {
        userId: session.user.id,
        ...data,
      },
    })

    revalidatePath("/dashboard/budgets")
    return { success: "Budget created successfully" }
  } catch (error) {
    console.error("Create budget error:", error)
    return { error: "Failed to create budget" }
  }
}

export async function getBudgets(): Promise<(Budget & { spent: number })[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const budgets = await prisma.budget.findMany({
    where: { userId: session.user.id },
    orderBy: { startDate: "desc" },
  })

  // Calculate spent amount for each budget
  // Note: In a real app with many transactions, this aggregation should be optimized (e.g., using raw SQL or separate tracking table)
  const budgetsWithSpent = await Promise.all(budgets.map(async (budget) => {
      const expenses = await prisma.expense.aggregate({
          where: {
              userId: session.user.id,
              category: budget.category,
              expenseDate: {
                  gte: budget.startDate,
                  lte: budget.endDate
              }
          },
          _sum: {
              amount: true
          }
      })
      
      return {
          ...budget,
          spent: Number(expenses._sum.amount) || 0
      }
  }))

  return budgetsWithSpent
}

export async function deleteBudget(id: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        await prisma.budget.delete({
            where: { id, userId: session.user.id }
        })
        revalidatePath("/dashboard/budgets")
        return { success: "Budget deleted" }
    } catch (error) {
        return { error: "Failed to delete budget" }
    }
}
