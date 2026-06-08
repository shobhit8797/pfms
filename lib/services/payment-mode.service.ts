import { prisma } from "@/lib/db"
import { notFound } from "@/lib/errors"
import type { PaymentModeInput } from "@/lib/validation/budget"

export async function listPaymentModes(userId: string, includeArchived = false) {
  return prisma.paymentMode.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: { name: "asc" },
  })
}

export async function getPaymentModeOrThrow(userId: string, id: string) {
  const mode = await prisma.paymentMode.findFirst({
    where: { id, userId, deletedAt: null },
  })
  if (!mode) throw notFound("Payment mode not found")
  return mode
}

export async function createPaymentMode(userId: string, input: PaymentModeInput) {
  return prisma.paymentMode.create({ data: { ...input, userId } })
}

export async function updatePaymentMode(userId: string, id: string, input: Partial<PaymentModeInput>) {
  await getPaymentModeOrThrow(userId, id)
  return prisma.paymentMode.update({ where: { id }, data: input })
}

export async function archivePaymentMode(userId: string, id: string, isArchived = true) {
  await getPaymentModeOrThrow(userId, id)
  return prisma.paymentMode.update({ where: { id }, data: { isArchived } })
}
