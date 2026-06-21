import { prisma } from "@/lib/db"
import { notFound, validation } from "@/lib/errors"
import { advance } from "@/lib/services/recurring.service"
import type { SubscriptionInput, SubscriptionUpdateInput, SubscriptionPaymentInput } from "@pfms/shared"
import type { Prisma, PaymentMethod } from "@prisma/client"

/**
 * Subscription business logic — shared by the web Server Action adapter
 * (app/actions/subscription.ts) and the REST handlers (app/api/v1/subscriptions).
 * Pure (userId, input) functions that throw ServiceError; every query is
 * userId-scoped. Paid periods are tracked in SubscriptionPayment, which also
 * powers the active/paid month grid (getMonthGrid) and history (listPayments).
 */

const listInclude = {
  creditCard: { select: { cardName: true, lastFourDigits: true } },
} satisfies Prisma.SubscriptionInclude

const DEFAULT_REMINDER_DAYS = [1, 3]
const MAX_GRID_PERIODS = 36 // cap the computed month grid

async function assertCardOwned(userId: string, creditCardId?: string | null) {
  if (!creditCardId) return
  const owned = await prisma.creditCard.findFirst({ where: { id: creditCardId, userId }, select: { id: true } })
  if (!owned) throw validation("Credit card not found")
}

export async function listSubscriptions(userId: string, opts: { includeInactive?: boolean } = {}) {
  const where: Prisma.SubscriptionWhereInput = { userId, ...(opts.includeInactive ? {} : { isActive: true }) }
  const [rows, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      orderBy: { nextBillingDate: "asc" },
      include: {
        ...listInclude,
        payments: { orderBy: { periodStart: "desc" }, take: 1, select: { paidDate: true } },
        _count: { select: { payments: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ])
  const items = rows.map(({ payments, _count, ...sub }) => ({
    ...sub,
    paymentsCount: _count.payments,
    lastPaidDate: payments[0]?.paidDate ?? null,
  }))
  return { items, total, limit: items.length, offset: 0 }
}

export async function getSubscriptionOrThrow(userId: string, id: string) {
  const sub = await prisma.subscription.findFirst({ where: { id, userId }, include: listInclude })
  if (!sub) throw notFound("Subscription not found")
  return sub
}

export async function createSubscription(userId: string, input: SubscriptionInput) {
  await assertCardOwned(userId, input.creditCardId)
  const sub = await prisma.subscription.create({
    data: {
      userId,
      serviceName: input.serviceName,
      amount: input.amount,
      billingCycle: input.billingCycle,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      nextBillingDate: input.nextBillingDate,
      autoRenewal: input.autoRenewal ?? true,
      reminderDays: input.reminderDays ?? DEFAULT_REMINDER_DAYS,
      category: input.category,
      paymentMethod: input.paymentMethod,
      creditCardId: input.creditCardId ?? null,
      notes: input.notes ?? null,
    },
    include: listInclude,
  })
  return sub
}

export async function updateSubscription(userId: string, id: string, input: SubscriptionUpdateInput) {
  await getSubscriptionOrThrow(userId, id)
  if (input.creditCardId !== undefined) await assertCardOwned(userId, input.creditCardId)

  await prisma.subscription.update({
    where: { id },
    data: {
      ...(input.serviceName !== undefined ? { serviceName: input.serviceName } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.billingCycle !== undefined ? { billingCycle: input.billingCycle } : {}),
      ...(input.startDate !== undefined ? { startDate: input.startDate } : {}),
      ...(input.endDate !== undefined ? { endDate: input.endDate ?? null } : {}),
      ...(input.nextBillingDate !== undefined ? { nextBillingDate: input.nextBillingDate } : {}),
      ...(input.autoRenewal !== undefined ? { autoRenewal: input.autoRenewal } : {}),
      ...(input.reminderDays !== undefined ? { reminderDays: input.reminderDays } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.paymentMethod !== undefined ? { paymentMethod: input.paymentMethod } : {}),
      ...(input.creditCardId !== undefined ? { creditCardId: input.creditCardId ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
    },
  })
  return getSubscriptionOrThrow(userId, id)
}

/** Soft cancel (keeps history); REST clients can also PATCH `{ isActive: false }`. */
export async function cancelSubscription(userId: string, id: string) {
  await getSubscriptionOrThrow(userId, id)
  await prisma.subscription.update({ where: { id }, data: { isActive: false } })
  return getSubscriptionOrThrow(userId, id)
}

export async function deleteSubscription(userId: string, id: string) {
  await getSubscriptionOrThrow(userId, id)
  await prisma.subscription.delete({ where: { id } }) // cascades SubscriptionPayment rows
  return { ok: true as const }
}

function toPaymentMethod(s: string): PaymentMethod {
  const norm = (s || "").toUpperCase().replace(/\s+/g, "_")
  const valid: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "UPI", "OTHER"]
  return (valid as string[]).includes(norm) ? (norm as PaymentMethod) : "OTHER"
}

/**
 * Record a payment for a billing period (defaults to the current
 * `nextBillingDate`), advance `nextBillingDate` one cycle, and optionally post a
 * linked Expense (updating credit-card balances). Idempotent via the unique
 * (subscriptionId, periodStart) — re-marking the same period just refreshes it.
 */
export async function markPaid(userId: string, id: string, input: SubscriptionPaymentInput = {}) {
  const sub = await getSubscriptionOrThrow(userId, id)
  const periodStart = input.periodStart ? new Date(input.periodStart as string | number | Date) : new Date(sub.nextBillingDate)
  const amount = input.amount != null ? Number(input.amount) : Number(sub.amount)
  const paidDate = input.paidDate ? new Date(input.paidDate as string | number | Date) : new Date()
  const createExpense = input.createExpense ?? false
  const method = toPaymentMethod(sub.paymentMethod)

  const payment = await prisma.$transaction(async (tx) => {
    let expenseId: string | null = null
    if (createExpense) {
      const charge = await tx.expense.create({
        data: {
          userId,
          amount,
          expenseDate: periodStart,
          category: sub.category,
          description: `${sub.serviceName} (subscription)`,
          paymentMethod: method,
          creditCardId: method === "CREDIT_CARD" ? sub.creditCardId : null,
          isRecurring: true,
          frequency: sub.billingCycle,
          notes: "Posted from subscription mark-paid",
        },
      })
      expenseId = charge.id
      if (method === "CREDIT_CARD" && sub.creditCardId) {
        await tx.creditCard.updateMany({
          where: { id: sub.creditCardId, userId },
          data: { currentOutstanding: { increment: amount }, availableCredit: { decrement: amount } },
        })
      }
    }

    const p = await tx.subscriptionPayment.upsert({
      where: { subscriptionId_periodStart: { subscriptionId: id, periodStart } },
      create: {
        subscriptionId: id,
        userId,
        periodStart,
        dueDate: periodStart,
        amount,
        status: "PAID",
        paidDate,
        expenseId,
        notes: input.notes ?? null,
      },
      update: { status: "PAID", paidDate, amount, ...(expenseId ? { expenseId } : {}), notes: input.notes ?? null },
    })

    // Roll the billing date forward only when paying the current/overdue period.
    if (periodStart >= new Date(sub.nextBillingDate)) {
      await tx.subscription.update({
        where: { id },
        data: { nextBillingDate: advance(new Date(sub.nextBillingDate), sub.billingCycle) },
      })
    }
    return p
  })
  return payment
}

export async function listPayments(userId: string, id: string) {
  await getSubscriptionOrThrow(userId, id)
  const items = await prisma.subscriptionPayment.findMany({
    where: { subscriptionId: id, userId },
    orderBy: { periodStart: "desc" },
  })
  return { items, total: items.length, limit: items.length, offset: 0 }
}

/**
 * Compute the active/paid status of each billing period from `startDate` up to
 * now, stepping by the billing cycle. A period is `active` when it falls inside
 * the subscription's live window; `paid` when a PAID payment lands within it.
 */
export async function getMonthGrid(userId: string, id: string, now: Date = new Date()) {
  const sub = await getSubscriptionOrThrow(userId, id)
  const payments = await prisma.subscriptionPayment.findMany({
    where: { subscriptionId: id, userId, status: "PAID" },
    select: { periodStart: true },
  })
  const paidStarts = payments.map((p) => p.periodStart.getTime())

  // Active window ends at endDate, or now (live), or when it was cancelled.
  const activeUntil = sub.endDate ?? (sub.isActive ? now : sub.updatedAt)
  const amount = Number(sub.amount)

  const grid: { period: string; active: boolean; paid: boolean; amount: number }[] = []
  let cursor = new Date(sub.startDate)
  let count = 0
  while (cursor <= now && count < MAX_GRID_PERIODS) {
    const next = advance(cursor, sub.billingCycle)
    const start = cursor.getTime()
    const end = next.getTime()
    grid.push({
      period: cursor.toISOString(),
      active: cursor <= activeUntil,
      paid: paidStarts.some((t) => t >= start && t < end),
      amount,
    })
    cursor = next
    count++
  }
  return grid
}
