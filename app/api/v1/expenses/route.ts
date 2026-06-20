import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { serializeDecimals } from "@/lib/utils"
import { expenseCreateSchema } from "@pfms/shared"
import { listExpenses, createExpense, type ExpenseFilters } from "@/lib/services/expense.service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, async (userId) => {
    const q = new URL(request.url).searchParams
    const filters: ExpenseFilters = {
      search: q.get("search") ?? undefined,
      from: q.get("from") ? new Date(q.get("from")!) : undefined,
      to: q.get("to") ? new Date(q.get("to")!) : undefined,
    }
    const limit = Math.min(200, Number(q.get("limit") ?? 50))
    const offset = Number(q.get("offset") ?? 0)
    return serializeDecimals(await listExpenses(userId, filters, limit, offset))
  })
}

export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = expenseCreateSchema.safeParse(body)
    if (!parsed.success) throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    return serializeDecimals(await createExpense(userId, parsed.data))
  })
}
