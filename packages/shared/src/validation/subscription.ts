import { z } from "zod"
import { FREQUENCIES } from "../enums"

/**
 * Isomorphic subscription schema shared by the web Server Action adapter (after
 * FormData coercion), the REST route handler (JSON body), and the mobile app.
 * `z.coerce` lets the same schema accept both string FormData and typed JSON.
 * Ownership of the linked credit card is enforced in the service layer.
 */
export const subscriptionBaseSchema = z.object({
  serviceName: z.string().min(1, "Service name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  billingCycle: z.enum(FREQUENCIES),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  nextBillingDate: z.coerce.date(),
  autoRenewal: z.coerce.boolean().optional().default(true),
  category: z.string().min(1, "Category is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  creditCardId: z.string().optional().nullable(),
  reminderDays: z.array(z.coerce.number().int()).optional(),
  notes: z.string().optional().nullable(),
})

export const subscriptionCreateSchema = subscriptionBaseSchema
export type SubscriptionInput = z.infer<typeof subscriptionBaseSchema>

/** Partial for PATCH (also carries `isActive` so cancel/reactivate is one endpoint). */
export const subscriptionUpdateSchema = subscriptionBaseSchema.partial().extend({
  isActive: z.coerce.boolean().optional(),
})
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>

/**
 * Record a payment for a subscription period. All fields optional — the service
 * defaults `periodStart` to the subscription's current `nextBillingDate`,
 * `amount` to the subscription amount, and `paidDate` to now. When
 * `createExpense` is true a linked Expense is posted (and CC balances updated).
 */
export const subscriptionPaymentSchema = z.object({
  periodStart: z.coerce.date().optional().nullable(),
  amount: z.coerce.number().positive().optional().nullable(),
  paidDate: z.coerce.date().optional().nullable(),
  createExpense: z.coerce.boolean().optional().default(false),
  notes: z.string().optional().nullable(),
})
/** `z.input` (not `infer`) so callers may omit defaulted fields like `createExpense`. */
export type SubscriptionPaymentInput = z.input<typeof subscriptionPaymentSchema>
