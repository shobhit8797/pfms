import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { serializeDecimals } from "@/lib/utils"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, async (userId) => {
    const existing = await prisma.creditCard.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) throw new ServiceError("NOT_FOUND", "Card not found")

    // Archive instead of hard-delete if the card has linked expenses/subscriptions.
    const [expenseCount, subCount] = await Promise.all([
      prisma.expense.count({ where: { userId, creditCardId: id } }),
      prisma.subscription.count({ where: { userId, creditCardId: id } }),
    ])
    if (expenseCount > 0 || subCount > 0) {
      const card = await prisma.creditCard.update({ where: { id }, data: { isActive: false } })
      return { ...serializeDecimals(card), archived: true }
    }

    await prisma.creditCard.delete({ where: { id } })
    return { ok: true as const }
  })
}
