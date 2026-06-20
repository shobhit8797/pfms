/**
 * Minimal server-side OpenRouter client. The API key NEVER leaves the server.
 * Uses the Chat Completions endpoint with strict json_schema structured output.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

export const DEFAULT_TEXT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"
export const DEFAULT_VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || "openai/gpt-4o"

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
        | { type: "file"; file: { filename: string; file_data: string } }
      >
}

export type OpenRouterUsage = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  cost?: number
}

export type ChatJsonResult = {
  /** Raw assistant message content (expected to be JSON text). */
  content: string
  usage: OpenRouterUsage
  model: string
}

export class OpenRouterError extends Error {}

/**
 * Calls OpenRouter with a strict JSON schema and returns the raw JSON text plus
 * usage/cost. Caller is responsible for parsing + validating the content.
 */
export async function chatJson(opts: {
  model: string
  messages: ChatMessage[]
  schemaName: string
  schema: Record<string, unknown>
  temperature?: number
  /** OpenRouter plugins (e.g. the file-parser for PDF inputs). */
  plugins?: Record<string, unknown>[]
}): Promise<ChatJsonResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new OpenRouterError("OPENROUTER_API_KEY is not configured")

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL || "https://pfms.local",
      "X-Title": "PFMS Statement Import",
    },
    body: JSON.stringify({
      model: opts.model,
      temperature: opts.temperature ?? 0,
      messages: opts.messages,
      ...(opts.plugins ? { plugins: opts.plugins } : {}),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: opts.schemaName,
          strict: true,
          schema: opts.schema,
        },
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new OpenRouterError(`OpenRouter request failed (${res.status}): ${body.slice(0, 500)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
    usage?: OpenRouterUsage
    model?: string
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) throw new OpenRouterError("OpenRouter returned no content")

  return {
    content,
    usage: data.usage ?? {},
    model: data.model ?? opts.model,
  }
}
