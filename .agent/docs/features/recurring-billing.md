# Recurring Billing (automation)

Auto-posts due **subscription** charges as Expenses and rolls `nextBillingDate` forward,
so subscriptions stop being static reminders and actually hit the ledger.

## How it works
- `lib/services/recurring.service.ts` → `runRecurringBilling(now?)`:
  finds active, `autoRenewal` subscriptions with `nextBillingDate <= now` (and not past
  `endDate`); for each, in a `$transaction`, creates an Expense per due cycle (backfilling
  missed cycles, bounded by `MAX_CATCHUP = 24`), updates the linked credit card's
  outstanding/available when `paymentMethod` is CREDIT_CARD, and advances `nextBillingDate`.
- **Idempotent across runs**: each posted charge moves `nextBillingDate` forward, so a re-run
  finds nothing due — no double-posting.
- Subscription `paymentMethod` is a free string; `toPaymentMethod()` maps it to the
  `PaymentMethod` enum (falls back to `OTHER`).

## Trigger
- Cron: `app/api/v1/internal/recurring/route.ts` (GET, `runtime=nodejs`), secret-guarded by
  `CRON_SECRET` (Bearer) or `EXTRACT_WORKER_SECRET` (`x-worker-secret`), same as extract-sweep.
- Scheduled daily at 02:00 via `vercel.json` (`0 2 * * *`).

## Follow-ups
- Recurring **income/expense** generation isn't automated yet — Income/Expense have an
  `isRecurring`/`frequency` flag but no `nextOccurrence` field, so safe generation needs a
  schema column (migration). Subscriptions were the clean case (they own `nextBillingDate`).
- No per-run audit log of what was posted (relies on the Expense rows themselves).
