"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { DebitCard } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ============================================================================
// Schemas
// ============================================================================

const debitCardSchema = z.object({
  cardName: z.string().min(1, "Card name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  lastFourDigits: z.string().regex(/^\d{4}$/, "Enter the last 4 digits"),
  cardNetwork: z.string().optional(),
  bankAccountId: z.string().optional(),
  notes: z.string().optional(),
})

const updateDebitCardSchema = debitCardSchema.partial()

// ============================================================================
// Types
// ============================================================================

export type DebitCardState = {
  error?: string
  success?: string
}

export type DebitCardFilter = "ALL" | "ACTIVE" | "INACTIVE"

// ============================================================================
// Reads
// ============================================================================

export async function getDebitCards(
  filter: DebitCardFilter = "ACTIVE"
): Promise<DebitCard[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  return await prisma.debitCard.findMany({
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

export async function createDebitCard(
  prevState: DebitCardState | undefined,
  formData: FormData
): Promise<DebitCardState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  const userId = session.user.id

  const rawData = {
    cardName: formData.get("cardName"),
    bankName: formData.get("bankName"),
    lastFourDigits: formData.get("lastFourDigits"),
    cardNetwork: formData.get("cardNetwork") || undefined,
    bankAccountId: formData.get("bankAccountId") || undefined,
    notes: formData.get("notes") || undefined,
  }

  const validated = debitCardSchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || "Invalid input data" }
  }

  const data = validated.data

  // Verify bankAccountId belongs to this user
  if (data.bankAccountId) {
    const account = await prisma.bankAccount.findFirst({
      where: { id: data.bankAccountId, userId },
      select: { id: true },
    })
    if (!account) return { error: "Bank account not found" }
  }

  try {
    await prisma.debitCard.create({
      data: {
        userId,
        cardName: data.cardName,
        bankName: data.bankName,
        lastFourDigits: data.lastFourDigits,
        cardNetwork: data.cardNetwork ?? null,
        bankAccountId: data.bankAccountId ?? null,
        notes: data.notes ?? null,
      },
    })

    revalidatePath("/dashboard/debit-cards")
    return { success: "Debit card added successfully" }
  } catch (error) {
    console.error("Create debit card error:", error)
    return { error: "Failed to add debit card" }
  }
}

export async function updateDebitCard(
  cardId: string,
  formData: FormData
): Promise<DebitCardState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  const userId = session.user.id

  const existing = await prisma.debitCard.findUnique({
    where: { id: cardId, userId },
  })
  if (!existing) return { error: "Debit card not found" }

  const rawData: Record<string, unknown> = {}
  const fields = ["cardName", "bankName", "lastFourDigits", "cardNetwork", "bankAccountId", "notes"]
  fields.forEach((field) => {
    const value = formData.get(field)
    if (value !== null && value !== "") {
      rawData[field] = value
    }
  })

  const validated = updateDebitCardSchema.safeParse(rawData)
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || "Invalid input data" }
  }

  const data = validated.data

  if (data.bankAccountId) {
    const account = await prisma.bankAccount.findFirst({
      where: { id: data.bankAccountId, userId },
      select: { id: true },
    })
    if (!account) return { error: "Bank account not found" }
  }

  try {
    await prisma.debitCard.update({
      where: { id: cardId, userId },
      data: {
        ...data,
        bankAccountId: data.bankAccountId === undefined ? existing.bankAccountId : (data.bankAccountId ?? null),
        cardNetwork: data.cardNetwork === undefined ? existing.cardNetwork : (data.cardNetwork ?? null),
        notes: data.notes === undefined ? existing.notes : (data.notes ?? null),
      },
    })

    revalidatePath("/dashboard/debit-cards")
    return { success: "Debit card updated successfully" }
  } catch (error) {
    console.error("Update debit card error:", error)
    return { error: "Failed to update debit card" }
  }
}

export async function toggleDebitCardStatus(
  cardId: string,
  isActive: boolean
): Promise<DebitCardState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    await prisma.debitCard.update({
      where: { id: cardId, userId: session.user.id },
      data: { isActive },
    })
    revalidatePath("/dashboard/debit-cards")
    return { success: isActive ? "Card activated" : "Card deactivated" }
  } catch (error) {
    console.error("Toggle debit card status error:", error)
    return { error: "Failed to update card" }
  }
}

export async function deleteDebitCard(cardId: string): Promise<DebitCardState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  const userId = session.user.id

  const existing = await prisma.debitCard.findUnique({
    where: { id: cardId, userId },
  })
  if (!existing) return { error: "Debit card not found" }

  try {
    const expenseCount = await prisma.expense.count({
      where: { userId, debitCardId: cardId },
    })

    if (expenseCount > 0) {
      await prisma.debitCard.update({
        where: { id: cardId, userId },
        data: { isActive: false },
      })
      revalidatePath("/dashboard/debit-cards")
      return { success: "Card has linked transactions and was archived" }
    }

    await prisma.debitCard.delete({ where: { id: cardId, userId } })
    revalidatePath("/dashboard/debit-cards")
    return { success: "Debit card deleted" }
  } catch (error) {
    console.error("Delete debit card error:", error)
    return { error: "Failed to delete debit card" }
  }
}
