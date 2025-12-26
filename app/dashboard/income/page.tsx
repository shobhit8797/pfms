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
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"

export default async function IncomePage() {
  const [incomes, accounts] = await Promise.all([
    getIncomes(),
    getBankAccounts(),
  ])

  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Income</h2>
          <p className="text-muted-foreground">
            Track your earnings and revenue sources.
          </p>
        </div>
        <AddIncomeDialog accounts={accounts} />
      </div>
      <Separator className="my-6" />

      {incomes.length === 0 ? (
        <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <h3 className="mt-4 text-lg font-semibold">No income records</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              Add your first income entry to start tracking.
            </p>
            <AddIncomeDialog accounts={accounts} />
          </div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.map((income) => (
                <TableRow key={income.id}>
                  <TableCell>{format(income.incomeDate, "PP")}</TableCell>
                  <TableCell className="font-medium">{income.source}</TableCell>
                  <TableCell>{income.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{income.type}</Badge>
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
                  <TableCell>
                    {income.isRecurring ? (
                      <Badge variant="secondary">{income.frequency}</Badge>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    +₹{Number(income.amount).toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}



