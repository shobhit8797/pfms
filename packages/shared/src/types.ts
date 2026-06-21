import type {
  PaymentMethod,
  IncomeType,
  Frequency,
  MessageSource,
  InboundMessageStatus,
  TxnDirection,
  SubscriptionPaymentStatus,
} from "./enums"

/**
 * Response DTOs returned by the REST API. Money fields arrive as numbers — the
 * REST layer runs Prisma `Decimal`s through `serializeDecimals()` before
 * sending, and dates are ISO strings over the wire.
 */

export type AuthUser = { id: string; name: string | null; email: string }
export type LoginResponse = { token: string; user: AuthUser }

export type ExpenseDTO = {
  id: string
  amount: number
  expenseDate: string
  category: string
  subcategory: string | null
  description: string
  paymentMethod: PaymentMethod
  bankAccountId: string | null
  creditCardId: string | null
  debitCardId: string | null
  isRecurring: boolean
  frequency: Frequency | null
  isBusinessExpense: boolean
  isTaxDeductible: boolean
  taxSection: string | null
  notes: string | null
  receiptUrl: string | null
  receiptName: string | null
  createdAt: string
  bankAccount?: { bankName: string; accountName: string } | null
  creditCard?: { cardName: string; lastFourDigits: string } | null
  debitCard?: { cardName: string; lastFourDigits: string } | null
}

export type IncomeDTO = {
  id: string
  source: string
  amount: number
  incomeDate: string
  type: IncomeType
  isRecurring: boolean
  frequency: Frequency | null
  isTaxable: boolean
  bankAccountId: string | null
  category: string
  notes: string | null
  receiptUrl: string | null
  receiptName: string | null
  createdAt: string
  bankAccount?: { accountName: string; bankName: string } | null
}

export type SubscriptionDTO = {
  id: string
  serviceName: string
  amount: number
  billingCycle: Frequency
  startDate: string
  endDate: string | null
  nextBillingDate: string
  autoRenewal: boolean
  reminderDays: number[]
  category: string
  paymentMethod: string
  creditCardId: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  creditCard?: { cardName: string; lastFourDigits: string } | null
  /** Convenience aggregate the list endpoint may include. */
  paymentsCount?: number
  lastPaidDate?: string | null
}

export type SubscriptionPaymentDTO = {
  id: string
  subscriptionId: string
  periodStart: string
  dueDate: string
  amount: number
  status: SubscriptionPaymentStatus
  paidDate: string | null
  expenseId: string | null
  notes: string | null
  createdAt: string
}

/** A single billing period in the active/paid month grid. */
export type SubscriptionMonthDTO = {
  /** ISO date of the period start. */
  period: string
  /** Within the subscription's active window (startDate..endDate/cancel). */
  active: boolean
  /** A PAID SubscriptionPayment exists for this period. */
  paid: boolean
  amount: number
}

/** A detected recurring-transaction candidate the user can confirm in one tap. */
export type RecurringSuggestionDTO = {
  kind: "expense" | "income"
  /** Representative label (expense description / income source). */
  label: string
  /** Rounded representative amount. */
  amount: number
  /** Number of distinct months the pattern was seen in. */
  occurrences: number
  suggestedFrequency: Frequency
  /** IDs of the matching rows not yet marked recurring. */
  ids: string[]
  category: string | null
}

export type AccountPickerDTO = {
  id: string
  accountName: string
  bankName: string
  maskedNumber: string
  currentBalance: number
}

export type CardPickerDTO = {
  id: string
  cardName: string
  lastFourDigits: string
  availableCredit: number
}

export type CardDTO = {
  id: string
  cardName: string
  bankName: string
  lastFourDigits: string
  creditLimit: number
  currentOutstanding: number
  availableCredit: number
  billingDate: number
  dueDate: number
  interestRate: number | null
  rewardPoints: number
  isActive: boolean
  createdAt: string
}

export type DebitCardDTO = {
  id: string
  cardName: string
  bankName: string
  lastFourDigits: string
  cardNetwork: string | null
  bankAccountId: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
}

export type UpiHandleDTO = {
  id: string
  name: string
  handle: string
  isDefault: boolean
  createdAt: string
}

/**
 * Fields extracted from a receipt image/PDF by the AI scan endpoint
 * (`POST /api/v1/expenses/scan`). Every field is nullable — the user reviews and
 * edits before saving. `paymentMethod` is constrained to the known enum.
 */
export type ReceiptScanDTO = {
  amount: number | null
  description: string | null
  category: string | null
  paymentMethod: PaymentMethod | null
  expenseDate: string | null
  merchant: string | null
}

/**
 * A captured transaction message in the review queue. Parsed fields are the
 * model's best guess (nullable); `suggestedCategory` is the learned merchant
 * category when known, else the model's guess. `askReceipt` is false for
 * merchants the user previously declined a receipt for.
 */
export type InboundMessageDTO = {
  id: string
  source: MessageSource
  rawText: string
  sender: string | null
  receivedAt: string
  status: InboundMessageStatus
  parsedAmount: number | null
  parsedMerchant: string | null
  parsedDate: string | null
  parsedPaymentMethod: PaymentMethod | null
  parsedDirection: TxnDirection | null
  parsedAccountHint: string | null
  confidence: number | null
  suggestedCategory: string | null
  askReceipt: boolean
  expenseId: string | null
  incomeId: string | null
  createdAt: string
}

/** Result of ingesting a message: the queued row (or a duplicate/ignored note). */
export type IngestMessageDTO = {
  message: InboundMessageDTO
  duplicate: boolean
}

/** A learned per-merchant preference (auto-category + receipt opt-out). */
export type MerchantPreferenceDTO = {
  id: string
  merchantKey: string
  displayName: string
  category: string | null
  paymentMethod: PaymentMethod | null
  askReceipt: boolean
  timesSeen: number
  declineCount: number
  lastSeenAt: string
}

/** A minted long-lived API token (plaintext shown once) for the iOS Shortcut. */
export type IssuedTokenDTO = { id: string; token: string; name: string | null; createdAt: string }

/** Whether the user's Gmail is connected for auto-capture, and its sync state. */
export type GmailStatusDTO =
  | { connected: false }
  | {
      connected: true
      email: string
      status: "CONNECTED" | "REVOKED" | "ERROR"
      lastSyncedAt: string | null
    }

/** Result of an on-demand Gmail sync: emails pulled, and how many were newly queued. */
export type GmailSyncDTO = { fetched: number; queued: number }

/**
 * Result of enabling curated capture (Expenses label + Purchases category) and
 * backfilling existing mail. `truncated` means the fetch cap was hit — run again
 * to import more (already-imported mail dedupes without re-parsing).
 */
export type GmailBackfillDTO = { fetched: number; queued: number; truncated: boolean }

export type ListResponse<T> = { items: T[]; total: number; limit: number; offset: number }

/** Error envelope returned by `withApiUser` on failure. */
export type ApiErrorBody = { error: string; code?: string }
