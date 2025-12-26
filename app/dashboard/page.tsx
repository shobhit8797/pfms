import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { format } from "date-fns"

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

  // Calculate Monthly Expenses
  const monthlyExpenseTotal = Number(expensesThisMonth._sum.amount) || 0

  // Calculate Budget Utilization (Simplified for total monthly budget)
  const totalBudgetLimit = budgetStats.reduce((acc, b) => acc + Number(b.amount), 0)
  // We'd need accurate per-category spending for true utilization, but for global summary:
  const budgetUtilization = totalBudgetLimit > 0 ? (monthlyExpenseTotal / totalBudgetLimit) * 100 : 0

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Welcome, {session.user.name}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-800 border-l-4 border-green-500">
          <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">Net Worth</h2>
          <p className="text-3xl font-bold text-green-600">₹{netWorth.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">Across {bankAccounts.length} accounts & {investments.length} investments</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-800 border-l-4 border-red-500">
          <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">Monthly Expenses</h2>
          <p className="text-3xl font-bold text-red-600">₹{monthlyExpenseTotal.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">{format(new Date(), "MMMM yyyy")}</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-800 border-l-4 border-blue-500">
          <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">Budget Status</h2>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2 mb-2">
            <div 
                className={`h-2.5 rounded-full ${budgetUtilization > 100 ? "bg-red-600" : "bg-blue-600"}`} 
                style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500">
              {budgetUtilization.toFixed(0)}% of total monthly budget used
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity placeholder - could implement later */}
          <div className="bg-white p-6 rounded-lg shadow dark:bg-gray-800">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                  <a href="/dashboard/expenses" className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center hover:bg-gray-100 transition">
                      Add Expense
                  </a>
                  <a href="/dashboard/income" className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center hover:bg-gray-100 transition">
                      Add Income
                  </a>
                  <a href="/dashboard/investments" className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center hover:bg-gray-100 transition">
                      New Investment
                  </a>
                  <a href="/dashboard/ai" className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-center hover:bg-blue-100 transition">
                      Ask AI Advisor
                  </a>
              </div>
          </div>
      </div>
    </div>
  )
}
