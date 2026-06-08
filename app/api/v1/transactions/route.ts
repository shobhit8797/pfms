import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { transactionSchema } from "@/lib/validation/budget"
import {
  listTransactions,
  createTransaction,
  type TransactionFilters,
} from "@/lib/services/transaction.service"
import type { CategoryType } from "@prisma/client"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, (userId) => {
    const url = new URL(request.url)
    const q = url.searchParams
    const filters: TransactionFilters = {
      categoryId: q.get("categoryId") ?? undefined,
      paymentModeId: q.get("paymentModeId") ?? undefined,
      type: (q.get("type") as CategoryType) ?? undefined,
      from: q.get("from") ? new Date(q.get("from")!) : undefined,
      to: q.get("to") ? new Date(q.get("to")!) : undefined,
      search: q.get("search") ?? undefined,
    }
    const limit = Math.min(200, Number(q.get("limit") ?? 50))
    const offset = Number(q.get("offset") ?? 0)
    return listTransactions(userId, filters, limit, offset)
  })
}

export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = transactionSchema.safeParse(body)
    if (!parsed.success) {
      throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    }
    return createTransaction(userId, parsed.data)
  })
}
