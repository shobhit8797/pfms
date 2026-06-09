import { getIncomes } from "@/app/actions/income"
import { getBankAccounts } from "@/app/actions/bank-account"
import { AddIncomeDialog } from "@/components/income/add-income-dialog"
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
import { format } from "date-fns"
import { Wallet, ArrowUpRight, TrendingUp, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { serializeDecimals } from "@/lib/utils"
import { DeleteEntryButton } from "@/components/shared/delete-entry-button"
import { EditIncomeDialog } from "@/components/income/edit-income-dialog"

export default async function IncomePage() {
  const [incomesRaw, accountsRaw] = await Promise.all([
    getIncomes(),
    getBankAccounts(),
  ])

  // Serialize Decimal fields for Client Components
  const incomes = serializeDecimals(incomesRaw)
  const accounts = serializeDecimals(accountsRaw)

  const totalIncome = incomes.reduce((acc, inc) => acc + Number(inc.amount), 0)
  const thisMonthIncome = incomes
    .filter(inc => {
      const incDate = new Date(inc.incomeDate)
      const now = new Date()
      return incDate.getMonth() === now.getMonth() && incDate.getFullYear() === now.getFullYear()
    })
    .reduce((acc, inc) => acc + Number(inc.amount), 0)

  const recurringIncome = incomes
    .filter(inc => inc.isRecurring)
    .reduce((acc, inc) => acc + Number(inc.amount), 0)

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            Income
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your earnings and revenue sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          {incomes.length > 0 && (
            <Button variant="outline" asChild>
              <a href="/api/export/income" download>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </a>
            </Button>
          )}
          <AddIncomeDialog accounts={accounts} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-success/10 via-card to-card border-success/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold text-success">
              +₹{thisMonthIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">
              ₹{totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {incomes.length} entries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recurring Income
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">
              ₹{recurringIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {incomes.filter(i => i.isRecurring).length} recurring sources
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Income Table */}
      {incomes.length === 0 ? (
        <div className="flex h-[400px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-xl font-semibold">No income records</h3>
            <p className="mb-6 mt-2 text-sm text-muted-foreground max-w-sm">
              Add your first income entry to start tracking your earnings.
            </p>
            <AddIncomeDialog accounts={accounts} />
          </div>
        </div>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="font-heading text-lg font-semibold">Income History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Source</TableHead>
                  <TableHead className="text-muted-foreground">Category</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Account</TableHead>
                  <TableHead className="text-right text-muted-foreground">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomes.map((income) => (
                  <TableRow key={income.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">
                      {format(income.incomeDate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{income.source}</span>
                        {income.isRecurring && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                            {income.frequency}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{income.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {income.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {income.bankAccount ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{income.bankAccount.accountName}</span>
                          <span className="text-xs text-muted-foreground">{income.bankAccount.bankName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-semibold text-success">
                        +₹{Number(income.amount).toLocaleString('en-IN')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <EditIncomeDialog
                          income={{
                            id: income.id,
                            source: income.source,
                            amount: Number(income.amount),
                            incomeDate: income.incomeDate,
                            type: income.type,
                            isRecurring: income.isRecurring,
                            frequency: income.frequency,
                            isTaxable: income.isTaxable,
                            bankAccountId: income.bankAccountId,
                            category: income.category,
                            notes: income.notes,
                          }}
                          accounts={accounts}
                        />
                        <DeleteEntryButton
                          id={income.id}
                          kind="income"
                          label={income.source}
                          amount={`₹${Number(income.amount).toLocaleString('en-IN')}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
