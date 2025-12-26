"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { CreditCard } from "@prisma/client"

export async function getCreditCards(): Promise<CreditCard[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  return await prisma.creditCard.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  })
}
