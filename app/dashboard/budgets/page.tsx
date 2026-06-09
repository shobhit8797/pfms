import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getBudgets, deleteBudget } from "@/app/actions/budget"
import { AddBudgetDialog } from "@/components/budgets/add-budget-dialog"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, PieChart, AlertTriangle, CheckCircle } from "lucide-react"
import { serializeDecimals } from "@/lib/utils"

export default async function BudgetsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const budgetsRaw = await getBudgets()

  // Serialize Decimal fields for Client Components
  const budgets = serializeDecimals(budgetsRaw)

  const totalBudget = budgets.reduce((acc, b) => acc + Number(b.amount), 0)
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0)
  const overBudgetCount = budgets.filter(b => b.spent > Number(b.amount)).length

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            Budgets
          </h1>
          <p className="text-muted-foreground mt-1">
            Set spending limits and track your progress
          </p>
        </div>
        <AddBudgetDialog />
      </div>

      {/* Stats Cards */}
      {budgets.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Budget
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <PieChart className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-semibold">
                ₹{totalBudget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{budgets.length} active budgets</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Spent
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-semibold">
                ₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% utilized
              </p>
            </CardContent>
          </Card>

          <Card className={`bg-card border-border ${overBudgetCount > 0 ? "border-destructive/30" : "border-success/30"}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Budget Health
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${overBudgetCount > 0 ? "bg-destructive/10" : "bg-success/10"}`}>
                {overBudgetCount > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-success" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className={`font-heading text-3xl font-semibold ${overBudgetCount > 0 ? "text-destructive" : "text-success"}`}>
                {overBudgetCount > 0 ? `${overBudgetCount} Over` : "On Track"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {overBudgetCount > 0 ? "Budgets exceeded" : "All budgets healthy"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budgets Grid */}
      {budgets.length === 0 ? (
        <div className="flex h-[400px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
              <PieChart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-xl font-semibold">No budgets set</h3>
            <p className="mb-6 mt-2 text-sm text-muted-foreground max-w-sm">
              Create budgets by category to keep your spending in check.
            </p>
            <AddBudgetDialog />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget, index) => {
            const percentUsed = (budget.spent / Number(budget.amount)) * 100
            const isOverBudget = percentUsed > 100
            const isNearLimit = percentUsed >= budget.alertThreshold && !isOverBudget
            const remaining = Number(budget.amount) - budget.spent
            
            return (
              <Card 
                key={budget.id}
                className={`bg-card border-border hover:border-border/80 transition-all opacity-0 animate-fade-in-up ${isOverBudget ? "border-destructive/30" : isNearLimit ? "border-chart-5/30" : ""}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-heading text-lg font-semibold">{budget.category}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(budget.startDate, "MMM d")} - {format(budget.endDate, "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${isOverBudget ? "bg-destructive/10 text-destructive" : isNearLimit ? "bg-chart-5/10 text-chart-5" : "bg-success/10 text-success"} border-0`}
                      >
                        {percentUsed.toFixed(0)}%
                      </Badge>
                      <form action={async () => {
                        "use server"
                        await deleteBudget(budget.id)
                      }}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex justify-between mb-2 text-sm">
                      <span className="font-medium">
                        ₹{budget.spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        <span className="text-muted-foreground font-normal"> of ₹{Number(budget.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(percentUsed, 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <Badge variant="outline" className="text-xs font-normal">
                      {budget.period}
                    </Badge>
                    <span className={`font-medium ${isOverBudget ? "text-destructive" : "text-muted-foreground"}`}>
                      {isOverBudget 
                        ? `₹${Math.abs(remaining).toLocaleString('en-IN', { maximumFractionDigits: 0 })} over` 
                        : `₹${remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} left`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
