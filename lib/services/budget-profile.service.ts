import { prisma } from "@/lib/db"
import { notFound } from "@/lib/errors"
import type { BudgetProfileInput } from "@/lib/validation/budget"
import type { BudgetProfile } from "@prisma/client"

/** Derived 50:30:20 budget amounts from a profile. */
export function deriveBudgets(p: Pick<BudgetProfile, "monthlyIncome" | "needsPct" | "wantsPct" | "savingsPct">) {
  const income = Number(p.monthlyIncome)
  return {
    needsBudget: income * Number(p.needsPct),
    wantsBudget: income * Number(p.wantsPct),
    savingsBudget: income * Number(p.savingsPct),
  }
}

/** Projects income forward N years using the profile's annual growth rate. */
export function projectIncome(p: Pick<BudgetProfile, "monthlyIncome" | "annualGrowthPct">, years: number) {
  return Number(p.monthlyIncome) * Math.pow(1 + Number(p.annualGrowthPct), years)
}

export async function getActiveProfile(userId: string) {
  return prisma.budgetProfile.findFirst({
    where: { userId, isActive: true, deletedAt: null },
    orderBy: { effectiveYear: "desc" },
  })
}

export async function getActiveProfileOrThrow(userId: string) {
  const profile = await getActiveProfile(userId)
  if (!profile) throw notFound("No active budget profile. Complete onboarding first.")
  return profile
}

export async function listProfileHistory(userId: string) {
  return prisma.budgetProfile.findMany({
    where: { userId, deletedAt: null },
    orderBy: { effectiveYear: "desc" },
  })
}

/**
 * Creates a new active budget profile, deactivating any prior active one for
 * the same user (history is preserved as isActive=false rows).
 */
export async function upsertBudgetProfile(userId: string, input: BudgetProfileInput) {
  return prisma.$transaction(async (tx) => {
    await tx.budgetProfile.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    })
    return tx.budgetProfile.create({
      data: {
        userId,
        monthlyIncome: input.monthlyIncome,
        needsPct: input.needsPct,
        wantsPct: input.wantsPct,
        savingsPct: input.savingsPct,
        weeklyLimit: input.weeklyLimit,
        annualGrowthPct: input.annualGrowthPct,
        effectiveYear: input.effectiveYear,
        isActive: true,
      },
    })
  })
}
