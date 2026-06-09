import { getInsights } from "@/app/actions/insights"
import { CashflowChart } from "@/components/insights/cashflow-chart"
import { CategoryPie } from "@/components/insights/category-pie"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  AlertTriangle,
  LineChart,
} from "lucide-react"

const inr = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`

export default async function InsightsPage() {
  const data = await getInsights()

  if (!data) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-muted-foreground">Unable to load insights.</p>
      </div>
    )
  }

  const { kpis, monthlyFlow, categoryBreakdown, topCategories, budgetAlerts } = data
  const hasData =
    monthlyFlow.some((m) => m.income || m.expense) || kpis.netWorth !== 0

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
          Insights
        </h1>
        <p className="text-muted-foreground mt-1">
          Where your money comes from, where it goes, and how it&apos;s trending.
        </p>
      </div>

      {!hasData ? (
        <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4 mx-auto">
              <LineChart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-xl font-semibold">No data yet</h3>
            <p className="mb-0 mt-2 text-sm text-muted-foreground">
              Add income, expenses, accounts or investments and your insights will appear here.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Worth
                </CardTitle>
                <Wallet className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="font-heading text-2xl font-semibold text-gold-gradient">
                  {inr(kpis.netWorth)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {inr(kpis.bankTotal)} cash · {inr(kpis.investmentTotal)} invested · {inr(kpis.creditOutstanding)} owed
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  This Month Income
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-success" />
              </CardHeader>
              <CardContent>
                <p className="font-heading text-2xl font-semibold text-success">
                  {inr(kpis.thisMonthIncome)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">across all sources</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  This Month Spend
                </CardTitle>
                <TrendingDown className="w-4 h-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <p className="font-heading text-2xl font-semibold text-destructive">
                  {inr(kpis.thisMonthExpense)}
                </p>
                <p className="text-xs mt-1 flex items-center gap-1">
                  {kpis.expenseChangePct !== 0 && (
                    <span className={kpis.expenseChangePct > 0 ? "text-destructive" : "text-success"}>
                      {kpis.expenseChangePct > 0 ? "▲" : "▼"} {Math.abs(kpis.expenseChangePct)}%
                    </span>
                  )}
                  <span className="text-muted-foreground">vs last month</span>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Savings Rate
                </CardTitle>
                <PiggyBank className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="font-heading text-2xl font-semibold">{kpis.savingsRate}%</p>
                <Progress value={kpis.savingsRate} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="bg-card border-border lg:col-span-3">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-semibold">
                  Income vs Expense
                </CardTitle>
                <p className="text-sm text-muted-foreground">Last 6 months</p>
              </CardHeader>
              <CardContent>
                <CashflowChart data={monthlyFlow} />
              </CardContent>
            </Card>

            <Card className="bg-card border-border lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-semibold">
                  Spending by Category
                </CardTitle>
                <p className="text-sm text-muted-foreground">This month</p>
              </CardHeader>
              <CardContent>
                <CategoryPie data={categoryBreakdown} />
              </CardContent>
            </Card>
          </div>

          {/* Top categories + Budget alerts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-semibold">
                  Top Spending Categories
                </CardTitle>
                <p className="text-sm text-muted-foreground">This month</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {topCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expenses this month.</p>
                ) : (
                  topCategories.map((c) => {
                    const pct =
                      kpis.thisMonthExpense > 0
                        ? Math.round((c.value / kpis.thisMonthExpense) * 100)
                        : 0
                    return (
                      <div key={c.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground">
                            {inr(c.value)} · {pct}%
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
                  Budget Alerts
                  {budgetAlerts.length > 0 && (
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0">
                      {budgetAlerts.length}
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">Categories at or near their limit</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {budgetAlerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No budgets over 80% used. Nice and on track. 🎉
                  </p>
                ) : (
                  budgetAlerts.map((a) => (
                    <div key={a.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium flex items-center gap-1.5">
                          {a.pct >= 100 && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                          {a.category}
                        </span>
                        <span className={a.pct >= 100 ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {inr(a.spent)} / {inr(a.limit)} · {a.pct}%
                        </span>
                      </div>
                      <Progress value={Math.min(a.pct, 100)} className="h-1.5" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
