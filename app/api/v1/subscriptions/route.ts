import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { serializeDecimals } from "@/lib/utils"
import { subscriptionCreateSchema } from "@pfms/shared"
import { listSubscriptions, createSubscription } from "@/lib/services/subscription.service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, async (userId) => {
    const q = new URL(request.url).searchParams
    const includeInactive = q.get("includeInactive") === "1" || q.get("includeInactive") === "true"
    return serializeDecimals(await listSubscriptions(userId, { includeInactive }))
  })
}

export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = subscriptionCreateSchema.safeParse(body)
    if (!parsed.success) throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    return serializeDecimals(await createSubscription(userId, parsed.data))
  })
}
