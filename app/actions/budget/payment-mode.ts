"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { paymentModeSchema } from "@/lib/validation/budget"
import {
  listPaymentModes,
  createPaymentMode,
  updatePaymentMode,
  archivePaymentMode,
} from "@/lib/services/payment-mode.service"
import { requireUserId, toErrorState, type ActionState } from "./_helpers"

export async function getPaymentModes(includeArchived = false) {
  const session = await auth()
  if (!session?.user?.id) return []
  return listPaymentModes(session.user.id, includeArchived)
}

export async function savePaymentMode(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state

  const id = (formData.get("id") as string) || undefined
  const parsed = paymentModeSchema.safeParse({ name: formData.get("name") })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    if (id) {
      await updatePaymentMode(ctx.userId, id, parsed.data)
    } else {
      await createPaymentMode(ctx.userId, parsed.data)
    }
    revalidatePath("/dashboard/budget/settings")
    return { success: id ? "Payment mode updated" : "Payment mode created" }
  } catch (error) {
    return toErrorState(error)
  }
}

export async function setPaymentModeArchived(id: string, isArchived: boolean): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state
  try {
    await archivePaymentMode(ctx.userId, id, isArchived)
    revalidatePath("/dashboard/budget/settings")
    return { success: isArchived ? "Payment mode archived" : "Payment mode restored" }
  } catch (error) {
    return toErrorState(error)
  }
}
