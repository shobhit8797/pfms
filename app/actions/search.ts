"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export type SearchResults = {
  query: string
  expenses: { id: string; description: string; category: string; amount: number; date: Date }[]
  income: { id: string; source: string; category: string; amount: number; date: Date }[]
  subscriptions: { id: string; serviceName: string; category: string; amount: number }[]
  investments: { id: string; assetName: string; assetClass: string; amount: number }[]
  total: number
}

const LIMIT = 25

export async function searchAll(query: string): Promise<SearchResults> {
  const empty: SearchResults = {
    query,
    expenses: [],
    income: [],
    subscriptions: [],
    investments: [],
    total: 0,
  }

  const session = await auth()
  if (!session?.user?.id) return empty
  const q = query.trim()
  if (q.length < 2) return empty
  const userId = session.user.id
  const like = { contains: q, mode: "insensitive" as const }

  const [expenses, income, subscriptions, investments] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        OR: [{ description: like }, { category: like }, { notes: like }],
      },
      orderBy: { expenseDate: "desc" },
      take: LIMIT,
      select: { id: true, description: true, category: true, amount: true, expenseDate: true },
    }),
    prisma.income.findMany({
      where: {
        userId,
        OR: [{ source: like }, { category: like }, { notes: like }],
      },
      orderBy: { incomeDate: "desc" },
      take: LIMIT,
      select: { id: true, source: true, category: true, amount: true, incomeDate: true },
    }),
    prisma.subscription.findMany({
      where: {
        userId,
        OR: [{ serviceName: like }, { category: like }, { notes: like }],
      },
      orderBy: { nextBillingDate: "asc" },
      take: LIMIT,
      select: { id: true, serviceName: true, category: true, amount: true },
    }),
    prisma.investment.findMany({
      where: {
        userId,
        OR: [{ assetName: like }, { notes: like }],
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      select: { id: true, assetName: true, assetClass: true, currentValue: true, purchasePrice: true, quantity: true },
    }),
  ])

  const expensesOut = expenses.map((e) => ({
    id: e.id,
    description: e.description,
    category: e.category,
    amount: Number(e.amount),
    date: e.expenseDate,
  }))
  const incomeOut = income.map((i) => ({
    id: i.id,
    source: i.source,
    category: i.category,
    amount: Number(i.amount),
    date: i.incomeDate,
  }))
  const subsOut = subscriptions.map((s) => ({
    id: s.id,
    serviceName: s.serviceName,
    category: s.category,
    amount: Number(s.amount),
  }))
  const investmentsOut = investments.map((inv) => ({
    id: inv.id,
    assetName: inv.assetName,
    assetClass: inv.assetClass,
    amount: Number(inv.currentValue) || Number(inv.purchasePrice) * Number(inv.quantity),
  }))

  return {
    query: q,
    expenses: expensesOut,
    income: incomeOut,
    subscriptions: subsOut,
    investments: investmentsOut,
    total:
      expensesOut.length + incomeOut.length + subsOut.length + investmentsOut.length,
  }
}
