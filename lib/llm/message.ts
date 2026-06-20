import { z } from "zod"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { PAYMENT_METHODS } from "@pfms/shared"
import { chatJson, type ChatMessage, type OpenRouterUsage } from "./openrouter"
import { llmConfig } from "./config"

/**
 * Bank / UPI transaction-SMS parsing. Takes the raw text of a message (e.g.
 * "Rs.499.00 debited from a/c XX1234 on 19-06-26 to SWIGGY UPI Ref 4567") and
 * extracts the structured fields used to seed a review-queue card. Text-only —
 * no image input — so it routes through a cheap model.
 *
 * Provider + model come from `llmConfig.messageParse`. Same strict-JSON /
 * retry-once-then-throw pattern as the receipt extractor. Persists nothing.
 */

const DIRECTIONS = ["DEBIT", "CREDIT"] as const
export type TxnDirection = (typeof DIRECTIONS)[number]

export type MessageExtraction = {
  /** True only if this is an actual money-movement transaction (not OTP/promo/balance). */
  isTransaction: boolean
  amount: number | null
  /** Merchant / payee / counterparty, cleaned up (e.g. "Swiggy", "Amazon"). */
  merchant: string | null
  /** ISO 8601 date (YYYY-MM-DD) of the transaction, or null. */
  date: string | null
  paymentMethod: (typeof PAYMENT_METHODS)[number] | null
  direction: TxnDirection | null
  /** Masked account/card tail mentioned in the message, e.g. "XX1234". */
  accountHint: string | null
  /** Suggested concise spend category, or null. */
  category: string | null
  /** Model confidence 0..1 that the parse is correct. */
  confidence: number | null
}

export type MessageExtractionResult = {
  fields: MessageExtraction
  usage: OpenRouterUsage
  model: string
}

const SCHEMA_NAME = "transaction_message"

const MESSAGE_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "isTransaction",
    "amount",
    "merchant",
    "date",
    "paymentMethod",
    "direction",
    "accountHint",
    "category",
    "confidence",
  ],
  properties: {
    isTransaction: { type: "boolean", description: "true only for an actual debit/credit money movement; false for OTP, promotional, balance-enquiry, EMI-reminder or failed-txn messages" },
    amount: { type: ["number", "null"], description: "Transaction amount as a positive number, no currency symbol" },
    merchant: { type: ["string", "null"], description: "Merchant/payee/counterparty name, title-cased and cleaned (drop UPI ref ids, VPAs, codes)" },
    date: { type: ["string", "null"], description: "ISO 8601 date YYYY-MM-DD of the transaction, or null" },
    paymentMethod: { type: ["string", "null"], enum: [...PAYMENT_METHODS, null] },
    direction: { type: ["string", "null"], enum: [...DIRECTIONS, null] },
    accountHint: { type: ["string", "null"], description: "Masked account/card tail mentioned, e.g. 'XX1234' or 'ending 4321'" },
    category: { type: ["string", "null"], description: "One concise spend category guess (Food, Groceries, Travel, Fuel, Shopping, Utilities, Health, Entertainment, Rent, Other)" },
    confidence: { type: ["number", "null"], description: "0..1 confidence in this parse" },
  },
}

const responseSchema = z.object({
  isTransaction: z.boolean(),
  amount: z.number().positive().nullable(),
  merchant: z.string().nullable(),
  date: z.string().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
  direction: z.enum(DIRECTIONS).nullable(),
  accountHint: z.string().nullable(),
  category: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
})

const SYSTEM_PROMPT = [
  "You parse Indian bank/UPI transaction SMS, app notifications, AND transaction emails (order confirmations, payment receipts, bank alerts) into structured JSON. Output ONLY JSON matching the schema.",
  "The input may be a short SMS or a full email (possibly with headers, HTML, or marketing footer) — extract the single primary transaction and ignore boilerplate/signatures/promos.",
  "Rules:",
  "- Set `isTransaction` to false for OTPs, promotional offers, balance enquiries, EMI/bill reminders, payment requests, newsletters, and failed/declined transactions. For those, every other field may be null.",
  "- `amount` is the transacted amount as a positive number (strip 'Rs.', 'INR', commas).",
  "- `direction`: DEBIT for spent/paid/debited/withdrawn; CREDIT for received/credited/refund.",
  `- \`paymentMethod\` mapping: UPI/gpay/phonepe/paytm/VPA -> UPI; credit card/CC -> CREDIT_CARD; debit card -> DEBIT_CARD; a/c debited / NEFT/IMPS/ACH/net banking -> BANK_TRANSFER; ATM/cash -> CASH; else OTHER or null. Only use values present in the schema enum.`,
  "- `merchant` is the human payee/merchant. Strip UPI refs, VPAs (user@bank), transaction ids, and bank codes. e.g. 'SWIGGY' -> 'Swiggy', 'AMAZON PAY INDIA' -> 'Amazon'.",
  "- `accountHint` is the masked account/card tail if present (e.g. 'XX1234').",
  "- `category` is your best single-word guess for the spend category, or null.",
  "- `date` in ISO 8601 (YYYY-MM-DD). Indian SMS often use DD-MM-YY/DD-MM-YYYY; convert accordingly. null if absent.",
  "- Never invent values; use null when unsure. `confidence` reflects how certain the overall parse is.",
].join("\n")

const STRICT_RETRY = "Your previous response was not valid JSON for the schema. Return ONLY valid JSON matching the schema, no prose or markdown."

function parseAndValidate(content: string): MessageExtraction {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim()
  return responseSchema.parse(JSON.parse(cleaned))
}

type RawCompletion = { content: string; usage: OpenRouterUsage; model: string }

async function callOpenRouter(text: string, strict: boolean): Promise<RawCompletion> {
  const cfg = llmConfig.messageParse
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Parse this message:\n\n${text}` },
    ...(strict ? [{ role: "user", content: STRICT_RETRY } as ChatMessage] : []),
  ]
  const res = await chatJson({
    model: cfg.openrouterModel,
    messages,
    schemaName: SCHEMA_NAME,
    schema: MESSAGE_JSON_SCHEMA,
    temperature: cfg.temperature,
  })
  return { content: res.content, usage: res.usage, model: res.model }
}

async function callGemini(text: string, strict: boolean): Promise<RawCompletion> {
  const cfg = llmConfig.messageParse
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured")

  const prompt = `${SYSTEM_PROMPT}\n\nParse this message:\n\n${text}${strict ? `\n\n${STRICT_RETRY}` : ""}`
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: cfg.geminiModel,
    generationConfig: { temperature: cfg.temperature, responseMimeType: "application/json" },
  })
  const result = await model.generateContent(prompt)
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
 * Parse a transaction message into structured fields. Routes to the provider in
 * `llmConfig.messageParse`, validates, and retries exactly once before throwing.
 */
export async function extractTransactionMessage(text: string): Promise<MessageExtractionResult> {
  const { provider } = llmConfig.messageParse
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    const strict = attempt > 0
    try {
      const raw = provider === "gemini" ? await callGemini(text, strict) : await callOpenRouter(text, strict)
      return { fields: parseAndValidate(raw.content), usage: raw.usage, model: raw.model }
    } catch (err) {
      lastError = err
    }
  }

  throw new Error(
    `Message extraction failed (provider=${provider}) after retry: ${(lastError as Error)?.message ?? "unknown"}`
  )
}
