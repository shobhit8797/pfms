/**
 * Minimal Gmail REST client (raw fetch). Used by the background sync to pull
 * transaction emails and hand their text to the message parser. Read-only.
 */

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

export type GmailHeader = { name: string; value: string }
export type GmailPart = {
  mimeType?: string
  filename?: string
  headers?: GmailHeader[]
  body?: { data?: string; size?: number }
  parts?: GmailPart[]
}
export type GmailMessage = {
  id: string
  threadId?: string
  snippet?: string
  internalDate?: string // epoch ms as string
  payload?: GmailPart
}

export type ParsedEmail = {
  id: string
  from: string | null
  subject: string | null
  date: Date
  /** Best-effort plain text of the email body (HTML stripped if needed). */
  body: string
}

function decodeB64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8")
}

/** Collapses HTML to readable text (drop scripts/styles/tags, decode a few entities). */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|tr|li|h[1-6]|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Walks a Gmail payload tree and returns the best text body (prefers text/plain). */
export function extractBody(payload?: GmailPart): string {
  if (!payload) return ""
  let plain = ""
  let html = ""
  const walk = (part: GmailPart) => {
    const mime = part.mimeType ?? ""
    if (part.body?.data) {
      if (mime === "text/plain") plain += decodeB64Url(part.body.data) + "\n"
      else if (mime === "text/html") html += decodeB64Url(part.body.data) + "\n"
    }
    part.parts?.forEach(walk)
  }
  walk(payload)
  if (plain.trim()) return plain.trim()
  if (html.trim()) return stripHtml(html)
  return ""
}

function header(headers: GmailHeader[] | undefined, name: string): string | null {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null
}

async function gmailFetch<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GMAIL_BASE}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Gmail API ${res.status}: ${body.slice(0, 300)}`)
  }
  return (await res.json()) as T
}

/** Lists message ids matching a Gmail search query (newest first). */
export async function listMessageIds(accessToken: string, query: string, max = 25): Promise<string[]> {
  const q = new URLSearchParams({ q: query, maxResults: String(max) })
  const data = await gmailFetch<{ messages?: { id: string }[] }>(accessToken, `/messages?${q.toString()}`)
  return (data.messages ?? []).map((m) => m.id)
}

/**
 * One page of message ids for a query, with the token for the next page (when
 * Gmail has more results). Used to walk *all* matches during a backfill, where
 * the single-page `listMessageIds` cap would otherwise hide older mail.
 */
export async function listMessageIdsPage(
  accessToken: string,
  query: string,
  max = 100,
  pageToken?: string
): Promise<{ ids: string[]; nextPageToken?: string }> {
  const q = new URLSearchParams({ q: query, maxResults: String(max) })
  if (pageToken) q.set("pageToken", pageToken)
  const data = await gmailFetch<{ messages?: { id: string }[]; nextPageToken?: string }>(
    accessToken,
    `/messages?${q.toString()}`
  )
  return { ids: (data.messages ?? []).map((m) => m.id), nextPageToken: data.nextPageToken }
}

/** Fetches one message and parses out the headers + readable body. */
export async function getParsedMessage(accessToken: string, id: string): Promise<ParsedEmail> {
  const m = await gmailFetch<GmailMessage>(accessToken, `/messages/${id}?format=full`)
  const headers = m.payload?.headers
  const date = m.internalDate ? new Date(Number(m.internalDate)) : new Date()
  return {
    id: m.id,
    from: header(headers, "From"),
    subject: header(headers, "Subject"),
    date,
    body: extractBody(m.payload) || m.snippet || "",
  }
}
