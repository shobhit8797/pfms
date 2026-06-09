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

function advance(date: Date, cycle: Frequency): Date {
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

        await tx.expense.create({
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
