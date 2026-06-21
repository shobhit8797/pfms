import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { serializeDecimals } from "@/lib/utils"
import { subscriptionUpdateSchema } from "@pfms/shared"
import {
  getSubscriptionOrThrow,
  getMonthGrid,
  updateSubscription,
  deleteSubscription,
} from "@/lib/services/subscription.service"

export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, async (userId) => {
    const [subscription, months] = await Promise.all([
      getSubscriptionOrThrow(userId, id),
      getMonthGrid(userId, id),
    ])
    return serializeDecimals({ subscription, months })
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = subscriptionUpdateSchema.safeParse(body)
    if (!parsed.success) throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    return serializeDecimals(await updateSubscription(userId, id, parsed.data))
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, (userId) => deleteSubscription(userId, id))
}
