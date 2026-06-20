import { z } from "zod"
import { INCOME_TYPES, FREQUENCIES } from "../enums"

/**
 * Isomorphic income schema shared by the web Server Action adapter, the REST
 * route handler, and the mobile app. `z.coerce` accepts both FormData strings
 * and typed JSON. Ownership of the linked bank account is enforced in the
 * service layer.
 */
export const incomeBaseSchema = z.object({
  source: z.string().min(1, "Source is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  incomeDate: z.coerce.date(),
  type: z.enum(INCOME_TYPES),
  isRecurring: z.coerce.boolean().optional().default(false),
  frequency: z.enum(FREQUENCIES).optional().nullable(),
  isTaxable: z.coerce.boolean().optional().default(true),
  bankAccountId: z.string().optional().nullable(),
  category: z.string().min(1, "Category is required"),
  notes: z.string().optional().nullable(),
})

export const incomeCreateSchema = incomeBaseSchema.superRefine((d, ctx) => {
  if (d.isRecurring && !d.frequency) {
    ctx.addIssue({ code: "custom", path: ["frequency"], message: "Frequency is required for recurring income" })
  }
})
export type IncomeInput = z.infer<typeof incomeBaseSchema>

export const incomeUpdateSchema = incomeBaseSchema.partial()
export type IncomeUpdateInput = z.infer<typeof incomeUpdateSchema>
