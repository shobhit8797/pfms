import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { paymentModeSchema } from "@/lib/validation/budget"
import { listPaymentModes, createPaymentMode } from "@/lib/services/payment-mode.service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, (userId) => {
    const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true"
    return listPaymentModes(userId, includeArchived)
  })
}

export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = paymentModeSchema.safeParse(body)
    if (!parsed.success) {
      throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    }
    return createPaymentMode(userId, parsed.data)
  })
}
