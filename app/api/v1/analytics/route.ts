import { startOfMonth, endOfMonth } from "date-fns"
import { withApiUser } from "@/lib/api-auth"
import {
  getPeriodAnalysis,
  getWeeklyAnalysis,
  getCategoryBreakdown,
} from "@/lib/services/analytics.service"

export const runtime = "nodejs"

/** GET /api/v1/analytics?from=&to= — defaults to the current month. */
export async function GET(request: Request) {
  return withApiUser(request, async (userId) => {
    const q = new URL(request.url).searchParams
    const now = new Date()
    const from = q.get("from") ? new Date(q.get("from")!) : startOfMonth(now)
    const to = q.get("to") ? new Date(q.get("to")!) : endOfMonth(now)

    const [period, weekly, categories] = await Promise.all([
      getPeriodAnalysis(userId, from, to),
      getWeeklyAnalysis(userId, now),
      getCategoryBreakdown(userId, from, to),
    ])
    return { period, weekly, categories }
  })
}
