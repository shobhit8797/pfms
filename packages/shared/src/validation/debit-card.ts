import { z } from "zod"

export const CARD_NETWORKS = ["VISA", "MASTERCARD", "RUPAY", "MAESTRO", "AMEX"] as const
export type CardNetwork = (typeof CARD_NETWORKS)[number]

export const debitCardCreateSchema = z.object({
  cardName: z.string().min(1, "Card name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  lastFourDigits: z.string().regex(/^\d{4}$/, "Enter the last 4 digits"),
  cardNetwork: z.string().optional().nullable(),
  bankAccountId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type DebitCardCreateInput = z.infer<typeof debitCardCreateSchema>
export const debitCardUpdateSchema = debitCardCreateSchema.partial()
export type DebitCardUpdateInput = z.infer<typeof debitCardUpdateSchema>
