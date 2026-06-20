import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { serializeDecimals } from "@/lib/utils"
import { messageResolveSchema } from "@pfms/shared"
import { resolveMessage } from "@/lib/services/message.service"

export const runtime = "nodejs"

/**
 * Resolve a queued message: save it as an expense/income (recording the learned
 * category + receipt preference for the merchant), or dismiss/ignore it.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = messageResolveSchema.safeParse(body)
    if (!parsed.success) throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    return serializeDecimals(await resolveMessage(userId, id, parsed.data))
  })
}
