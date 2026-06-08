"use server"

import { auth } from "@/auth"
import {
  getPeriodAnalysis,
  getWeeklyAnalysis,
  getMonthlyDailySpend,
  getCategoryBreakdown,
  getYearlyHeatmap,
} from "@/lib/services/analytics.service"

export async function fetchPeriodAnalysis(fromISO: string, toISO: string) {
  const session = await auth()
  if (!session?.user?.id) return null
  return getPeriodAnalysis(session.user.id, new Date(fromISO), new Date(toISO))
}

export async function fetchWeeklyAnalysis(refISO?: string) {
  const session = await auth()
  if (!session?.user?.id) return null
  return getWeeklyAnalysis(session.user.id, refISO ? new Date(refISO) : new Date())
}

export async function fetchMonthlyDailySpend(refISO?: string) {
  const session = await auth()
  if (!session?.user?.id) return []
  return getMonthlyDailySpend(session.user.id, refISO ? new Date(refISO) : new Date())
}

export async function fetchCategoryBreakdown(fromISO: string, toISO: string) {
  const session = await auth()
  if (!session?.user?.id) return []
  return getCategoryBreakdown(session.user.id, new Date(fromISO), new Date(toISO))
}

export async function fetchYearlyHeatmap(year: number) {
  const session = await auth()
  if (!session?.user?.id) return {}
  return getYearlyHeatmap(session.user.id, year)
}
