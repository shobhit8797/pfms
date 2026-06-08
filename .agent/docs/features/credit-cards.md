# Credit Cards

Track credit cards — limits, outstanding balance, utilization, billing/due dates, reward points.
A legacy-subsystem feature: business logic lives directly in the Server Actions file (no
`lib/services` layer), mirroring `bank-accounts`.

## Data model (`prisma/schema.prisma` → `model CreditCard`)
`id, userId, cardName, bankName, lastFourDigits, creditLimit (Decimal), currentOutstanding
(Decimal, default 0), availableCredit (Decimal), billingDate (Int, day of month), dueDate (Int,
day of month), interestRate (Decimal?), rewardPoints (Int, default 0), isActive (Bool, default
true), createdAt, updatedAt`. Relations: `user`, `expenses[]`, `subscriptions[]` (both reference
`creditCardId` optionally).

Invariant: `availableCredit = creditLimit − currentOutstanding`, computed in the action on every
create/update (never trust a client-supplied value). `currentOutstanding ≤ creditLimit` is enforced.

## Server Actions (`app/actions/credit-card.ts`)
All `auth()`-guarded and `userId`-scoped; `revalidatePath("/dashboard/credit-cards")`.
- `getCreditCards(filter?: "ALL" | "ACTIVE" | "INACTIVE" = "ACTIVE")` — list. Default `ACTIVE`
  preserves the call site in `app/dashboard/expenses/page.tsx`.
- `createCreditCard(prevState, formData)` — Zod-validated; `lastFourDigits` must match `^\d{4}$`.
- `updateCreditCard(cardId, formData)` — partial update; recomputes `availableCredit`.
- `toggleCreditCardStatus(cardId, isActive)` — activate/deactivate.
- `deleteCreditCard(cardId)` — **archives** (sets `isActive=false`) if the card has linked
  expenses/subscriptions; otherwise hard-deletes. Avoids FK violations.

## UI
- Page: `app/dashboard/credit-cards/page.tsx` (server component). Serializes Decimals with
  `serializeDecimals`, computes summary tiles (Total Limit / Outstanding / Available / Utilization%),
  Active/Inactive/All tabs.
- Components (`components/credit-cards/`): `add-credit-card-dialog.tsx` (uses `useActionState`),
  `edit-credit-card-dialog.tsx` (controlled form + `useTransition`), `delete-credit-card-dialog.tsx`
  (type-name-to-confirm), `credit-card-card.tsx` (utilization `Progress` bar, billing/due badges,
  reward points, dropdown actions).
- Nav: "Credit Cards" entry (`WalletCards` icon) in `sidebar.tsx` and `mobile-nav.tsx`, after Accounts.

## Integration
Cards appear in the Add Expense dialog's credit-card dropdown when payment method is `CREDIT_CARD`
(`components/expenses/add-expense-dialog.tsx`, fed by `getCreditCards()`).

## Security
`lastFourDigits` only — never store full card numbers. Always display masked (`····1234`).

## Follow-ups (not yet built)
- Recompute `currentOutstanding` automatically from linked credit-card expenses.
- Statement/bill reminders near `dueDate` (reuse the subscription reminder pattern).
