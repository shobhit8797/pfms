import { z } from "zod"

export const cardCreateSchema = z.object({
  cardName: z.string().min(1, "Card name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  lastFourDigits: z.string().regex(/^\d{4}$/, "Enter the last 4 digits"),
  creditLimit: z.coerce.number().positive("Credit limit must be positive"),
  currentOutstanding: z.coerce.number().min(0, "Outstanding cannot be negative").default(0),
  billingDate: z.coerce.number().int().min(1).max(31, "Billing day must be 1–31"),
  dueDate: z.coerce.number().int().min(1).max(31, "Due day must be 1–31"),
  interestRate: z.coerce.number().min(0).max(100).optional(),
  rewardPoints: z.coerce.number().int().min(0).optional(),
}).superRefine((d, ctx) => {
  if (d.currentOutstanding > d.creditLimit) {
    ctx.addIssue({ code: "custom", path: ["currentOutstanding"], message: "Outstanding cannot exceed the credit limit" })
  }
})

export type CardCreateInput = z.infer<typeof cardCreateSchema>
