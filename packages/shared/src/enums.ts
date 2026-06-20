/**
 * Plain mirrors of the Prisma enums used by Expense/Income. Kept here (not
 * imported from @prisma/client) so the package stays isomorphic — the mobile
 * app and the web both import the same literal values for pickers/validation.
 * If the Prisma schema enums change, update these to match.
 */

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "UPI", "OTHER"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const INCOME_TYPES = [
  "SALARY",
  "FREELANCE",
  "RENTAL",
  "INTEREST",
  "BONUS",
  "GIFT",
  "OTHER",
] as const
export type IncomeType = (typeof INCOME_TYPES)[number]

export const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const
export type Frequency = (typeof FREQUENCIES)[number]

/** Human-friendly labels for UI pickers. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CREDIT_CARD: "Credit card",
  DEBIT_CARD: "Debit card",
  UPI: "UPI",
  OTHER: "Other",
}

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  SALARY: "Salary",
  FREELANCE: "Freelance",
  RENTAL: "Rental",
  INTEREST: "Interest",
  BONUS: "Bonus",
  GIFT: "Gift",
  OTHER: "Other",
}

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
}

// ---- Message capture (mirrors the Prisma enums; keep in sync) ----

export const MESSAGE_SOURCES = ["IOS_SHORTCUT", "ANDROID_SMS", "SHARE", "MANUAL", "EMAIL"] as const
export type MessageSource = (typeof MESSAGE_SOURCES)[number]

export const INBOUND_MESSAGE_STATUSES = [
  "PENDING_REVIEW",
  "DONE",
  "DISMISSED",
  "IGNORED",
  "FAILED",
  "DUPLICATE",
] as const
export type InboundMessageStatus = (typeof INBOUND_MESSAGE_STATUSES)[number]

export const TXN_DIRECTIONS = ["DEBIT", "CREDIT"] as const
export type TxnDirection = (typeof TXN_DIRECTIONS)[number]
