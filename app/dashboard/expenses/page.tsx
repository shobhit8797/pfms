import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getExpenses } from "@/app/actions/expense"
import { getBankAccounts } from "@/app/actions/bank-account"
import { getCreditCards } from "@/app/actions/credit-card"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { DeleteEntryButton } from "@/components/shared/delete-entry-button"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, ArrowDownRight, Receipt } from "lucide-react"
import { serializeDecimals } from "@/lib/utils"

export default async function ExpensesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [expensesRaw, bankAccountsRaw, creditCardsRaw] = await Promise.all([
    getExpenses(),
    getBankAccounts(),
    getCreditCards(),
  ])

  // Serialize Decimal fields for Client Components
  const expenses = serializeDecimals(expensesRaw)
  const bankAccounts = serializeDecimals(bankAccountsRaw)
  const creditCards = serializeDecimals(creditCardsRaw)

  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0)
  const thisMonthExpenses = expenses
    .filter(exp => {
      const expDate = new Date(exp.expenseDate)
      const now = new Date()
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
    })
    .reduce((acc, exp) => acc + Number(exp.amount), 0)

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            Expenses
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your spending
          </p>
        </div>
        <AddExpenseDialog bankAccounts={bankAccounts} creditCards={creditCards} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">
              ₹{thisMonthExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), "MMMM yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recorded
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Receipt className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">
              ₹{totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment Methods
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">
              {bankAccounts.length + creditCards.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {bankAccounts.length} accounts · {creditCards.length} cards
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="font-heading text-lg font-semibold">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-muted-foreground">Category</TableHead>
                <TableHead className="text-muted-foreground">Payment</TableHead>
                <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-8 h-8 text-muted-foreground/50" />
                      <p>No expenses recorded yet</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">
                      {format(expense.expenseDate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{expense.description}</span>
                        {expense.isRecurring && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                            Recurring
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expense.paymentMethod.replace("_", " ")}
                      {expense.bankAccount && ` · ${expense.bankAccount.bankName}`}
                      {expense.creditCard && ` · ${expense.creditCard.cardName}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-semibold text-destructive">
                        -₹{Number(expense.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteEntryButton
                        id={expense.id}
                        kind="expense"
                        label={expense.description}
                        amount={`₹${Number(expense.amount).toLocaleString('en-IN')}`}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
