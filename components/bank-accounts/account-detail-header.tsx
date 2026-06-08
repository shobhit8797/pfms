"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AccountAnalytics } from "@/app/actions/bank-account"
import { BankAccount } from "@prisma/client"
import {
  Wallet,
  Building2,
  CreditCard,
  Star,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
} from "lucide-react"

interface AccountDetailHeaderProps {
  account: BankAccount
  analytics: AccountAnalytics | null
}

export function AccountDetailHeader({ account, analytics }: AccountDetailHeaderProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "SAVINGS":
        return <Wallet className="h-6 w-6 text-primary" />
      case "CURRENT":
        return <Building2 className="h-6 w-6 text-chart-4" />
      case "SALARY":
        return <CreditCard className="h-6 w-6 text-success" />
      case "OVERDRAFT":
        return <AlertTriangle className="h-6 w-6 text-amber-500" />
      default:
        return <Wallet className="h-6 w-6 text-muted-foreground" />
    }
  }

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
  }

  const formatPercentage = (value: number) => {
    if (Math.abs(value) < 0.1) return null
    return {
      value: Math.abs(value).toFixed(1),
      isPositive: value > 0,
    }
  }

  const incomeChange = analytics
    ? formatPercentage(analytics.previousPeriodComparison.incomeChange)
    : null
  const expenseChange = analytics
    ? formatPercentage(analytics.previousPeriodComparison.expenseChange)
    : null

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Current Balance */}
      <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="font-heading text-3xl font-semibold tracking-tight mt-1">
                {formatCurrency(Number(account.currentBalance))}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  {account.accountType}
                </Badge>
                {account.isPrimary && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-amber-500/10 text-amber-600 border-0"
                  >
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Primary
                  </Badge>
                )}
              </div>
            </div>
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              {getIcon(account.accountType)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Income */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Income</p>
              <p className="font-heading text-2xl font-semibold tracking-tight mt-1 text-success">
                +{formatCurrency(analytics?.totalIncome || 0)}
              </p>
              {incomeChange && (
                <div
                  className={`flex items-center gap-1 mt-2 text-xs ${
                    incomeChange.isPositive ? "text-success" : "text-destructive"
                  }`}
                >
                  {incomeChange.isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {incomeChange.value}% vs last month
                </div>
              )}
              {!incomeChange && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Minus className="h-3 w-3" />
                  No change
                </div>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Expenses */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Expenses</p>
              <p className="font-heading text-2xl font-semibold tracking-tight mt-1 text-destructive">
                -{formatCurrency(analytics?.totalExpense || 0)}
              </p>
              {expenseChange && (
                <div
                  className={`flex items-center gap-1 mt-2 text-xs ${
                    expenseChange.isPositive ? "text-destructive" : "text-success"
                  }`}
                >
                  {expenseChange.isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {expenseChange.value}% vs last month
                </div>
              )}
              {!expenseChange && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Minus className="h-3 w-3" />
                  No change
                </div>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Flow */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net Cash Flow</p>
              <p
                className={`font-heading text-2xl font-semibold tracking-tight mt-1 ${
                  (analytics?.netFlow || 0) >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {(analytics?.netFlow || 0) >= 0 ? "+" : "-"}
                {formatCurrency(analytics?.netFlow || 0)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                This month
              </div>
            </div>
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                (analytics?.netFlow || 0) >= 0 ? "bg-success/10" : "bg-destructive/10"
              }`}
            >
              {(analytics?.netFlow || 0) >= 0 ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

