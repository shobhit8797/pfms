"use server"

import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { ServiceError } from "@/lib/errors"
import { serializeDecimals } from "@/lib/utils"
import {
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
  subscriptionPaymentSchema,
  type SubscriptionDTO,
  type SubscriptionPaymentDTO,
  type SubscriptionMonthDTO,
} from "@pfms/shared"
import {
  listSubscriptions,
  createSubscription as createSubscriptionService,
  updateSubscription as updateSubscriptionService,
  cancelSubscription as cancelSubscriptionService,
  deleteSubscription as deleteSubscriptionService,
  markPaid as markPaidService,
  listPayments,
  getMonthGrid,
} from "@/lib/services/subscription.service"

export type SubscriptionState = {
  error?: string
  success?: string
}

function toErrorState(error: unknown, fallback: string): SubscriptionState {
  if (error instanceof ServiceError) return { error: error.message }
  console.error(fallback, error)
  return { error: fallback }
}

/** Reads the subscription form into the shape the shared Zod schema expects. */
function parseSubscriptionForm(formData: FormData) {
  return {
    serviceName: formData.get("serviceName"),
    amount: formData.get("amount"),
    billingCycle: formData.get("billingCycle"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    nextBillingDate: formData.get("nextBillingDate"),
    autoRenewal: formData.get("autoRenewal") === "on",
    category: formData.get("category"),
    paymentMethod: formData.get("paymentMethod"),
    creditCardId: formData.get("creditCardId") || undefined,
    notes: formData.get("notes") || undefined,
  }
}

export async function createSubscription(
  prevState: SubscriptionState | undefined,
  formData: FormData
): Promise<SubscriptionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = subscriptionCreateSchema.safeParse(parseSubscriptionForm(formData))
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: `${first.path.join(".")}: ${first.message}` }
  }

  try {
    await createSubscriptionService(session.user.id, parsed.data)
    revalidatePath("/dashboard/subscriptions")
    return { success: "Subscription added successfully" }
  } catch (error) {
    return toErrorState(error, "Failed to create subscription")
  }
}

export async function getSubscriptions(includeInactive = false): Promise<SubscriptionDTO[]> {
  const session = await auth()
  if (!session?.user?.id) return []
  const { items } = await listSubscriptions(session.user.id, { includeInactive })
  return serializeDecimals(items) as unknown as SubscriptionDTO[]
}

export async function getSubscriptionDetail(
  id: string
): Promise<{ payments: SubscriptionPaymentDTO[]; months: SubscriptionMonthDTO[] } | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const [{ items }, months] = await Promise.all([
    listPayments(session.user.id, id),
    getMonthGrid(session.user.id, id),
  ])
  return serializeDecimals({ payments: items, months }) as unknown as {
    payments: SubscriptionPaymentDTO[]
    months: SubscriptionMonthDTO[]
  }
}

export async function updateSubscription(id: string, formData: FormData): Promise<SubscriptionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const parsed = subscriptionUpdateSchema.safeParse(parseSubscriptionForm(formData))
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { error: `${first.path.join(".")}: ${first.message}` }
  }

  try {
    await updateSubscriptionService(session.user.id, id, parsed.data)
    revalidatePath("/dashboard/subscriptions")
    return { success: "Subscription updated" }
  } catch (error) {
    return toErrorState(error, "Failed to update subscription")
  }
}

export async function cancelSubscription(id: string): Promise<SubscriptionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  try {
    await cancelSubscriptionService(session.user.id, id)
    revalidatePath("/dashboard/subscriptions")
    return { success: "Subscription cancelled" }
  } catch (error) {
    return toErrorState(error, "Failed to cancel subscription")
  }
}

export async function reactivateSubscription(id: string): Promise<SubscriptionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  try {
    await updateSubscriptionService(session.user.id, id, { isActive: true })
    revalidatePath("/dashboard/subscriptions")
    return { success: "Subscription reactivated" }
  } catch (error) {
    return toErrorState(error, "Failed to reactivate subscription")
  }
}

export async function deleteSubscription(id: string): Promise<SubscriptionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  try {
    await deleteSubscriptionService(session.user.id, id)
    revalidatePath("/dashboard/subscriptions")
    return { success: "Subscription deleted" }
  } catch (error) {
    return toErrorState(error, "Failed to delete subscription")
  }
}

export async function markSubscriptionPaid(id: string, formData?: FormData): Promise<SubscriptionState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const raw = formData
    ? {
        periodStart: formData.get("periodStart") || undefined,
        amount: formData.get("amount") || undefined,
        paidDate: formData.get("paidDate") || undefined,
        createExpense: formData.get("createExpense") === "on",
        notes: formData.get("notes") || undefined,
      }
    : {}
  const parsed = subscriptionPaymentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid input" }

  try {
    await markPaidService(session.user.id, id, parsed.data)
    revalidatePath("/dashboard/subscriptions")
    revalidatePath("/dashboard/expenses")
    return { success: "Marked as paid" }
  } catch (error) {
    return toErrorState(error, "Failed to mark as paid")
  }
}
