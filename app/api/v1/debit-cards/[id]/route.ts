import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiUser(request, async (userId) => {
    const { id } = await params
    const card = await prisma.debitCard.findFirst({ where: { id, userId } })
    if (!card) throw new ServiceError("NOT_FOUND", "Debit card not found")

    const expenseCount = await prisma.expense.count({ where: { userId, debitCardId: id } })
    if (expenseCount > 0) {
      const archived = await prisma.debitCard.update({ where: { id }, data: { isActive: false } })
      return { ...archived, archived: true }
    }

    await prisma.debitCard.delete({ where: { id } })
    return { ok: true }
  })
}
