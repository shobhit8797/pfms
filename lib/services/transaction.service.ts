import { prisma } from "@/lib/db"
import { notFound, validation } from "@/lib/errors"
import type { TransactionInput, TransactionUpdateInput } from "@/lib/validation/budget"
import type { CategoryType, Prisma } from "@prisma/client"

export type TransactionFilters = {
  categoryId?: string
  paymentModeId?: string
  type?: CategoryType
  from?: Date
  to?: Date
  search?: string
}

function buildWhere(userId: string, f: TransactionFilters = {}): Prisma.TransactionWhereInput {
  return {
    userId,
    deletedAt: null,
    ...(f.categoryId ? { categoryId: f.categoryId } : {}),
    ...(f.paymentModeId ? { paymentModeId: f.paymentModeId } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.from || f.to
      ? { date: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } }
      : {}),
    ...(f.search ? { description: { contains: f.search, mode: "insensitive" } } : {}),
  }
}

export async function listTransactions(
  userId: string,
  filters: TransactionFilters = {},
  limit = 50,
  offset = 0
) {
  const where = buildWhere(userId, filters)
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
      include: {
        category: { select: { name: true, type: true, colorHex: true, icon: true } },
        paymentMode: { select: { name: true } },
        receipts: {
          where: { deletedAt: null },
          select: { id: true, fileUrl: true, thumbnailUrl: true },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ])
  return { items, total, limit, offset }
}

export async function getTransactionOrThrow(userId: string, id: string) {
  const txn = await prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
    include: {
      category: true,
      paymentMode: true,
      receipts: { where: { deletedAt: null } },
    },
  })
  if (!txn) throw notFound("Transaction not found")
  return txn
}

/** Verifies the category belongs to the user and returns its type. */
async function resolveCategoryType(userId: string, categoryId: string): Promise<CategoryType> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, deletedAt: null },
    select: { type: true },
  })
  if (!category) throw validation("Invalid category")
  return category.type
}

async function assertPaymentModeOwned(userId: string, paymentModeId?: string | null) {
  if (!paymentModeId) return
  const mode = await prisma.paymentMode.findFirst({
    where: { id: paymentModeId, userId, deletedAt: null },
    select: { id: true },
  })
  if (!mode) throw validation("Invalid payment mode")
}

export async function createTransaction(userId: string, input: TransactionInput) {
  // Type auto-fills from the category unless explicitly overridden.
  const categoryType = await resolveCategoryType(userId, input.categoryId)
  await assertPaymentModeOwned(userId, input.paymentModeId)

  return prisma.transaction.create({
    data: {
      userId,
      date: input.date,
      description: input.description,
      categoryId: input.categoryId,
      amount: input.amount,
      paymentModeId: input.paymentModeId ?? null,
      type: input.type ?? categoryType,
      notes: input.notes ?? null,
      source: input.source ?? "MANUAL",
      receiptIds: input.receiptIds ?? [],
    },
  })
}

export async function updateTransaction(userId: string, id: string, input: TransactionUpdateInput) {
  await getTransactionOrThrow(userId, id)

  // If category changes and no explicit type override, re-derive the type.
  let type = input.type
  if (input.categoryId) {
    const categoryType = await resolveCategoryType(userId, input.categoryId)
    type = input.type ?? categoryType
  }
  if (input.paymentModeId !== undefined) {
    await assertPaymentModeOwned(userId, input.paymentModeId)
  }

  return prisma.transaction.update({
    where: { id },
    data: {
      ...(input.date !== undefined ? { date: input.date } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.paymentModeId !== undefined ? { paymentModeId: input.paymentModeId } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.receiptIds !== undefined ? { receiptIds: input.receiptIds } : {}),
    },
  })
}

/** Soft delete (sets deletedAt so the sync layer can propagate the deletion). */
export async function softDeleteTransaction(userId: string, id: string) {
  await getTransactionOrThrow(userId, id)
  return prisma.transaction.update({
    where: { id },
    data: { deletedAt: new Date() },
  })
}
