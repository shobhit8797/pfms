import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { transactionUpdateSchema } from "@/lib/validation/budget"
import {
  getTransactionOrThrow,
  updateTransaction,
  softDeleteTransaction,
} from "@/lib/services/transaction.service"

export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, (userId) => getTransactionOrThrow(userId, id))
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = transactionUpdateSchema.safeParse(body)
    if (!parsed.success) {
      throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    }
    return updateTransaction(userId, id, parsed.data)
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, (userId) => softDeleteTransaction(userId, id))
}
