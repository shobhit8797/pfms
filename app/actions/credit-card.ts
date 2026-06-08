"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { CreditCard } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ============================================================================
// Schemas
// ============================================================================

const creditCardSchema = z.object({
  cardName: z.string().min(1, "Card name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  lastFourDigits: z.string().regex(/^\d{4}$/, "Enter the last 4 digits"),
  creditLimit: z.coerce.number().positive("Credit limit must be positive"),
  currentOutstanding: z.coerce.number().min(0, "Outstanding cannot be negative"),
  billingDate: z.coerce.number().int().min(1).max(31),
  dueDate: z.coerce.number().int().min(1).max(31),
  interestRate: z.coerce.number().min(0).max(100).optional(),
  rewardPoints: z.coerce.number().int().min(0).optional(),
})

const updateCreditCardSchema = creditCardSchema.partial()

// ============================================================================
// Types
// ============================================================================

export type CreditCardState = {
  error?: string
  success?: string
}

export type CreditCardFilter = "ALL" | "ACTIVE" | "INACTIVE"

// ============================================================================
// Reads
// ============================================================================

export async function getCreditCards(
  filter: CreditCardFilter = "ACTIVE"
): Promise<CreditCard[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  return await prisma.creditCard.findMany({
    where: {
      userId: session.user.id,
      ...(filter === "ACTIVE" ? { isActive: true } : {}),
      ...(filter === "INACTIVE" ? { isActive: false } : {}),
    },
    orderBy: { createdAt: "desc" },
  })
}

// ============================================================================
// Mutations
// ============================================================================

export async function createCreditCard(
  prevState: CreditCardState | undefined,
  formData: FormData
): Promise<CreditCardState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }
  const userId = session.user.id

  const rawData = {
    cardName: formData.get("cardName"),
    bankName: formData.get("bankName"),
    lastFourDigits: formData.get("lastFourDigits"),
    creditLimit: formData.get("creditLimit"),
    currentOutstanding: formData.get("currentOutstanding") || 0,
    billingDate: formData.get("billingDate"),
    dueDate: formData.get("dueDate"),
    interestRate: formData.get("interestRate") || undefined,
    rewardPoints: formData.get("rewardPoints") || undefined,
  }

  const validated = creditCardSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || "Invalid input data" }
  }

  const data = validated.data

  if (data.currentOutstanding > data.creditLimit) {
    return { error: "Outstanding cannot exceed the credit limit" }
  }

  try {
    await prisma.creditCard.create({
      data: {
        userId,
        cardName: data.cardName,
        bankName: data.bankName,
        lastFourDigits: data.lastFourDigits,
        creditLimit: data.creditLimit,
        currentOutstanding: data.currentOutstanding,
        availableCredit: data.creditLimit - data.currentOutstanding,
        billingDate: data.billingDate,
        dueDate: data.dueDate,
        interestRate: data.interestRate,
        rewardPoints: data.rewardPoints ?? 0,
      },
    })

    revalidatePath("/dashboard/credit-cards")
    return { success: "Credit card added successfully" }
  } catch (error) {
    console.error("Create credit card error:", error)
    return { error: "Failed to add credit card" }
  }
}

export async function updateCreditCard(
  cardId: string,
  formData: FormData
): Promise<CreditCardState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }
  const userId = session.user.id

  const existing = await prisma.creditCard.findUnique({
    where: { id: cardId, userId },
  })
  if (!existing) {
    return { error: "Credit card not found" }
  }

  const rawData: Record<string, unknown> = {}
  const fields = [
    "cardName",
    "bankName",
    "lastFourDigits",
    "creditLimit",
    "currentOutstanding",
    "billingDate",
    "dueDate",
    "interestRate",
    "rewardPoints",
  ]
  fields.forEach((field) => {
    const value = formData.get(field)
    if (value !== null && value !== "") {
      rawData[field] = value
    }
  })

  const validated = updateCreditCardSchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || "Invalid input data" }
  }

  const data = validated.data

  // Recompute availableCredit from the resulting limit/outstanding
  const newLimit = data.creditLimit ?? Number(existing.creditLimit)
  const newOutstanding =
    data.currentOutstanding ?? Number(existing.currentOutstanding)

  if (newOutstanding > newLimit) {
    return { error: "Outstanding cannot exceed the credit limit" }
  }

  try {
    await prisma.creditCard.update({
      where: { id: cardId, userId },
      data: {
        ...data,
        availableCredit: newLimit - newOutstanding,
      },
    })

    revalidatePath("/dashboard/credit-cards")
    return { success: "Credit card updated successfully" }
  } catch (error) {
    console.error("Update credit card error:", error)
    return { error: "Failed to update credit card" }
  }
}

export async function toggleCreditCardStatus(
  cardId: string,
  isActive: boolean
): Promise<CreditCardState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  try {
    await prisma.creditCard.update({
      where: { id: cardId, userId: session.user.id },
      data: { isActive },
    })
    revalidatePath("/dashboard/credit-cards")
    return { success: isActive ? "Card activated" : "Card deactivated" }
  } catch (error) {
    console.error("Toggle credit card status error:", error)
    return { error: "Failed to update card" }
  }
}

export async function deleteCreditCard(cardId: string): Promise<CreditCardState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }
  const userId = session.user.id

  const existing = await prisma.creditCard.findUnique({
    where: { id: cardId, userId },
  })
  if (!existing) {
    return { error: "Credit card not found" }
  }

  try {
    // If the card is referenced by expenses/subscriptions, archive instead of delete
    const [expenseCount, subscriptionCount] = await Promise.all([
      prisma.expense.count({ where: { userId, creditCardId: cardId } }),
      prisma.subscription.count({ where: { userId, creditCardId: cardId } }),
    ])

    if (expenseCount > 0 || subscriptionCount > 0) {
      await prisma.creditCard.update({
        where: { id: cardId, userId },
        data: { isActive: false },
      })
      revalidatePath("/dashboard/credit-cards")
      return { success: "Card has linked transactions and was archived" }
    }

    await prisma.creditCard.delete({ where: { id: cardId, userId } })
    revalidatePath("/dashboard/credit-cards")
    return { success: "Credit card deleted" }
  } catch (error) {
    console.error("Delete credit card error:", error)
    return { error: "Failed to delete credit card" }
  }
}
