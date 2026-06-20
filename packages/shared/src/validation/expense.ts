import { z } from "zod"
import { PAYMENT_METHODS, FREQUENCIES } from "../enums"

/**
 * Isomorphic expense schema shared by the web Server Action adapter (after
 * FormData coercion), the REST route handler (JSON body), and the mobile app.
 * `z.coerce` lets the same schema accept both string FormData and typed JSON.
 *
 * Structural cross-field rules live here; ownership of the linked account/card
 * is enforced in the service layer (it needs the DB + userId).
 */
export const expenseBaseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  expenseDate: z.coerce.date(),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  bankAccountId: z.string().optional().nullable(),
  creditCardId: z.string().optional().nullable(),
  debitCardId: z.string().optional().nullable(),
  isRecurring: z.coerce.boolean().optional().default(false),
  frequency: z.enum(FREQUENCIES).optional().nullable(),
  isBusinessExpense: z.coerce.boolean().optional().default(false),
  isTaxDeductible: z.coerce.boolean().optional().default(false),
  taxSection: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  receiptUrl: z.string().url("Invalid receipt URL").optional().nullable(),
  receiptName: z.string().max(255).optional().nullable(),
})

export const expenseCreateSchema = expenseBaseSchema.superRefine((d, ctx) => {
  if (d.isRecurring && !d.frequency) {
    ctx.addIssue({ code: "custom", path: ["frequency"], message: "Frequency is required for recurring expenses" })
  }
  if (d.paymentMethod === "BANK_TRANSFER" && !d.bankAccountId) {
    ctx.addIssue({ code: "custom", path: ["bankAccountId"], message: "Bank account is required for bank transfer" })
  }
  if (d.paymentMethod === "CREDIT_CARD" && !d.creditCardId) {
    ctx.addIssue({ code: "custom", path: ["creditCardId"], message: "Credit card is required for credit card payment" })
  }
  if (d.paymentMethod === "DEBIT_CARD" && !d.debitCardId) {
    ctx.addIssue({ code: "custom", path: ["debitCardId"], message: "Debit card is required for debit card payment" })
  }
})
export type ExpenseInput = z.infer<typeof expenseBaseSchema>

/** Partial for PATCH; the service re-validates conditional rules against the merged row. */
export const expenseUpdateSchema = expenseBaseSchema.partial()
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>
