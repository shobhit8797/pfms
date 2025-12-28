import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { format } from "date-fns"
import Link from "next/link"
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  TrendingUp, 
  CreditCard,
  Sparkles,
  PlusCircle,
  ArrowRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // Fetch Summary Data
  const [
    bankAccounts,
    investments,
    expensesThisMonth,
    incomeThisMonth,
    budgetStats
  ] = await Promise.all([
    prisma.bankAccount.findMany({ where: { userId, isActive: true } }),
    prisma.investment.findMany({ where: { userId } }),
    prisma.expense.aggregate({
      where: { 
        userId,
        expenseDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
      },
      _sum: { amount: true }
    }),
    prisma.income.aggregate({
      where: { 
        userId,
        incomeDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
      },
      _sum: { amount: true }
    }),
    prisma.budget.findMany({
      where: { 
        userId,
        period: "MONTHLY",
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    })
  ])

  // Calculate Net Worth
  const bankTotal = bankAccounts.reduce((acc, accnt) => acc + Number(accnt.currentBalance), 0)
  const investmentTotal = investments.reduce((acc, inv) => acc + (Number(inv.currentValue) || (Number(inv.purchasePrice) * Number(inv.quantity))), 0)
  const netWorth = bankTotal + investmentTotal

  // Calculate Monthly Totals
  const monthlyExpenseTotal = Number(expensesThisMonth._sum.amount) || 0
  const monthlyIncomeTotal = Number(incomeThisMonth._sum.amount) || 0
  const monthlySavings = monthlyIncomeTotal - monthlyExpenseTotal

  // Calculate Budget Utilization
  const totalBudgetLimit = budgetStats.reduce((acc, b) => acc + Number(b.amount), 0)
  const budgetUtilization = totalBudgetLimit > 0 ? (monthlyExpenseTotal / totalBudgetLimit) * 100 : 0

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`
    }
    return `₹${amount.toFixed(0)}`
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            Welcome back, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s your financial overview for {format(new Date(), "MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/ai">
            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
              <Sparkles className="w-4 h-4" />
              AI Advisor
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Net Worth Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Worth
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tracking-tight text-gold-gradient">
              {formatCurrency(netWorth)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {bankAccounts.length} accounts · {investments.length} investments
            </p>
          </CardContent>
        </Card>

        {/* Monthly Income Card */}
        <Card className="bg-card border-border hover:border-border/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Income
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tracking-tight">
              {formatCurrency(monthlyIncomeTotal)}
            </p>
            <p className="text-xs text-success mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              This month
            </p>
          </CardContent>
        </Card>

        {/* Monthly Expenses Card */}
        <Card className="bg-card border-border hover:border-border/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Expenses
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold tracking-tight">
              {formatCurrency(monthlyExpenseTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), "MMMM yyyy")}
            </p>
          </CardContent>
        </Card>

        {/* Savings Card */}
        <Card className="bg-card border-border hover:border-border/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Savings
            </CardTitle>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${monthlySavings >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
              <CreditCard className={`w-4 h-4 ${monthlySavings >= 0 ? "text-success" : "text-destructive"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className={`font-heading text-3xl font-semibold tracking-tight ${monthlySavings >= 0 ? "text-success" : "text-destructive"}`}>
              {monthlySavings >= 0 ? "+" : ""}{formatCurrency(Math.abs(monthlySavings))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlySavings >= 0 ? "You&apos;re on track!" : "Spending exceeds income"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Overview */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-xl font-semibold">Budget Status</CardTitle>
              <Link href="/dashboard/budgets">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1">
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Monthly Budget Utilized</span>
                <span className={`font-medium ${budgetUtilization > 100 ? "text-destructive" : budgetUtilization > 80 ? "text-chart-5" : "text-success"}`}>
                  {budgetUtilization.toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={Math.min(budgetUtilization, 100)} 
                className="h-3 bg-muted"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>₹{monthlyExpenseTotal.toLocaleString("en-IN")} spent</span>
                <span>₹{totalBudgetLimit.toLocaleString("en-IN")} budget</span>
              </div>
            </div>

            {budgetStats.length === 0 && (
              <div className="py-8 text-center border border-dashed border-border rounded-xl">
                <p className="text-muted-foreground mb-3">No budgets set for this month</p>
                <Link href="/dashboard/budgets">
                  <Button variant="outline" size="sm" className="gap-2">
                    <PlusCircle className="w-4 h-4" />
                    Create Budget
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/expenses" className="block">
              <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Add Expense</p>
                      <p className="text-xs text-muted-foreground">Track spending</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
            
            <Link href="/dashboard/income" className="block">
              <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Add Income</p>
                      <p className="text-xs text-muted-foreground">Record earnings</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
            
            <Link href="/dashboard/investments" className="block">
              <div className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-chart-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Add Investment</p>
                      <p className="text-xs text-muted-foreground">Grow wealth</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
            
            <Link href="/dashboard/ai" className="block">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-primary">Ask AI Advisor</p>
                      <p className="text-xs text-primary/70">Get insights</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
