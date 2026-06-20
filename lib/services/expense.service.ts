import { prisma } from "@/lib/db"
import { notFound, validation } from "@/lib/errors"
import { deleteBlob } from "@/lib/blob"
import type { ExpenseInput, ExpenseUpdateInput } from "@pfms/shared"
import type { Prisma } from "@prisma/client"

/**
 * Expense business logic — shared by the web Server Action adapter
 * (app/actions/expense.ts) and the REST handlers (app/api/v1/expenses). Pure
 * (userId, input) functions that throw ServiceError; every query is userId-scoped.
 * Balance side effects on the linked bank account / credit card are preserved
 * exactly as the original action implemented them, inside a $transaction.
 */

export type ExpenseFilters = { search?: string; from?: Date; to?: Date }

const listInclude = {
  bankAccount: { select: { bankName: true, accountName: true } },
  creditCard: { select: { cardName: true, lastFourDigits: true } },
  debitCard: { select: { cardName: true, lastFourDigits: true } },
} satisfies Prisma.ExpenseInclude

export async function listExpenses(
  userId: string,
  filters: ExpenseFilters = {},
  limit = 50,
  offset = 0
) {
  const where: Prisma.ExpenseWhereInput = {
    userId,
    ...(filters.search ? { description: { contains: filters.search, mode: "insensitive" } } : {}),
    ...(filters.from || filters.to
      ? { expenseDate: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
  }
  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      take: limit,
      skip: offset,
      include: listInclude,
    }),
    prisma.expense.count({ where }),
  ])
  return { items, total, limit, offset }
}

export async function getExpenseOrThrow(userId: string, id: string) {
  const expense = await prisma.expense.findFirst({ where: { id, userId }, include: listInclude })
  if (!expense) throw notFound("Expense not found")
  return expense
}

/** Confirms a linked account/card belongs to the user (prevents cross-tenant balance writes). */
async function assertAccountOwned(userId: string, bankAccountId?: string | null) {
  if (!bankAccountId) return
  const owned = await prisma.bankAccount.findFirst({ where: { id: bankAccountId, userId }, select: { id: true } })
  if (!owned) throw validation("Bank account not found")
}
async function assertCardOwned(userId: string, creditCardId?: string | null) {
  if (!creditCardId) return
  const owned = await prisma.creditCard.findFirst({ where: { id: creditCardId, userId }, select: { id: true } })
  if (!owned) throw validation("Credit card not found")
}
async function assertDebitCardOwned(userId: string, debitCardId?: string | null) {
  if (!debitCardId) return
  const owned = await prisma.debitCard.findFirst({ where: { id: debitCardId, userId }, select: { id: true } })
  if (!owned) throw validation("Debit card not found")
}

export async function createExpense(userId: string, input: ExpenseInput) {
  await assertAccountOwned(userId, input.bankAccountId)
  await assertCardOwned(userId, input.creditCardId)
  await assertDebitCardOwned(userId, input.debitCardId)

  const id = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        userId,
        amount: input.amount,
        expenseDate: input.expenseDate,
        category: input.category,
        subcategory: input.subcategory ?? null,
        description: input.description,
        paymentMethod: input.paymentMethod,
        bankAccountId: input.paymentMethod === "BANK_TRANSFER" ? input.bankAccountId ?? null : null,
        creditCardId: input.paymentMethod === "CREDIT_CARD" ? input.creditCardId ?? null : null,
        debitCardId: input.paymentMethod === "DEBIT_CARD" ? (input.debitCardId ?? null) : null,
        isRecurring: input.isRecurring ?? false,
        frequency: input.isRecurring ? input.frequency ?? null : null,
        isBusinessExpense: input.isBusinessExpense ?? false,
        isTaxDeductible: input.isTaxDeductible ?? false,
        taxSection: input.taxSection ?? null,
        notes: input.notes ?? null,
        receiptUrl: input.receiptUrl ?? null,
        receiptName: input.receiptName ?? null,
      },
    })
    await applyBalance(tx, userId, input.paymentMethod, input.bankAccountId, input.creditCardId, input.amount, +1)
    return expense.id
  })
  return getExpenseOrThrow(userId, id)
}

export async function updateExpense(userId: string, id: string, input: ExpenseUpdateInput) {
  const existing = await getExpenseOrThrow(userId, id)

  // Merge to get the effective values, then validate the structural rules.
  const merged = {
    paymentMethod: input.paymentMethod ?? existing.paymentMethod,
    bankAccountId: input.bankAccountId !== undefined ? input.bankAccountId : existing.bankAccountId,
    creditCardId: input.creditCardId !== undefined ? input.creditCardId : existing.creditCardId,
    debitCardId: input.debitCardId !== undefined ? input.debitCardId : existing.debitCardId,
    isRecurring: input.isRecurring ?? existing.isRecurring,
    frequency: input.frequency !== undefined ? input.frequency : existing.frequency,
    amount: input.amount ?? Number(existing.amount),
  }
  if (merged.paymentMethod === "BANK_TRANSFER" && !merged.bankAccountId) throw validation("Bank account is required for bank transfer")
  if (merged.paymentMethod === "CREDIT_CARD" && !merged.creditCardId) throw validation("Credit card is required for credit card payment")
  if (merged.paymentMethod === "DEBIT_CARD" && !merged.debitCardId) throw validation("Debit card is required for debit card payment")
  if (merged.isRecurring && !merged.frequency) throw validation("Frequency is required for recurring expenses")
  await assertAccountOwned(userId, merged.bankAccountId)
  await assertCardOwned(userId, merged.creditCardId)
  await assertDebitCardOwned(userId, merged.debitCardId)

  await prisma.$transaction(async (tx) => {
    // Revert the OLD effect, then apply the NEW one (handles amount/method/target changes).
    await applyBalance(tx, userId, existing.paymentMethod, existing.bankAccountId, existing.creditCardId, Number(existing.amount), -1)
    await applyBalance(tx, userId, merged.paymentMethod, merged.bankAccountId, merged.creditCardId, merged.amount, +1)

    await tx.expense.update({
      where: { id },
      data: {
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.expenseDate !== undefined ? { expenseDate: input.expenseDate } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.subcategory !== undefined ? { subcategory: input.subcategory } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        paymentMethod: merged.paymentMethod,
        bankAccountId: merged.paymentMethod === "BANK_TRANSFER" ? merged.bankAccountId : null,
        creditCardId: merged.paymentMethod === "CREDIT_CARD" ? merged.creditCardId : null,
        debitCardId: merged.paymentMethod === "DEBIT_CARD" ? merged.debitCardId : null,
        isRecurring: merged.isRecurring,
        frequency: merged.isRecurring ? merged.frequency : null,
        ...(input.isBusinessExpense !== undefined ? { isBusinessExpense: input.isBusinessExpense } : {}),
        ...(input.isTaxDeductible !== undefined ? { isTaxDeductible: input.isTaxDeductible } : {}),
        ...(input.taxSection !== undefined ? { taxSection: input.taxSection } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.receiptUrl !== undefined ? { receiptUrl: input.receiptUrl ?? null } : {}),
        ...(input.receiptName !== undefined ? { receiptName: input.receiptName ?? null } : {}),
      },
    })
  })

  // If the receipt was replaced or cleared, drop the now-orphaned blob (best-effort).
  if (
    input.receiptUrl !== undefined &&
    existing.receiptUrl &&
    existing.receiptUrl !== input.receiptUrl
  ) {
    await deleteBlob(existing.receiptUrl)
  }

  return getExpenseOrThrow(userId, id)
}

export async function deleteExpense(userId: string, id: string) {
  const existing = await getExpenseOrThrow(userId, id)
  await prisma.$transaction(async (tx) => {
    await applyBalance(tx, userId, existing.paymentMethod, existing.bankAccountId, existing.creditCardId, Number(existing.amount), -1)
    await tx.expense.delete({ where: { id } })
  })
  // Remove the attached receipt blob too (best-effort, after the row is gone).
  if (existing.receiptUrl) await deleteBlob(existing.receiptUrl)
  return { ok: true as const }
}

/**
 * Applies (sign=+1) or reverts (sign=-1) an expense's effect on balances:
 * a bank-transfer decrements the account balance; a credit-card charge raises
 * outstanding and lowers available credit. All writes are userId-scoped.
 */
async function applyBalance(
  tx: Prisma.TransactionClient,
  userId: string,
  method: string,
  bankAccountId: string | null | undefined,
  creditCardId: string | null | undefined,
  amount: number,
  sign: 1 | -1
) {
  const delta = amount * sign
  if (method === "BANK_TRANSFER" && bankAccountId) {
    await tx.bankAccount.updateMany({ where: { id: bankAccountId, userId }, data: { currentBalance: { decrement: delta } } })
  }
  if (method === "CREDIT_CARD" && creditCardId) {
    await tx.creditCard.updateMany({
      where: { id: creditCardId, userId },
      data: { currentOutstanding: { increment: delta }, availableCredit: { decrement: delta } },
    })
  }
}
