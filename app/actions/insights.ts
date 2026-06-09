"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

export type MonthlyFlow = { month: string; income: number; expense: number; net: number }
export type CategorySlice = { name: string; value: number }
export type BudgetAlert = { category: string; spent: number; limit: number; pct: number }

export type InsightsData = {
  monthlyFlow: MonthlyFlow[]
  categoryBreakdown: CategorySlice[]
  topCategories: CategorySlice[]
  kpis: {
    thisMonthIncome: number
    thisMonthExpense: number
    lastMonthExpense: number
    expenseChangePct: number
    savingsRate: number // 0-100
    netWorth: number
    bankTotal: number
    investmentTotal: number
    creditOutstanding: number
  }
  budgetAlerts: BudgetAlert[]
}

const MONTHS_BACK = 6

export async function getInsights(): Promise<InsightsData | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const userId = session.user.id

  const now = new Date()
  const windowStart = startOfMonth(subMonths(now, MONTHS_BACK - 1))
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const [incomes, expenses, bankAccounts, investments, creditCards, budgets] =
    await Promise.all([
      prisma.income.findMany({
        where: { userId, incomeDate: { gte: windowStart } },
        select: { amount: true, incomeDate: true },
      }),
      prisma.expense.findMany({
        where: { userId, expenseDate: { gte: windowStart } },
        select: { amount: true, expenseDate: true, category: true },
      }),
      prisma.bankAccount.findMany({
        where: { userId, isActive: true },
        select: { currentBalance: true },
      }),
      prisma.investment.findMany({
        where: { userId },
        select: { currentValue: true, purchasePrice: true, quantity: true },
      }),
      prisma.creditCard.findMany({
        where: { userId, isActive: true },
        select: { currentOutstanding: true },
      }),
      prisma.budget.findMany({
        // "Active" budgets = those whose window hasn't ended yet
        where: { userId, endDate: { gte: now } },
        select: { category: true, amount: true, startDate: true, endDate: true },
      }),
    ])

  // ---- Monthly flow (last MONTHS_BACK months) ----
  const buckets = new Map<string, { income: number; expense: number }>()
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const key = format(subMonths(now, i), "MMM yy")
    buckets.set(key, { income: 0, expense: 0 })
  }
  for (const inc of incomes) {
    const key = format(new Date(inc.incomeDate), "MMM yy")
    const b = buckets.get(key)
    if (b) b.income += Number(inc.amount)
  }
  for (const exp of expenses) {
    const key = format(new Date(exp.expenseDate), "MMM yy")
    const b = buckets.get(key)
    if (b) b.expense += Number(exp.amount)
  }
  const monthlyFlow: MonthlyFlow[] = Array.from(buckets.entries()).map(
    ([month, v]) => ({
      month,
      income: Math.round(v.income),
      expense: Math.round(v.expense),
      net: Math.round(v.income - v.expense),
    })
  )

  // ---- Category breakdown (this month expenses) ----
  const catMap = new Map<string, number>()
  let thisMonthExpense = 0
  let lastMonthExpense = 0
  for (const exp of expenses) {
    const d = new Date(exp.expenseDate)
    const amt = Number(exp.amount)
    if (d >= thisMonthStart && d <= thisMonthEnd) {
      thisMonthExpense += amt
      catMap.set(exp.category, (catMap.get(exp.category) || 0) + amt)
    } else if (d >= lastMonthStart && d <= lastMonthEnd) {
      lastMonthExpense += amt
    }
  }
  const categoryBreakdown: CategorySlice[] = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
  const topCategories = categoryBreakdown.slice(0, 5)

  // ---- This month income ----
  const thisMonthIncome = incomes
    .filter((i) => {
      const d = new Date(i.incomeDate)
      return d >= thisMonthStart && d <= thisMonthEnd
    })
    .reduce((acc, i) => acc + Number(i.amount), 0)

  // ---- Net worth ----
  const bankTotal = bankAccounts.reduce((acc, a) => acc + Number(a.currentBalance), 0)
  const investmentTotal = investments.reduce(
    (acc, inv) =>
      acc + (Number(inv.currentValue) || Number(inv.purchasePrice) * Number(inv.quantity)),
    0
  )
  const creditOutstanding = creditCards.reduce(
    (acc, c) => acc + Number(c.currentOutstanding),
    0
  )
  const netWorth = bankTotal + investmentTotal - creditOutstanding

  // ---- Budget alerts (spent vs limit for active budgets, this month's expenses) ----
  const budgetAlerts: BudgetAlert[] = budgets
    .map((b) => {
      const spent = expenses
        .filter((e) => {
          const d = new Date(e.expenseDate)
          return (
            e.category === b.category &&
            d >= new Date(b.startDate) &&
            d <= new Date(b.endDate)
          )
        })
        .reduce((acc, e) => acc + Number(e.amount), 0)
      const limit = Number(b.amount)
      return {
        category: b.category,
        spent: Math.round(spent),
        limit: Math.round(limit),
        pct: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      }
    })
    .filter((a) => a.pct >= 80)
    .sort((a, b) => b.pct - a.pct)

  const savingsRate =
    thisMonthIncome > 0
      ? Math.max(0, Math.round(((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100))
      : 0
  const expenseChangePct =
    lastMonthExpense > 0
      ? Math.round(((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100)
      : 0

  return {
    monthlyFlow,
    categoryBreakdown,
    topCategories,
    kpis: {
      thisMonthIncome: Math.round(thisMonthIncome),
      thisMonthExpense: Math.round(thisMonthExpense),
      lastMonthExpense: Math.round(lastMonthExpense),
      expenseChangePct,
      savingsRate,
      netWorth: Math.round(netWorth),
      bankTotal: Math.round(bankTotal),
      investmentTotal: Math.round(investmentTotal),
      creditOutstanding: Math.round(creditOutstanding),
    },
    budgetAlerts,
  }
}
