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
import { Trash2 } from "lucide-react"

export default async function BudgetsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const budgets = await getBudgets()

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budgets</h1>
        <AddBudgetDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {budgets.map((budget) => {
          const percentUsed = (budget.spent / Number(budget.amount)) * 100
          const isOverBudget = percentUsed > 100
          const isNearLimit = percentUsed >= budget.alertThreshold && !isOverBudget
          
          return (
            <Card key={budget.id}>
               <CardHeader className="pb-2">
                 <div className="flex justify-between items-start">
                   <div>
                     <CardTitle className="text-lg">{budget.category}</CardTitle>
                     <p className="text-xs text-muted-foreground">
                        {format(budget.startDate, "MMM d")} - {format(budget.endDate, "MMM d, yyyy")}
                     </p>
                   </div>
                   <form action={async () => {
                     "use server"
                     await deleteBudget(budget.id)
                   }}>
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                     </Button>
                   </form>
                 </div>
               </CardHeader>
               <CardContent>
                 <div className="mb-4">
                   <div className="flex justify-between mb-2 text-sm">
                     <span className="font-medium">
                        ₹{budget.spent.toFixed(2)}
                        <span className="text-gray-500 font-normal"> of ₹{Number(budget.amount).toFixed(2)}</span>
                     </span>
                     <span className={`${isOverBudget ? "text-red-600 font-bold" : isNearLimit ? "text-orange-500 font-bold" : "text-gray-600"}`}>
                       {percentUsed.toFixed(0)}%
                     </span>
                   </div>
                   <Progress 
                      value={Math.min(percentUsed, 100)} 
                      className={`h-2 ${isOverBudget ? "bg-red-100" : ""}`}
                      // Note: We'd need to customize Progress component or use inline styles/classes for color changing based on value
                      // Standard shadcn Progress uses primary color. We can override via classes if exposed or custom logic.
                    />
                    <div className={`h-1 w-full mt-1 rounded-full ${isOverBudget ? "bg-red-500" : isNearLimit ? "bg-orange-500" : "bg-primary"}`} style={{ width: `${Math.min(percentUsed, 100)}%` }}></div>
                 </div>
                 
                 <div className="flex justify-between text-xs text-gray-500">
                    <span>{budget.period}</span>
                    <span>{isOverBudget ? "Over budget" : `₹${(Number(budget.amount) - budget.spent).toFixed(2)} left`}</span>
                 </div>
               </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
