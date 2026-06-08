import {
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  differenceInCalendarDays,
  max as dateMax,
  min as dateMin,
} from "date-fns"

/**
 * Pure math port of the spreadsheet `Calc` engine — the 50:30:20 budget-vs-actual
 * computation. No Prisma here so it can be unit-tested in isolation.
 */

export type CategoryType = "NEED" | "WANT" | "SAVING"

export type BudgetProfileLike = {
  monthlyIncome: number
  needsPct: number
  wantsPct: number
  savingsPct: number
  weeklyLimit: number
}

export type TypeBudget = {
  type: CategoryType
  budget: number
  actual: number
  left: number
  pctLeft: number
  pctUsed: number
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * Prorates a per-month amount across an arbitrary date range, summing the
 * fractional contribution of each calendar month the range overlaps.
 * A full calendar month yields exactly `monthlyAmount`.
 */
export function prorateMonthly(monthlyAmount: number, from: Date, to: Date): number {
  if (to < from) return 0
  const months = eachMonthOfInterval({ start: from, end: to })
  let total = 0
  for (const m of months) {
    const monthStart = startOfMonth(m)
    const monthEnd = endOfMonth(m)
    const overlapStart = dateMax([from, monthStart])
    const overlapEnd = dateMin([to, monthEnd])
    const overlapDays = differenceInCalendarDays(overlapEnd, overlapStart) + 1
    const daysInMonth = getDaysInMonth(m)
    total += monthlyAmount * (overlapDays / daysInMonth)
  }
  return total
}

export function pctForType(profile: BudgetProfileLike, type: CategoryType): number {
  switch (type) {
    case "NEED":
      return profile.needsPct
    case "WANT":
      return profile.wantsPct
    case "SAVING":
      return profile.savingsPct
  }
}

/**
 * Per-type budget vs actual over a date range.
 * budget = monthlyIncome × pct, prorated to the range.
 */
export function typeBudgetVsActual(
  profile: BudgetProfileLike,
  from: Date,
  to: Date,
  actualByType: Partial<Record<CategoryType, number>>
): TypeBudget[] {
  const types: CategoryType[] = ["NEED", "WANT", "SAVING"]
  return types.map((type) => {
    const monthly = profile.monthlyIncome * pctForType(profile, type)
    const budget = prorateMonthly(monthly, from, to)
    const actual = actualByType[type] ?? 0
    const left = budget - actual
    return {
      type,
      budget,
      actual,
      left,
      pctLeft: budget > 0 ? clamp(left / budget, -10, 1) : 0,
      pctUsed: budget > 0 ? actual / budget : 0,
    }
  })
}

/** Weekly spend vs the configured weekly limit. ratio 1.0 = exactly at limit. */
export function weeklyRatio(spend: number, weeklyLimit: number) {
  return {
    spend,
    limit: weeklyLimit,
    ratio: weeklyLimit > 0 ? spend / weeklyLimit : 0,
  }
}

/**
 * Monthly adherence score, 0–10 (PRD §5.2 v1 default; documented as configurable).
 *
 * The PRD defines `10 × clamp(1 − overspend_ratio, 0, 1)`. We read
 * `overspend_ratio` as the *excess* over budget, i.e. how far past 100% of the
 * budget the spend went, so that hitting (or staying under) budget scores a
 * full 10 and only overspending erodes the score:
 *
 *   spendRatio    = totalSpend / totalBudget
 *   overspendRatio = max(0, spendRatio − 1)
 *   score          = round1(10 × clamp(1 − overspendRatio, 0, 1))
 *
 * Examples: at budget → 10; 1.5× budget → 5; ≥2× budget → 0; under budget → 10.
 * Computed on Needs + Wants (Savings is a target to reach, not a spend cap).
 */
export function adherenceScore(totalSpend: number, totalBudget: number): number {
  if (totalBudget <= 0) return 0
  const spendRatio = totalSpend / totalBudget
  const overspendRatio = Math.max(0, spendRatio - 1)
  return Math.round(10 * clamp(1 - overspendRatio, 0, 1) * 10) / 10
}
