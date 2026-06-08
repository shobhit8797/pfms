import { prisma } from "@/lib/db"

/**
 * Delta sync for the iOS client. Returns every row changed since `since`
 * (keyed on updatedAt), split into `upserts` (live rows) and `deletes` (ids of
 * soft-deleted rows) per entity. With no `since`, returns the full live dataset.
 *
 * Note: unlike normal service reads, this MUST include soft-deleted rows so the
 * client learns about deletions.
 */
export async function changedSince(userId: string, since?: Date) {
  const whereChanged = since
    ? { userId, updatedAt: { gt: since } }
    : { userId, deletedAt: null }

  const [profiles, categories, paymentModes, transactions, receipts, imports] = await Promise.all([
    prisma.budgetProfile.findMany({ where: whereChanged }),
    prisma.category.findMany({ where: whereChanged }),
    prisma.paymentMode.findMany({ where: whereChanged }),
    prisma.transaction.findMany({ where: whereChanged }),
    prisma.receipt.findMany({ where: whereChanged }),
    prisma.statementImport.findMany({ where: whereChanged }),
  ])

  const split = <T extends { id: string; deletedAt?: Date | null }>(rows: T[]) => ({
    upserts: rows.filter((r) => !r.deletedAt),
    deletes: rows.filter((r) => r.deletedAt).map((r) => r.id),
  })

  return {
    serverTime: new Date().toISOString(),
    budgetProfiles: split(profiles),
    categories: split(categories),
    paymentModes: split(paymentModes),
    transactions: split(transactions),
    receipts: split(receipts),
    statementImports: split(imports),
  }
}
