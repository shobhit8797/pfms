import { prisma } from "@/lib/db"
import { PaymentMethod, Frequency } from "@prisma/client"
import { addDays, addWeeks, addMonths, addQuarters, addYears } from "date-fns"

/**
 * Recurring automation: auto-posts due subscription charges as Expenses and rolls
 * `nextBillingDate` forward. Idempotent across runs because each posted charge advances
 * the subscription's nextBillingDate — a re-run sees no due rows. Designed to be driven
 * by a Vercel Cron (see app/api/v1/internal/recurring/route.ts).
 */

const MAX_CATCHUP = 24 // bound backfill so a long-dormant sub can't post hundreds of rows

/** Advance a date by one billing cycle. Exported and reused by subscription.service. */
export function advance(date: Date, cycle: Frequency): Date {
  switch (cycle) {
    case "DAILY":
      return addDays(date, 1)
    case "WEEKLY":
      return addWeeks(date, 1)
    case "MONTHLY":
      return addMonths(date, 1)
    case "QUARTERLY":
      return addQuarters(date, 1)
    case "YEARLY":
      return addYears(date, 1)
    default:
      return addMonths(date, 1)
  }
}

function toPaymentMethod(s: string): PaymentMethod {
  const norm = (s || "").toUpperCase().replace(/\s+/g, "_")
  const valid: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "UPI", "OTHER"]
  return (valid as string[]).includes(norm) ? (norm as PaymentMethod) : "OTHER"
}

export type RecurringRunResult = {
  subscriptionsProcessed: number
  chargesPosted: number
}

export async function runRecurringBilling(now: Date = new Date()): Promise<RecurringRunResult> {
  // Subscriptions due for billing: active, auto-renew, not past their end date.
  const due = await prisma.subscription.findMany({
    where: {
      isActive: true,
      autoRenewal: true,
      nextBillingDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  })

  let chargesPosted = 0

  for (const sub of due) {
    const method = toPaymentMethod(sub.paymentMethod)
    const amount = Number(sub.amount)

    await prisma.$transaction(async (tx) => {
      let billDate = new Date(sub.nextBillingDate)
      let posted = 0

      // Backfill any missed cycles, bounded by MAX_CATCHUP and the subscription's endDate.
      while (billDate <= now && posted < MAX_CATCHUP) {
        if (sub.endDate && billDate > sub.endDate) break

        const charge = await tx.expense.create({
          data: {
            userId: sub.userId,
            amount: sub.amount,
            expenseDate: billDate,
            category: sub.category,
            description: `${sub.serviceName} (subscription)`,
            paymentMethod: method,
            creditCardId: method === "CREDIT_CARD" ? sub.creditCardId : null,
            isRecurring: true,
            frequency: sub.billingCycle,
            notes: "Auto-posted by recurring billing",
          },
        })

        // Record the period in the subscription payment history (idempotent via
        // the @@unique([subscriptionId, periodStart])). Unifies auto-billed and
        // manually-marked-paid history.
        await tx.subscriptionPayment.upsert({
          where: { subscriptionId_periodStart: { subscriptionId: sub.id, periodStart: billDate } },
          create: {
            subscriptionId: sub.id,
            userId: sub.userId,
            periodStart: billDate,
            dueDate: billDate,
            amount: sub.amount,
            status: "PAID",
            paidDate: now,
            expenseId: charge.id,
          },
          update: { expenseId: charge.id, status: "PAID", paidDate: now },
        })

        // Keep credit-card outstanding in sync when charged to a card.
        if (method === "CREDIT_CARD" && sub.creditCardId) {
          await tx.creditCard.updateMany({
            where: { id: sub.creditCardId, userId: sub.userId },
            data: {
              currentOutstanding: { increment: amount },
              availableCredit: { decrement: amount },
            },
          })
        }

        posted += 1
        billDate = advance(billDate, sub.billingCycle)
      }

      if (posted > 0) {
        await tx.subscription.update({
          where: { id: sub.id },
          data: { nextBillingDate: billDate },
        })
      }

      chargesPosted += posted
    })
  }

  return { subscriptionsProcessed: due.length, chargesPosted }
}

// ---- Recurring detection ("same transaction month on month") ----

export type RecurringSuggestion = {
  kind: "expense" | "income"
  label: string
  amount: number
  occurrences: number
  suggestedFrequency: Frequency
  ids: string[]
  category: string | null
}

const MIN_OCCURRENCES = 3 // seen in ≥3 distinct months
const AMOUNT_TOLERANCE = 0.05 // group amounts within ±5%
const LOOKBACK_MONTHS = 12

/** Normalize a free-text label so "Netflix #123" and "NETFLIX" group together. */
function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`
}

type Row = { id: string; label: string; amount: number; date: Date; category: string | null }

/** Group rows by normalized label + amount bucket; flag those spanning ≥3 months. */
function buildSuggestions(rows: Row[], kind: "expense" | "income"): RecurringSuggestion[] {
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const key = `${normalizeLabel(r.label)}|${Math.round(r.amount)}`
    if (!key.trim().startsWith("|")) {
      const arr = groups.get(key) ?? []
      arr.push(r)
      groups.set(key, arr)
    }
  }

  const out: RecurringSuggestion[] = []
  for (const arr of groups.values()) {
    const months = new Set(arr.map((r) => monthKey(r.date)))
    if (months.size < MIN_OCCURRENCES) continue
    // Confirm amounts are tight (within tolerance of the median-ish first value).
    const base = arr[0].amount
    if (base <= 0) continue
    const tight = arr.every((r) => Math.abs(r.amount - base) <= base * AMOUNT_TOLERANCE)
    if (!tight) continue
    out.push({
      kind,
      label: arr[0].label,
      amount: Math.round(base),
      occurrences: months.size,
      suggestedFrequency: "MONTHLY",
      ids: arr.map((r) => r.id),
      category: arr[0].category ?? null,
    })
  }
  return out.sort((a, b) => b.occurrences - a.occurrences)
}

/**
 * Detect expenses/income that repeat month-on-month but aren't yet marked
 * recurring, so the UI can prompt a one-tap confirm. Heuristic and conservative.
 */
export async function detectRecurringSuggestions(userId: string): Promise<RecurringSuggestion[]> {
  const since = addMonths(new Date(), -LOOKBACK_MONTHS)
  const [expenses, incomes] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, isRecurring: false, expenseDate: { gte: since } },
      select: { id: true, description: true, amount: true, expenseDate: true, category: true },
    }),
    prisma.income.findMany({
      where: { userId, isRecurring: false, incomeDate: { gte: since } },
      select: { id: true, source: true, amount: true, incomeDate: true, category: true },
    }),
  ])

  return [
    ...buildSuggestions(
      expenses.map((e) => ({ id: e.id, label: e.description, amount: Number(e.amount), date: e.expenseDate, category: e.category })),
      "expense"
    ),
    ...buildSuggestions(
      incomes.map((i) => ({ id: i.id, label: i.source, amount: Number(i.amount), date: i.incomeDate, category: i.category })),
      "income"
    ),
  ]
}

/**
 * Confirm a suggestion: flag the given expense/income rows recurring at the
 * chosen frequency. userId-scoped; balances are untouched (recurring is a flag).
 */
export async function markRecurring(
  userId: string,
  kind: "expense" | "income",
  ids: string[],
  frequency: Frequency = "MONTHLY"
) {
  if (ids.length === 0) return { count: 0 }
  if (kind === "expense") {
    const r = await prisma.expense.updateMany({ where: { id: { in: ids }, userId }, data: { isRecurring: true, frequency } })
    return { count: r.count }
  }
  const r = await prisma.income.updateMany({ where: { id: { in: ids }, userId }, data: { isRecurring: true, frequency } })
  return { count: r.count }
}
