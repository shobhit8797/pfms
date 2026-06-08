import { z } from "zod"
import { CategoryType, TxnSource, ReviewStatus } from "@prisma/client"

/**
 * Shared Zod schemas for the 50:30:20 tracker. Used by BOTH the Server Action
 * adapters (after FormData coercion) and the REST route handlers (JSON body),
 * so web and iOS validate identically.
 */

const categoryTypeEnum = z.nativeEnum(CategoryType)

export const budgetProfileSchema = z.object({
  monthlyIncome: z.coerce.number().positive("Monthly income must be positive"),
  needsPct: z.coerce.number().min(0).max(1).default(0.5),
  wantsPct: z.coerce.number().min(0).max(1).default(0.3),
  savingsPct: z.coerce.number().min(0).max(1).default(0.2),
  weeklyLimit: z.coerce.number().nonnegative().default(10000),
  annualGrowthPct: z.coerce.number().min(0).max(5).default(0.1),
  effectiveYear: z.coerce.number().int().min(2000).max(3000),
}).refine(
  (d) => Math.abs(d.needsPct + d.wantsPct + d.savingsPct - 1) < 0.001,
  { message: "Needs/Wants/Savings percentages must sum to 100%", path: ["needsPct"] }
)
export type BudgetProfileInput = z.infer<typeof budgetProfileSchema>

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(60),
  type: categoryTypeEnum,
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color").default("#64748b"),
  icon: z.string().min(1).default("Tag"),
})
export type CategoryInput = z.infer<typeof categorySchema>

export const paymentModeSchema = z.object({
  name: z.string().min(1, "Name is required").max(60),
})
export type PaymentModeInput = z.infer<typeof paymentModeSchema>

export const transactionSchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1, "Description is required").max(280),
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  paymentModeId: z.string().optional().nullable(),
  // Optional override; when omitted the service derives type from the category.
  type: categoryTypeEnum.optional(),
  notes: z.string().max(2000).optional().nullable(),
  source: z.nativeEnum(TxnSource).optional(),
  receiptIds: z.array(z.string()).optional(),
})
export type TransactionInput = z.infer<typeof transactionSchema>

export const transactionUpdateSchema = transactionSchema.partial()
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>

/** A single edited staged row submitted from the review table. */
export const stagedReviewSchema = z.object({
  id: z.string(),
  rawDate: z.coerce.date().optional().nullable(),
  rawDescription: z.string().min(1).optional(),
  rawAmount: z.coerce.number().positive().optional(),
  suggestedCategoryId: z.string().optional().nullable(),
  suggestedPaymentModeId: z.string().optional().nullable(),
  suggestedType: categoryTypeEnum.optional().nullable(),
  reviewStatus: z.nativeEnum(ReviewStatus).optional(),
})
export type StagedReviewInput = z.infer<typeof stagedReviewSchema>

export const bulkReviewSchema = z.object({
  rows: z.array(stagedReviewSchema),
})
export type BulkReviewInput = z.infer<typeof bulkReviewSchema>
