import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { getActiveProfile } from "@/lib/services/budget-profile.service"
import {
  getPeriodAnalysis,
  getWeeklyAnalysis,
  getMonthlyDailySpend,
  getCategoryBreakdown,
  getYearlyHeatmap,
} from "@/lib/services/analytics.service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BudgetVsActualBars } from "@/components/budget/budget-vs-actual-bars"
import { WeeklyRatio } from "@/components/budget/weekly-ratio"
import { AdherenceScore } from "@/components/budget/adherence-score"
import { DailySpendChart } from "@/components/budget/daily-spend-chart"
import { YearlyHeatmap } from "@/components/budget/yearly-heatmap"
import { PiggyBank, ArrowRight, ListPlus, Upload, Settings } from "lucide-react"

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN")

export default async function BudgetDashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = session.user.id

  const profile = await getActiveProfile(userId)
  if (!profile) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <PiggyBank className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-heading text-2xl font-semibold">Start your 50:30:20 budget</h1>
            <p className="text-muted-foreground">
              Set your monthly income and we&apos;ll split it into Needs, Wants and Savings.
            </p>
            <Button asChild size="lg">
              <Link href="/dashboard/budget/setup">
                Set up budget <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const now = new Date()
  const monthFrom = startOfMonth(now)
  const monthTo = endOfMonth(now)

  const [period, weekly, daily, categories, heatmap] = await Promise.all([
    getPeriodAnalysis(userId, monthFrom, monthTo),
    getWeeklyAnalysis(userId, now),
    getMonthlyDailySpend(userId, now),
    getCategoryBreakdown(userId, monthFrom, monthTo),
    getYearlyHeatmap(userId, now.getFullYear()),
  ])

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            50:30:20 Budget
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(now, "MMMM yyyy")} · income {fmt(Number(profile.monthlyIncome))}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="icon">
            <Link href="/dashboard/budget/settings" aria-label="Settings">
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/budget/imports">
              <Upload className="w-4 h-4 mr-2" /> Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/budget/transactions">
              <ListPlus className="w-4 h-4 mr-2" /> Transactions
            </Link>
          </Button>
        </div>
      </div>

      {/* Top row: budget bars + score/weekly */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">This month — budget vs actual</CardTitle>
          </CardHeader>
          <CardContent>
            {period ? (
              <BudgetVsActualBars breakdown={period.breakdown} />
            ) : (
              <p className="text-muted-foreground text-sm">No data yet.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base">Adherence</CardTitle>
            </CardHeader>
            <CardContent>
              <AdherenceScore score={period?.score ?? 0} />
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base">This week</CardTitle>
            </CardHeader>
            <CardContent>
              {weekly && <WeeklyRatio spend={weekly.spend} limit={weekly.limit} ratio={weekly.ratio} />}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Daily spend + category breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Daily spend — {format(now, "MMMM")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DailySpendChart data={daily} />
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg">By category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-sm">No spending this month.</p>
            ) : (
              categories.slice(0, 8).map((c) => (
                <div key={c.categoryId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.colorHex }} />
                    {c.name}
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {c.type[0] + c.type.slice(1).toLowerCase()}
                    </Badge>
                  </span>
                  <span className="font-mono">{fmt(c.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Yearly heatmap */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Spending calendar — {now.getFullYear()}</CardTitle>
        </CardHeader>
        <CardContent>
          <YearlyHeatmap data={heatmap} year={now.getFullYear()} />
        </CardContent>
      </Card>
    </div>
  )
}
