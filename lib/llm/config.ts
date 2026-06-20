/**
 * Central LLM configuration — the single place to control which AI provider and
 * model handles each AI task. Edit the inline defaults here, or override any
 * value with the matching env var (env wins when set), without touching the
 * call-site code.
 *
 * This is the TypeScript equivalent of the "config.py" idea: a plain, editable
 * config module. The runtime reads from `llmConfig`; the providers it can pick
 * are defined by `LlmProvider`.
 *
 * NOTE: this is server-only. Never import it into client/React Native code —
 * provider keys must stay on the server.
 */

/** Backends a task can be routed through. */
export type LlmProvider =
  | "openrouter" // OpenAI-compatible gateway; routes any model (incl. Gemini) via OPENROUTER_API_KEY
  | "gemini" //     Google's official Gemini SDK (@google/generative-ai) via GEMINI_API_KEY

function readProvider(value: string | undefined, fallback: LlmProvider): LlmProvider {
  return value === "openrouter" || value === "gemini" ? value : fallback
}

export const llmConfig = {
  /**
   * Receipt / expense extraction ("expense scan") from a photo or PDF on mobile.
   * Switch `provider` to change how the receipt is read:
   *   - "openrouter" (default): sends the image/PDF to a model through OpenRouter.
   *   - "gemini": calls Google's Gemini SDK directly.
   * `model` is read per-provider so you can keep both configured and just flip
   * the provider. Set the corresponding API key (OPENROUTER_API_KEY / GEMINI_API_KEY).
   */
  receiptScan: {
    provider: readProvider(process.env.RECEIPT_SCAN_PROVIDER, "openrouter"),

    /** OpenRouter model id (namespaced), used when provider === "openrouter". */
    openrouterModel:
      process.env.RECEIPT_SCAN_OPENROUTER_MODEL ??
      process.env.OPENROUTER_RECEIPT_MODEL ?? // legacy name, kept for back-compat
      "google/gemini-3.1-flash-lite",

    /** Gemini SDK model id (bare), used when provider === "gemini". */
    geminiModel: process.env.RECEIPT_SCAN_GEMINI_MODEL ?? "gemini-flash-latest",

    temperature: 0,
  },

  /**
   * Bank/UPI transaction-SMS parsing (`lib/llm/message.ts`). Text-only — no
   * vision — so it can use a cheap, fast model. Routed through OpenRouter
   * (Gemini direct is also supported for parity with receiptScan).
   * Env overrides: MESSAGE_PARSE_PROVIDER, MESSAGE_PARSE_OPENROUTER_MODEL,
   * MESSAGE_PARSE_GEMINI_MODEL.
   */
  messageParse: {
    provider: readProvider(process.env.MESSAGE_PARSE_PROVIDER, "openrouter"),
    openrouterModel: process.env.MESSAGE_PARSE_OPENROUTER_MODEL ?? "google/gemini-3.1-flash-lite",
    geminiModel: process.env.MESSAGE_PARSE_GEMINI_MODEL ?? "gemini-flash-latest",
    temperature: 0,
  },
} as const
