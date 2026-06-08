"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { budgetProfileSchema } from "@/lib/validation/budget"
import {
  getActiveProfile,
  listProfileHistory,
  upsertBudgetProfile,
} from "@/lib/services/budget-profile.service"
import { seedBudgetDefaults } from "@/lib/services/seed.service"
import { requireUserId, toErrorState, type ActionState } from "./_helpers"

export async function getBudgetProfile() {
  const session = await auth()
  if (!session?.user?.id) return null
  return getActiveProfile(session.user.id)
}

export async function getBudgetProfileHistory() {
  const session = await auth()
  if (!session?.user?.id) return []
  return listProfileHistory(session.user.id)
}

/**
 * Onboarding + settings: creates/updates the active budget profile. On first
 * setup (no categories yet) it also seeds the default categories + payment modes.
 */
export async function saveBudgetProfile(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state

  const parsed = budgetProfileSchema.safeParse({
    monthlyIncome: formData.get("monthlyIncome"),
    needsPct: formData.get("needsPct") ?? undefined,
    wantsPct: formData.get("wantsPct") ?? undefined,
    savingsPct: formData.get("savingsPct") ?? undefined,
    weeklyLimit: formData.get("weeklyLimit") ?? undefined,
    annualGrowthPct: formData.get("annualGrowthPct") ?? undefined,
    effectiveYear: formData.get("effectiveYear") ?? new Date().getFullYear(),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    await upsertBudgetProfile(ctx.userId, parsed.data)
    await seedBudgetDefaults(ctx.userId)
    revalidatePath("/dashboard/budget")
    revalidatePath("/dashboard/budget/settings")
    return { success: "Budget profile saved" }
  } catch (error) {
    return toErrorState(error)
  }
}
