import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { prisma } from "@/lib/db"
import { debitCardCreateSchema } from "@pfms/shared"

export const runtime = "nodejs"

/** List active debit cards for the authenticated user. */
export async function GET(request: Request) {
  return withApiUser(request, async (userId) => {
    const cards = await prisma.debitCard.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, cardName: true, bankName: true, lastFourDigits: true, cardNetwork: true, bankAccountId: true, isActive: true, notes: true, createdAt: true },
    })
    return { items: cards }
  })
}

/** Create a new debit card for the authenticated user. */
export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = debitCardCreateSchema.safeParse(body)
    if (!parsed.success) throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")

    const d = parsed.data

    if (d.bankAccountId) {
      const account = await prisma.bankAccount.findFirst({ where: { id: d.bankAccountId, userId }, select: { id: true } })
      if (!account) throw new ServiceError("VALIDATION", "Bank account not found")
    }

    const card = await prisma.debitCard.create({
      data: {
        userId,
        cardName: d.cardName,
        bankName: d.bankName,
        lastFourDigits: d.lastFourDigits,
        cardNetwork: d.cardNetwork ?? null,
        bankAccountId: d.bankAccountId ?? null,
        notes: d.notes ?? null,
      },
    })
    return card
  })
}
