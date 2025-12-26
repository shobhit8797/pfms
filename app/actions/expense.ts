"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Expense, Frequency, PaymentMethod } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const expenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  expenseDate: z.string().transform((str) => new Date(str)),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.nativeEnum(PaymentMethod),
  bankAccountId: z.string().optional(),
  creditCardId: z.string().optional(),
  isRecurring: z.boolean().optional(),
  frequency: z.nativeEnum(Frequency).optional(),
  isBusinessExpense: z.boolean().optional(),
  isTaxDeductible: z.boolean().optional(),
  taxSection: z.string().optional(),
  notes: z.string().optional(),
})

export type ExpenseState = {
  error?: string
  success?: string
}

export async function createExpense(prevState: ExpenseState | undefined, formData: FormData): Promise<ExpenseState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const userId = session.user.id

  const rawData = {
    amount: formData.get("amount"),
    expenseDate: formData.get("expenseDate"),
    category: formData.get("category"),
    subcategory: formData.get("subcategory"),
    description: formData.get("description"),
    paymentMethod: formData.get("paymentMethod"),
    bankAccountId: formData.get("bankAccountId") || undefined,
    creditCardId: formData.get("creditCardId") || undefined,
    isRecurring: formData.get("isRecurring") === "on",
    frequency: formData.get("frequency") || undefined,
    isBusinessExpense: formData.get("isBusinessExpense") === "on",
    isTaxDeductible: formData.get("isTaxDeductible") === "on",
    taxSection: formData.get("taxSection"),
    notes: formData.get("notes"),
  }

  const validated = expenseSchema.safeParse(rawData)

  if (!validated.success) {
    console.error(validated.error)
    return { error: "Invalid input data" }
  }

  const data = validated.data

  // Additional validation logic
  if (data.isRecurring && !data.frequency) {
    return { error: "Frequency is required for recurring expenses" }
  }

  if (data.paymentMethod === "BANK_TRANSFER" && !data.bankAccountId) {
    return { error: "Bank account is required for bank transfer" }
  }

  if (data.paymentMethod === "CREDIT_CARD" && !data.creditCardId) {
    return { error: "Credit card is required for credit card payment" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Create expense
      const expense = await tx.expense.create({
        data: {
          userId,
          ...data,
        },
      })

      // Update balances if applicable
      if (data.paymentMethod === "BANK_TRANSFER" && data.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: data.bankAccountId },
          data: {
            currentBalance: {
              decrement: data.amount,
            },
          },
        })
      }
      
      if (data.paymentMethod === "CREDIT_CARD" && data.creditCardId) {
         await tx.creditCard.update({
          where: { id: data.creditCardId },
          data: {
            currentOutstanding: {
              increment: data.amount,
            },
            availableCredit: {
                decrement: data.amount
            }
          },
        })
      }
    })

    revalidatePath("/dashboard/expenses")
    revalidatePath("/dashboard/accounts") 
    revalidatePath("/dashboard")
    return { success: "Expense added successfully" }
  } catch (error) {
    console.error("Create expense error:", error)
    return { error: "Failed to create expense" }
  }
}

export async function getExpenses(limit = 20, offset = 0) {
    const session = await auth()
    if (!session?.user?.id) return []
  
    const userId = session.user.id

    return await prisma.expense.findMany({
      where: { userId },
      orderBy: { expenseDate: "desc" },
      take: limit,
      skip: offset,
      include: {
          bankAccount: {
              select: { bankName: true, accountName: true }
          },
          creditCard: {
              select: { cardName: true, lastFourDigits: true }
          }
      }
    })
}

export async function deleteExpense(expenseId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    const userId = session.user.id

    try {
        await prisma.$transaction(async (tx) => {
            const expense = await tx.expense.findUnique({
                where: { id: expenseId, userId },
            })

            if (!expense) throw new Error("Expense not found")

            // Revert balances
             if (expense.paymentMethod === "BANK_TRANSFER" && expense.bankAccountId) {
                await tx.bankAccount.update({
                  where: { id: expense.bankAccountId },
                  data: {
                    currentBalance: {
                      increment: expense.amount,
                    },
                  },
                })
              }
              
              if (expense.paymentMethod === "CREDIT_CARD" && expense.creditCardId) {
                 await tx.creditCard.update({
                  where: { id: expense.creditCardId },
                  data: {
                    currentOutstanding: {
                      decrement: expense.amount,
                    },
                    availableCredit: {
                        increment: expense.amount
                    }
                  },
                })
              }

              await tx.expense.delete({
                  where: { id: expenseId }
              })
        })

        revalidatePath("/dashboard/expenses")
        revalidatePath("/dashboard/accounts")
        revalidatePath("/dashboard")
        return { success: "Expense deleted" }
    } catch (error) {
        console.error("Delete expense error:", error)
        return { error: "Failed to delete expense" }
    }
}
