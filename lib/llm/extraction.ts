import { z } from "zod"
import {
  chatJson,
  DEFAULT_TEXT_MODEL,
  DEFAULT_VISION_MODEL,
  type ChatMessage,
  type OpenRouterUsage,
} from "./openrouter"

/**
 * Bank-statement extraction via OpenRouter. Returns structured rows that the
 * import service stages for mandatory human review — nothing here writes to the
 * ledger.
 */

export type ExtractedRow = {
  date: string | null
  description: string
  amount: number
  direction: "DEBIT" | "CREDIT"
  suggestedCategoryId: string | null
  suggestedPaymentModeId: string | null
  suggestedType: "NEED" | "WANT" | "SAVING" | null
  confidence: number
}

export type ExtractionResult = {
  rows: ExtractedRow[]
  usage: OpenRouterUsage
  model: string
}

export type CategoryHint = { id: string; name: string; type: "NEED" | "WANT" | "SAVING" }
export type PaymentModeHint = { id: string; name: string }

const SCHEMA_NAME = "bank_statement_extraction"

/** Strict JSON schema sent to OpenRouter (every prop required; nullable via unions). */
export const EXTRACTION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["transactions"],
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "date",
          "description",
          "amount",
          "direction",
          "suggestedCategoryId",
          "suggestedPaymentModeId",
          "suggestedType",
          "confidence",
        ],
        properties: {
          date: { type: ["string", "null"], description: "ISO 8601 date (YYYY-MM-DD) or null" },
          description: { type: "string" },
          amount: { type: "number", description: "Always positive" },
          direction: { type: "string", enum: ["DEBIT", "CREDIT"] },
          suggestedCategoryId: { type: ["string", "null"] },
          suggestedPaymentModeId: { type: ["string", "null"] },
          suggestedType: { type: ["string", "null"], enum: ["NEED", "WANT", "SAVING", null] },
          confidence: { type: "number", description: "0..1" },
        },
      },
    },
  },
}

const rowSchema = z.object({
  date: z.string().nullable(),
  description: z.string(),
  amount: z.number(),
  direction: z.enum(["DEBIT", "CREDIT"]),
  suggestedCategoryId: z.string().nullable(),
  suggestedPaymentModeId: z.string().nullable(),
  suggestedType: z.enum(["NEED", "WANT", "SAVING"]).nullable(),
  confidence: z.number(),
})
const responseSchema = z.object({ transactions: z.array(rowSchema) })

function systemPrompt(categories: CategoryHint[], paymentModes: PaymentModeHint[]): string {
  return [
    "You are a precise bank-statement transaction extractor.",
    "Output ONLY JSON matching the provided schema. Do not invent transactions.",
    "Rules:",
    "- One object per transaction line.",
    "- `direction` is DEBIT for money leaving the account, CREDIT for money received.",
    "- `amount` is always a positive number.",
    "- `date` in ISO 8601 (YYYY-MM-DD); use null if you truly cannot determine it.",
    "- Suggest `suggestedCategoryId` from the user's categories when the merchant/description clearly matches; otherwise null.",
    "- `suggestedType` should match the chosen category's type, else null.",
    "- Suggest `suggestedPaymentModeId` only when the statement makes the method obvious (e.g. UPI, card); else null.",
    "- `confidence` reflects your certainty about the row (0..1).",
    "",
    `User categories: ${JSON.stringify(categories)}`,
    `User payment modes: ${JSON.stringify(paymentModes)}`,
  ].join("\n")
}

function parseAndValidate(content: string): ExtractedRow[] {
  // Strip accidental markdown fences before parsing.
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim()
  const json = JSON.parse(cleaned)
  const validated = responseSchema.parse(json)
  return validated.transactions
}

/**
 * Calls OpenRouter, validates the structured output, and retries exactly once
 * with a stricter instruction. Throws on a second failure (caller marks FAILED).
 */
async function runExtraction(
  baseMessages: ChatMessage[],
  model: string
): Promise<ExtractionResult> {
  let lastError: unknown
  let messages = baseMessages

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await chatJson({
      model,
      messages,
      schemaName: SCHEMA_NAME,
      schema: EXTRACTION_JSON_SCHEMA,
    })
    try {
      const rows = parseAndValidate(result.content)
      return { rows, usage: result.usage, model: result.model }
    } catch (err) {
      lastError = err
      messages = [
        ...baseMessages,
        {
          role: "user",
          content:
            "Your previous response was not valid JSON for the schema. Return ONLY valid JSON matching the schema, with no prose or markdown.",
        },
      ]
    }
  }

  throw new Error(
    `Extraction failed to produce valid JSON after retry: ${(lastError as Error)?.message ?? "unknown"}`
  )
}

/** Extract from plain text (CSV-as-text or PDF-extracted text). */
export async function extractFromText(
  text: string,
  categories: CategoryHint[],
  paymentModes: PaymentModeHint[]
): Promise<ExtractionResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(categories, paymentModes) },
    {
      role: "user",
      content: `Extract every transaction from this bank statement text:\n\n${text.slice(0, 30000)}`,
    },
  ]
  return runExtraction(messages, DEFAULT_TEXT_MODEL)
}

/** Extract from a statement image (scanned PDF page / photo) via a vision model. */
export async function extractFromImage(
  imageUrl: string,
  categories: CategoryHint[],
  paymentModes: PaymentModeHint[]
): Promise<ExtractionResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(categories, paymentModes) },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract every transaction visible in this bank statement image." },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ]
  return runExtraction(messages, DEFAULT_VISION_MODEL)
}
