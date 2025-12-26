import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getExpenses } from "@/app/actions/expense"
import { getBankAccounts } from "@/app/actions/bank-account"
import { getCreditCards } from "@/app/actions/credit-card"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function ExpensesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [expenses, bankAccounts, creditCards] = await Promise.all([
    getExpenses(),
    getBankAccounts(),
    getCreditCards(),
  ])

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <AddExpenseDialog bankAccounts={bankAccounts} creditCards={creditCards} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                  No expenses recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    {format(expense.expenseDate, "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {expense.description}
                    {expense.isRecurring && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Recurring
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{expense.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {expense.paymentMethod.replace("_", " ")}
                    {expense.bankAccount && ` (${expense.bankAccount.bankName})`}
                    {expense.creditCard && ` (${expense.creditCard.cardName})`}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ₹{Number(expense.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
