import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { serializeDecimals } from "@/lib/utils"
import { expenseUpdateSchema } from "@pfms/shared"
import { getExpenseOrThrow, updateExpense, deleteExpense } from "@/lib/services/expense.service"

export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, async (userId) => serializeDecimals(await getExpenseOrThrow(userId, id)))
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = expenseUpdateSchema.safeParse(body)
    if (!parsed.success) throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    return serializeDecimals(await updateExpense(userId, id, parsed.data))
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, (userId) => deleteExpense(userId, id))
}
