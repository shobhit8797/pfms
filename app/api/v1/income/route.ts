import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { serializeDecimals } from "@/lib/utils"
import { incomeCreateSchema } from "@pfms/shared"
import { listIncome, createIncome } from "@/lib/services/income.service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, async (userId) => {
    const q = new URL(request.url).searchParams
    const limit = Math.min(200, Number(q.get("limit") ?? 50))
    const offset = Number(q.get("offset") ?? 0)
    return serializeDecimals(await listIncome(userId, limit, offset))
  })
}

export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = incomeCreateSchema.safeParse(body)
    if (!parsed.success) throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    return serializeDecimals(await createIncome(userId, parsed.data))
  })
}
