import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { serializeDecimals } from "@/lib/utils"
import { messageIngestSchema, INBOUND_MESSAGE_STATUSES, type InboundMessageStatus } from "@pfms/shared"
import { ingestMessage, listMessages } from "@/lib/services/message.service"

export const runtime = "nodejs"

/**
 * GET  → the review queue (defaults to PENDING_REVIEW).
 * POST → capture a raw transaction message. This is the endpoint an iOS
 *        Shortcut automation POSTs to (bearer token in the Authorization header).
 */
export async function GET(request: Request) {
  return withApiUser(request, async (userId) => {
    const q = new URL(request.url).searchParams
    const raw = q.get("status") ?? "PENDING_REVIEW"
    const status = (INBOUND_MESSAGE_STATUSES as readonly string[]).includes(raw)
      ? (raw as InboundMessageStatus)
      : "PENDING_REVIEW"
    const limit = Math.min(200, Number(q.get("limit") ?? 50))
    return serializeDecimals(await listMessages(userId, status, limit))
  })
}

export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = messageIngestSchema.safeParse(body)
    if (!parsed.success) throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    return serializeDecimals(await ingestMessage(userId, parsed.data))
  })
}
