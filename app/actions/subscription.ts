"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Frequency, Subscription } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const subscriptionSchema = z.object({
  serviceName: z.string().min(1, "Service name is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  billingCycle: z.nativeEnum(Frequency),
  startDate: z.string().transform((str) => new Date(str)),
  nextBillingDate: z.string().transform((str) => new Date(str)),
  autoRenewal: z.boolean().optional(),
  category: z.string().min(1, "Category is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  notes: z.string().optional(),
})

export type SubscriptionState = {
  error?: string
  success?: string
}

export async function createSubscription(prevState: SubscriptionState | undefined, formData: FormData): Promise<SubscriptionState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const rawData = {
    serviceName: formData.get("serviceName"),
    amount: formData.get("amount"),
    billingCycle: formData.get("billingCycle"),
    startDate: formData.get("startDate"),
    nextBillingDate: formData.get("nextBillingDate"),
    autoRenewal: formData.get("autoRenewal") === "on",
    category: formData.get("category"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes"),
  }

  const validated = subscriptionSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: "Invalid input data" }
  }

  const data = validated.data

  try {
    await prisma.subscription.create({
      data: {
        userId: session.user.id,
        ...data,
        reminderDays: [1, 3], // Default reminders
      },
    })

    revalidatePath("/dashboard/subscriptions")
    return { success: "Subscription added successfully" }
  } catch (error) {
    console.error("Create subscription error:", error)
    return { error: "Failed to create subscription" }
  }
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  return await prisma.subscription.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { nextBillingDate: "asc" },
  })
}

export async function cancelSubscription(id: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }
  
    try {
      await prisma.subscription.update({
        where: { id, userId: session.user.id },
        data: { isActive: false }
      })
      revalidatePath("/dashboard/subscriptions")
      return { success: "Subscription cancelled" }
    } catch (error) {
      return { error: "Failed to cancel subscription" }
    }
}
