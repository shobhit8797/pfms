"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountAnalytics } from "@/app/actions/bank-account"
import { BalanceSnapshot } from "@prisma/client"
import { TrendingUp, TrendingDown, Wallet, Calendar } from "lucide-react"

interface AccountAnalyticsDashboardProps {
  analytics: AccountAnalytics | null
  balanceHistory: BalanceSnapshot[]
  compact?: boolean
}

export function AccountAnalyticsDashboard({
  analytics,
  balanceHistory,
  compact = false,
}: AccountAnalyticsDashboardProps) {
  if (!analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No analytics data available yet.</p>
            <p className="text-sm mt-2">Add some transactions to see insights.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
  }

  // Group categories
  const incomeCategories = analytics.categoryBreakdown
    .filter((c) => c.type === "income")
    .sort((a, b) => b.amount - a.amount)

  const expenseCategories = analytics.categoryBreakdown
    .filter((c) => c.type === "expense")
    .sort((a, b) => b.amount - a.amount)

  // Balance chart data
  const chartData = balanceHistory.map((s) => ({
    date: new Date(s.snapshotDate).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    }),
    balance: Number(s.balance),
  }))

  // Calculate min/max for chart scaling
  const balances = chartData.map((d) => d.balance)
  const minBalance = Math.min(...balances, 0)
  const maxBalance = Math.max(...balances, 1)
  const range = maxBalance - minBalance || 1

  return (
    <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
      {/* Balance Trend Chart */}
      <Card className={compact ? "md:col-span-2" : "lg:col-span-2"}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Balance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 1 ? (
            <div className="h-[200px] flex items-end gap-1">
              {chartData.map((point, index) => {
                const height = ((point.balance - minBalance) / range) * 100
                const isLast = index === chartData.length - 1
                const isPrevious = index === chartData.length - 2
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${point.date}: ${formatCurrency(point.balance)}`}
                  >
                    <div
                      className={`w-full rounded-t transition-all ${
                        isLast
                          ? "bg-primary"
                          : isPrevious
                            ? "bg-primary/60"
                            : "bg-primary/30"
                      }`}
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    {(index === 0 || isLast || index % Math.ceil(chartData.length / 5) === 0) && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-full">
                        {point.date}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Not enough data for trend chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Stats */}
      {!compact && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average Balance</span>
              <span className="font-medium">{formatCurrency(analytics.averageDailyBalance)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Highest Balance</span>
              <span className="font-medium text-success">
                {formatCurrency(analytics.highestBalance.amount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Lowest Balance</span>
              <span className="font-medium text-destructive">
                {formatCurrency(analytics.lowestBalance.amount)}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Net Flow</span>
                <span
                  className={`font-medium ${
                    analytics.netFlow >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {analytics.netFlow >= 0 ? "+" : "-"}
                  {formatCurrency(analytics.netFlow)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Income by Category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            Income by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incomeCategories.length > 0 ? (
            <div className="space-y-3">
              {incomeCategories.slice(0, compact ? 3 : 5).map((category) => {
                const percentage = (category.amount / analytics.totalIncome) * 100
                return (
                  <div key={category.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{category.category}</span>
                      <span className="font-medium">{formatCurrency(category.amount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No income recorded this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses by Category */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Expenses by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenseCategories.length > 0 ? (
            <div className="space-y-3">
              {expenseCategories.slice(0, compact ? 3 : 5).map((category) => {
                const percentage = (category.amount / analytics.totalExpense) * 100
                return (
                  <div key={category.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{category.category}</span>
                      <span className="font-medium">{formatCurrency(category.amount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-destructive rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No expenses recorded this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

