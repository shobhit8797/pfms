import { prisma } from "@/lib/db"

/**
 * Read-only lookups that power the account/card pickers in the expense and
 * income forms (web + mobile). userId-scoped; only active rows. Account numbers
 * are masked here so the full value never leaves the server.
 */

export async function listAccountsForPicker(userId: string) {
  const rows = await prisma.bankAccount.findMany({
    where: { userId, isActive: true },
    orderBy: [{ isPrimary: "desc" }, { accountName: "asc" }],
    select: { id: true, accountName: true, bankName: true, accountNumber: true, currentBalance: true },
  })
  return {
    items: rows.map((r) => ({
      id: r.id,
      accountName: r.accountName,
      bankName: r.bankName,
      maskedNumber: "····" + (r.accountNumber ?? "").slice(-4),
      currentBalance: r.currentBalance,
    })),
  }
}

export async function listCardsForPicker(userId: string) {
  const rows = await prisma.creditCard.findMany({
    where: { userId, isActive: true },
    orderBy: { cardName: "asc" },
    select: {
      id: true,
      cardName: true,
      bankName: true,
      lastFourDigits: true,
      creditLimit: true,
      currentOutstanding: true,
      availableCredit: true,
      billingDate: true,
      dueDate: true,
      interestRate: true,
      rewardPoints: true,
      isActive: true,
      createdAt: true,
    },
  })
  return { items: rows }
}
