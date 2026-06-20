import { z } from "zod"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { PAYMENT_METHODS } from "@pfms/shared"
import { chatJson, type ChatMessage, type OpenRouterUsage } from "./openrouter"
import { llmConfig } from "./config"

/**
 * Receipt / invoice extraction from a single image or PDF (as a data URL),
 * returning the structured fields used to pre-fill an expense form. Nothing here
 * writes to the DB — the user reviews and edits the values before saving.
 *
 * The provider + model are chosen in `lib/llm/config.ts` (`llmConfig.receiptScan`):
 *   - "openrouter": sends the receipt to a model via OpenRouter.
 *   - "gemini": calls Google's Gemini SDK directly.
 * Both validate the structured output with the same Zod schema and retry once.
 */

export type ReceiptExtraction = {
  amount: number | null
  description: string | null
  category: string | null
  paymentMethod: (typeof PAYMENT_METHODS)[number] | null
  expenseDate: string | null
  merchant: string | null
}

export type ReceiptExtractionResult = {
  fields: ReceiptExtraction
  usage: OpenRouterUsage
  model: string
}

const SCHEMA_NAME = "receipt_extraction"

/** Strict JSON schema sent to OpenRouter (every prop required; nullable via unions). */
const RECEIPT_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["amount", "description", "category", "paymentMethod", "expenseDate", "merchant"],
  properties: {
    amount: { type: ["number", "null"], description: "Grand total actually paid, positive number" },
    description: { type: ["string", "null"], description: "Short human description of the purchase" },
    category: { type: ["string", "null"], description: "Single concise spend category, e.g. Food, Groceries, Travel, Fuel, Shopping, Utilities, Health" },
    paymentMethod: { type: ["string", "null"], enum: [...PAYMENT_METHODS, null] },
    expenseDate: { type: ["string", "null"], description: "ISO 8601 date (YYYY-MM-DD) of the transaction, or null" },
    merchant: { type: ["string", "null"], description: "Merchant / vendor name" },
  },
}

const responseSchema = z.object({
  amount: z.number().positive().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
  expenseDate: z.string().nullable(),
  merchant: z.string().nullable(),
})

const SYSTEM_PROMPT = [
  "You are a precise receipt and invoice data extractor.",
  "Read the attached receipt/invoice (image or PDF) and output ONLY JSON matching the schema.",
  "Rules:",
  "- `amount` is the final grand total paid (after taxes/tips/discounts), as a positive number. Use null if unreadable.",
  "- `description` is a short, human-friendly summary (e.g. 'Dinner at Olive Bistro', 'Uber ride', 'Monthly groceries').",
  `- \`category\` is ONE concise spend category. Prefer common ones: Food, Groceries, Travel, Fuel, Shopping, Utilities, Health, Entertainment, Rent, Other.`,
  `- \`paymentMethod\` must be one of ${PAYMENT_METHODS.join(", ")} or null. Map: card/visa/mastercard -> CREDIT_CARD; upi/gpay/phonepe/paytm -> UPI; cash -> CASH; bank/neft/imps -> BANK_TRANSFER; otherwise OTHER or null.`,
  "- `expenseDate` in ISO 8601 (YYYY-MM-DD); null if you cannot determine it.",
  "- `merchant` is the store/vendor name, or null.",
  "- Never invent values. If a field is not present, use null.",
].join("\n")

const USER_INSTRUCTION_IMAGE = "Extract the expense fields from this receipt image."
const USER_INSTRUCTION_PDF = "Extract the expense fields from this receipt/invoice PDF."
const STRICT_RETRY = "Your previous response was not valid JSON for the schema. Return ONLY valid JSON matching the schema, no prose or markdown."

function isPdfDataUrl(dataUrl: string): boolean {
  return /^data:application\/pdf/i.test(dataUrl)
}

/** Splits a base64 data URL into its MIME type and raw base64 payload. */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([^;,]+)(?:;base64)?,([\s\S]*)$/.exec(dataUrl)
  if (!match) throw new Error("Invalid receipt data URL")
  return { mimeType: match[1], data: match[2] }
}

/** image/* -> image_url part; application/pdf -> file part (parsed natively). */
function attachmentPart(dataUrl: string): ChatMessage["content"] {
  if (isPdfDataUrl(dataUrl)) {
    return [
      { type: "text", text: USER_INSTRUCTION_PDF },
      { type: "file", file: { filename: "receipt.pdf", file_data: dataUrl } },
    ]
  }
  return [
    { type: "text", text: USER_INSTRUCTION_IMAGE },
    { type: "image_url", image_url: { url: dataUrl } },
  ]
}

function parseAndValidate(content: string): ReceiptExtraction {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim()
  return responseSchema.parse(JSON.parse(cleaned))
}

type RawCompletion = { content: string; usage: OpenRouterUsage; model: string }

/** Reads the receipt via OpenRouter (model from config). */
async function callOpenRouter(dataUrl: string, strict: boolean): Promise<RawCompletion> {
  const cfg = llmConfig.receiptScan
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: attachmentPart(dataUrl) },
    ...(strict ? [{ role: "user", content: STRICT_RETRY } as ChatMessage] : []),
  ]
  // PDFs route through OpenRouter's file-parser plugin (model parses natively).
  const plugins = isPdfDataUrl(dataUrl) ? [{ id: "file-parser", pdf: { engine: "native" } }] : undefined
  const res = await chatJson({
    model: cfg.openrouterModel,
    messages,
    schemaName: SCHEMA_NAME,
    schema: RECEIPT_JSON_SCHEMA,
    plugins,
    temperature: cfg.temperature,
  })
  return { content: res.content, usage: res.usage, model: res.model }
}

/** Reads the receipt via Google's Gemini SDK directly (model from config). */
async function callGemini(dataUrl: string, strict: boolean): Promise<RawCompletion> {
  const cfg = llmConfig.receiptScan
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured")

  const { mimeType, data } = parseDataUrl(dataUrl)
  const instruction = mimeType === "application/pdf" ? USER_INSTRUCTION_PDF : USER_INSTRUCTION_IMAGE
  const prompt = `${SYSTEM_PROMPT}\n\n${instruction}${strict ? `\n\n${STRICT_RETRY}` : ""}`

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: cfg.geminiModel,
    generationConfig: { temperature: cfg.temperature, responseMimeType: "application/json" },
  })
  const result = await model.generateContent([{ text: prompt }, { inlineData: { mimeType, data } }])
  const um = result.response.usageMetadata
  return {
    content: result.response.text(),
    usage: um
      ? { prompt_tokens: um.promptTokenCount, completion_tokens: um.candidatesTokenCount, total_tokens: um.totalTokenCount }
      : {},
    model: cfg.geminiModel,
  }
}

/**
 * Extract expense fields from a receipt image or PDF (passed as a data URL).
 * Routes to the provider configured in `llmConfig.receiptScan`, validates the
 * structured output, and retries exactly once before throwing.
 */
export async function extractReceipt(dataUrl: string): Promise<ReceiptExtractionResult> {
  const { provider } = llmConfig.receiptScan
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    const strict = attempt > 0
    try {
      const raw = provider === "gemini" ? await callGemini(dataUrl, strict) : await callOpenRouter(dataUrl, strict)
      return { fields: parseAndValidate(raw.content), usage: raw.usage, model: raw.model }
    } catch (err) {
      lastError = err
    }
  }

  throw new Error(
    `Receipt extraction failed (provider=${provider}) after retry: ${(lastError as Error)?.message ?? "unknown"}`
  )
}
