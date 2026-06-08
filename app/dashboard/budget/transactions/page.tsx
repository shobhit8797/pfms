import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getBudgetProfile } from "@/app/actions/budget/profile"
import { getCategories } from "@/app/actions/budget/category"
import { getPaymentModes } from "@/app/actions/budget/payment-mode"
import { getTransactions } from "@/app/actions/budget/transaction"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TransactionDialog } from "@/components/budget/transaction-dialog"
import { TransactionTable } from "@/components/budget/transaction-table"
import { serializeDecimals } from "@/lib/utils"

export default async function BudgetTransactionsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const profile = await getBudgetProfile()
  if (!profile) redirect("/dashboard/budget/setup")

  const [categoriesRaw, paymentModesRaw, txnResultRaw] = await Promise.all([
    getCategories(),
    getPaymentModes(),
    getTransactions({}, 200, 0),
  ])

  const categories = serializeDecimals(categoriesRaw).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    colorHex: c.colorHex,
  }))
  const paymentModes = serializeDecimals(paymentModesRaw).map((p) => ({ id: p.id, name: p.name }))
  const transactions = serializeDecimals(txnResultRaw.items).map((t) => ({
    id: t.id,
    date: typeof t.date === "string" ? t.date : new Date(t.date).toISOString(),
    description: t.description,
    amount: Number(t.amount),
    type: t.type,
    categoryId: t.categoryId,
    paymentModeId: t.paymentModeId,
    notes: t.notes,
    category: t.category,
    paymentMode: t.paymentMode,
    receipts: t.receipts ?? [],
  }))

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            Your 50:30:20 ledger · {txnResultRaw.total} entries
          </p>
        </div>
        <TransactionDialog categories={categories} paymentModes={paymentModes} />
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="font-heading text-lg font-semibold">Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <TransactionTable
            transactions={transactions}
            categories={categories}
            paymentModes={paymentModes}
          />
        </CardContent>
      </Card>
    </div>
  )
}
