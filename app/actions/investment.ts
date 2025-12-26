"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { AssetClass, Investment } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const investmentSchema = z.object({
  assetClass: z.nativeEnum(AssetClass),
  assetName: z.string().min(1, "Asset name is required"),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  purchasePrice: z.coerce.number().positive("Purchase price must be positive"),
  purchaseDate: z.string().transform((str) => new Date(str)),
  currentPrice: z.coerce.number().optional(),
  maturityDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  notes: z.string().optional(),
})

export type InvestmentState = {
  error?: string
  success?: string
}

export async function createInvestment(prevState: InvestmentState | undefined, formData: FormData): Promise<InvestmentState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const rawData = {
    assetClass: formData.get("assetClass"),
    assetName: formData.get("assetName"),
    quantity: formData.get("quantity"),
    purchasePrice: formData.get("purchasePrice"),
    purchaseDate: formData.get("purchaseDate"),
    currentPrice: formData.get("currentPrice") || undefined,
    maturityDate: formData.get("maturityDate") || undefined,
    notes: formData.get("notes"),
  }

  const validated = investmentSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: "Invalid input data" }
  }

  const data = validated.data
  const currentValue = data.currentPrice ? (data.currentPrice * data.quantity) : (data.purchasePrice * data.quantity)

  try {
    await prisma.investment.create({
      data: {
        userId: session.user.id,
        ...data,
        currentValue,
      },
    })

    revalidatePath("/dashboard/investments")
    return { success: "Investment added successfully" }
  } catch (error) {
    console.error("Create investment error:", error)
    return { error: "Failed to create investment" }
  }
}

export async function getInvestments(): Promise<Investment[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  return await prisma.investment.findMany({
    where: { userId: session.user.id },
    orderBy: { purchaseDate: "desc" },
  })
}
