import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { serializeDecimals } from "@/lib/utils"
import { prisma } from "@/lib/db"
import { listCardsForPicker } from "@/lib/services/picker.service"
import { cardCreateSchema } from "@pfms/shared"

export const runtime = "nodejs"

/** List credit cards (full details for management + expense picker). */
export async function GET(request: Request) {
  return withApiUser(request, async (userId) => serializeDecimals(await listCardsForPicker(userId)))
}

/** Create a new credit card for the authenticated user. */
export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = cardCreateSchema.safeParse(body)
    if (!parsed.success) throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")

    const d = parsed.data
    const card = await prisma.creditCard.create({
      data: {
        userId,
        cardName: d.cardName,
        bankName: d.bankName,
        lastFourDigits: d.lastFourDigits,
        creditLimit: d.creditLimit,
        currentOutstanding: d.currentOutstanding,
        availableCredit: d.creditLimit - d.currentOutstanding,
        billingDate: d.billingDate,
        dueDate: d.dueDate,
        interestRate: d.interestRate ?? null,
        rewardPoints: d.rewardPoints ?? 0,
      },
    })
    return serializeDecimals(card)
  })
}
