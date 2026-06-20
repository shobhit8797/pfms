import { prisma } from "@/lib/db"
import { notFound, validation } from "@/lib/errors"
import type { IncomeInput, IncomeUpdateInput } from "@pfms/shared"
import type { Prisma } from "@prisma/client"

/**
 * Income business logic — shared by the web Server Action adapter
 * (app/actions/income.ts) and the REST handlers (app/api/v1/income). Income
 * linked to a bank account increments that account's balance on create and
 * reverts on delete/update, inside a $transaction. Every query is userId-scoped.
 */

const listInclude = {
  bankAccount: { select: { accountName: true, bankName: true } },
} satisfies Prisma.IncomeInclude

export async function listIncome(userId: string, limit = 50, offset = 0) {
  const where: Prisma.IncomeWhereInput = { userId }
  const [items, total] = await Promise.all([
    prisma.income.findMany({ where, orderBy: { incomeDate: "desc" }, take: limit, skip: offset, include: listInclude }),
    prisma.income.count({ where }),
  ])
  return { items, total, limit, offset }
}

export async function getIncomeOrThrow(userId: string, id: string) {
  const income = await prisma.income.findFirst({ where: { id, userId }, include: listInclude })
  if (!income) throw notFound("Income not found")
  return income
}

async function assertAccountOwned(userId: string, bankAccountId?: string | null) {
  if (!bankAccountId) return
  const owned = await prisma.bankAccount.findFirst({ where: { id: bankAccountId, userId }, select: { id: true } })
  if (!owned) throw validation("Bank account not found")
}

export async function createIncome(userId: string, input: IncomeInput) {
  await assertAccountOwned(userId, input.bankAccountId)

  const id = await prisma.$transaction(async (tx) => {
    const income = await tx.income.create({
      data: {
        userId,
        source: input.source,
        amount: input.amount,
        incomeDate: input.incomeDate,
        type: input.type,
        isRecurring: input.isRecurring ?? false,
        frequency: input.isRecurring ? input.frequency ?? null : null,
        isTaxable: input.isTaxable ?? true,
        bankAccountId: input.bankAccountId ?? null,
        category: input.category,
        notes: input.notes ?? null,
      },
    })
    if (input.bankAccountId) {
      await tx.bankAccount.updateMany({ where: { id: input.bankAccountId, userId }, data: { currentBalance: { increment: input.amount } } })
    }
    return income.id
  })
  return getIncomeOrThrow(userId, id)
}

export async function updateIncome(userId: string, id: string, input: IncomeUpdateInput) {
  const existing = await getIncomeOrThrow(userId, id)

  const merged = {
    isRecurring: input.isRecurring ?? existing.isRecurring,
    frequency: input.frequency !== undefined ? input.frequency : existing.frequency,
    bankAccountId: input.bankAccountId !== undefined ? input.bankAccountId : existing.bankAccountId,
    amount: input.amount ?? Number(existing.amount),
  }
  if (merged.isRecurring && !merged.frequency) throw validation("Frequency is required for recurring income")
  await assertAccountOwned(userId, merged.bankAccountId)

  await prisma.$transaction(async (tx) => {
    // Revert the old balance effect, then apply the new one.
    if (existing.bankAccountId) {
      await tx.bankAccount.updateMany({ where: { id: existing.bankAccountId, userId }, data: { currentBalance: { decrement: Number(existing.amount) } } })
    }
    if (merged.bankAccountId) {
      await tx.bankAccount.updateMany({ where: { id: merged.bankAccountId, userId }, data: { currentBalance: { increment: merged.amount } } })
    }

    await tx.income.update({
      where: { id },
      data: {
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.incomeDate !== undefined ? { incomeDate: input.incomeDate } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        isRecurring: merged.isRecurring,
        frequency: merged.isRecurring ? merged.frequency : null,
        ...(input.isTaxable !== undefined ? { isTaxable: input.isTaxable } : {}),
        bankAccountId: merged.bankAccountId ?? null,
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    })
  })
  return getIncomeOrThrow(userId, id)
}

export async function deleteIncome(userId: string, id: string) {
  const existing = await getIncomeOrThrow(userId, id)
  await prisma.$transaction(async (tx) => {
    if (existing.bankAccountId) {
      await tx.bankAccount.updateMany({ where: { id: existing.bankAccountId, userId }, data: { currentBalance: { decrement: Number(existing.amount) } } })
    }
    await tx.income.delete({ where: { id } })
  })
  return { ok: true as const }
}
