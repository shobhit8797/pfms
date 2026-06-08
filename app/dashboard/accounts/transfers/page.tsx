import Link from "next/link"
import { getBankAccounts, getTransfers } from "@/app/actions/bank-account"
import { TransferForm } from "@/components/bank-accounts/transfer-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowLeft, ArrowRightLeft, ArrowRight } from "lucide-react"
import { serializeDecimals } from "@/lib/utils"

interface TransfersPageProps {
  searchParams: Promise<{ from?: string }>
}

export default async function TransfersPage({ searchParams }: TransfersPageProps) {
  const { from } = await searchParams

  const [accountsRaw, transfersRaw] = await Promise.all([getBankAccounts("ACTIVE"), getTransfers()])

  // Serialize Decimal fields for Client Components
  const accounts = serializeDecimals(accountsRaw)
  const transfers = serializeDecimals(transfersRaw)

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/accounts">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">
            Account Transfers
          </h1>
          <p className="text-muted-foreground text-sm">
            Move money between your accounts instantly
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Transfer Form */}
        <TransferForm accounts={accounts} defaultFromAccountId={from} />

        {/* Transfer History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Recent Transfers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transfers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transfers yet</p>
                <p className="text-sm mt-2">Your transfer history will appear here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.slice(0, 10).map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(transfer.transferDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium truncate max-w-[80px]">
                            {transfer.fromAccount.accountName}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate max-w-[80px]">
                            {transfer.toAccount.accountName}
                          </span>
                        </div>
                        {transfer.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            {transfer.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium">
                          {formatCurrency(Number(transfer.amount))}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`ml-2 text-xs ${
                            transfer.status === "COMPLETED"
                              ? "bg-success/10 text-success"
                              : transfer.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {transfer.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

