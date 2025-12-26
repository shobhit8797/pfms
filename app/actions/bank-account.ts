"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { AccountType, BankAccount } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const bankAccountSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountType: z.nativeEnum(AccountType),
  accountNumber: z.string().min(4, "Account number must be at least 4 digits"),
  ifscCode: z.string().min(1, "IFSC code is required"),
  currentBalance: z.coerce.number().min(0, "Balance cannot be negative"),
  isPrimary: z.boolean().optional(),
})

export type BankAccountState = {
  error?: string
  success?: string
}

export async function createBankAccount(prevState: BankAccountState | undefined, formData: FormData): Promise<BankAccountState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }
  const userId = session.user.id

  const rawData = {
    accountName: formData.get("accountName"),
    bankName: formData.get("bankName"),
    accountType: formData.get("accountType"),
    accountNumber: formData.get("accountNumber"),
    ifscCode: formData.get("ifscCode"),
    currentBalance: formData.get("currentBalance"),
    isPrimary: formData.get("isPrimary") === "on",
  }

  const validated = bankAccountSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: "Invalid input data" }
  }

  const data = validated.data

  try {
    // If setting as primary, unset other primary accounts
    if (data.isPrimary) {
      await prisma.bankAccount.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    await prisma.bankAccount.create({
      data: {
        userId,
        ...data,
        // Encryption should happen here for accountNumber in a real app
      },
    })

    revalidatePath("/dashboard/accounts")
    return { success: "Bank account added successfully" }
  } catch (error) {
    console.error("Create bank account error:", error)
    return { error: "Failed to create bank account" }
  }
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  return await prisma.bankAccount.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function toggleAccountStatus(accountId: string, isActive: boolean) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    await prisma.bankAccount.update({
      where: { id: accountId, userId: session.user.id },
      data: { isActive },
    })
    revalidatePath("/dashboard/accounts")
    return { success: "Account status updated" }
  } catch (error) {
    return { error: "Failed to update account status" }
  }
}
