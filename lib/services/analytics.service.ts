import { prisma } from "@/lib/db"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
} from "date-fns"
import {
  typeBudgetVsActual,
  weeklyRatio,
  adherenceScore,
  type CategoryType,
  type BudgetProfileLike,
} from "@/lib/analytics/calc"
import { getActiveProfile } from "./budget-profile.service"

function toProfileLike(p: {
  monthlyIncome: unknown
  needsPct: unknown
  wantsPct: unknown
  savingsPct: unknown
  weeklyLimit: unknown
}): BudgetProfileLike {
  return {
    monthlyIncome: Number(p.monthlyIncome),
    needsPct: Number(p.needsPct),
    wantsPct: Number(p.wantsPct),
    savingsPct: Number(p.savingsPct),
    weeklyLimit: Number(p.weeklyLimit),
  }
}

/** Σ amount grouped by type over [from, to] (active rows only). */
export async function actualByType(
  userId: string,
  from: Date,
  to: Date
): Promise<Record<CategoryType, number>> {
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, deletedAt: null, date: { gte: from, lte: to } },
    _sum: { amount: true },
  })
  const result: Record<CategoryType, number> = { NEED: 0, WANT: 0, SAVING: 0 }
  for (const r of rows) {
    result[r.type as CategoryType] = Number(r._sum.amount ?? 0)
  }
  return result
}

/** Total "spend" (Needs + Wants) over a range — excludes Savings. */
function spend(actual: Record<CategoryType, number>) {
  return actual.NEED + actual.WANT
}

/** Dashboard "this period" payload — the Calc port. */
export async function getPeriodAnalysis(userId: string, from: Date, to: Date) {
  const profileRow = await getActiveProfile(userId)
  if (!profileRow) return null
  const profile = toProfileLike(profileRow)

  const actual = await actualByType(userId, from, to)
  const breakdown = typeBudgetVsActual(profile, from, to, actual)

  const spendBudget = breakdown
    .filter((b) => b.type !== "SAVING")
    .reduce((s, b) => s + b.budget, 0)
  const totalSpend = spend(actual)

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    monthlyIncome: profile.monthlyIncome,
    breakdown,
    totalSpend,
    spendBudget,
    score: adherenceScore(totalSpend, spendBudget),
  }
}

/** Weekly spend vs limit for the week containing `ref` (Mon–Sun). */
export async function getWeeklyAnalysis(userId: string, ref: Date) {
  const profileRow = await getActiveProfile(userId)
  if (!profileRow) return null
  const from = startOfWeek(ref, { weekStartsOn: 1 })
  const to = endOfWeek(ref, { weekStartsOn: 1 })
  const actual = await actualByType(userId, from, to)
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    ...weeklyRatio(spend(actual), Number(profileRow.weeklyLimit)),
  }
}

/** Daily spend series for the month containing `ref` (for the line/bar chart). */
export async function getMonthlyDailySpend(userId: string, ref: Date) {
  const from = startOfMonth(ref)
  const to = endOfMonth(ref)
  const rows = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, date: { gte: from, lte: to } },
    select: { date: true, amount: true, type: true },
  })
  const byDay = new Map<string, number>()
  for (const r of rows) {
    if (r.type === "SAVING") continue
    const key = r.date.toISOString().slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + Number(r.amount))
  }
  const series: { date: string; amount: number }[] = []
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    series.push({ date: key, amount: byDay.get(key) ?? 0 })
  }
  return series
}

/** Category breakdown (amount per category) for a range. */
export async function getCategoryBreakdown(userId: string, from: Date, to: Date) {
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: { userId, deletedAt: null, date: { gte: from, lte: to } },
    _sum: { amount: true },
  })
  const categories = await prisma.category.findMany({
    where: { userId, id: { in: rows.map((r) => r.categoryId) } },
    select: { id: true, name: true, colorHex: true, type: true },
  })
  const map = new Map(categories.map((c) => [c.id, c]))
  return rows
    .map((r) => {
      const c = map.get(r.categoryId)
      return {
        categoryId: r.categoryId,
        name: c?.name ?? "Unknown",
        colorHex: c?.colorHex ?? "#64748b",
        type: c?.type ?? "NEED",
        amount: Number(r._sum.amount ?? 0),
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

/** Per-day spend totals across an entire year — feeds the calendar heatmap. */
export async function getYearlyHeatmap(userId: string, year: number) {
  const from = startOfYear(new Date(year, 0, 1))
  const to = endOfYear(new Date(year, 0, 1))
  const rows = await prisma.transaction.findMany({
    where: { userId, deletedAt: null, date: { gte: from, lte: to } },
    select: { date: true, amount: true },
  })
  const byDay: Record<string, number> = {}
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10)
    byDay[key] = (byDay[key] ?? 0) + Number(r.amount)
  }
  return byDay
}
