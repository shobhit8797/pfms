"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Receipt, Paperclip } from "lucide-react"
import { toast } from "sonner"
import { removeTransaction } from "@/app/actions/budget/transaction"
import {
  TransactionDialog,
  type CategoryOption,
  type PaymentModeOption,
} from "./transaction-dialog"

type Row = {
  id: string
  date: string
  description: string
  amount: number
  type: "NEED" | "WANT" | "SAVING"
  categoryId: string
  paymentModeId: string | null
  notes: string | null
  category?: { name: string; type: string; colorHex: string } | null
  paymentMode?: { name: string } | null
  receipts?: { id: string; fileUrl: string; thumbnailUrl: string | null }[]
}

const TYPE_LABEL: Record<string, string> = { NEED: "Need", WANT: "Want", SAVING: "Saving" }
const TYPE_CLASS: Record<string, string> = {
  NEED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  WANT: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  SAVING: "bg-green-500/10 text-green-600 border-green-500/20",
}

export function TransactionTable({
  transactions,
  categories,
  paymentModes,
}: {
  transactions: Row[]
  categories: CategoryOption[]
  paymentModes: PaymentModeOption[]
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent border-border">
          <TableHead className="text-muted-foreground">Date</TableHead>
          <TableHead className="text-muted-foreground">Description</TableHead>
          <TableHead className="text-muted-foreground">Category</TableHead>
          <TableHead className="text-muted-foreground">Type</TableHead>
          <TableHead className="text-muted-foreground">Payment</TableHead>
          <TableHead className="text-right text-muted-foreground">Amount</TableHead>
          <TableHead className="w-20" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <Receipt className="w-8 h-8 text-muted-foreground/50" />
                <p>No transactions yet</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((t) => (
            <TableRow key={t.id} className="border-border hover:bg-muted/30">
              <TableCell className="font-mono text-sm whitespace-nowrap">
                {format(new Date(t.date), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{t.description}</span>
                  {t.receipts && t.receipts.length > 0 && (
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" aria-label="Has receipt" />
                  )}
                </span>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: t.category?.colorHex ?? "#64748b" }}
                    aria-hidden
                  />
                  <span className="text-sm">{t.category?.name ?? "—"}</span>
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`font-normal ${TYPE_CLASS[t.type]}`}>
                  {TYPE_LABEL[t.type]}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {t.paymentMode?.name ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                ₹{Number(t.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <TransactionDialog
                    categories={categories}
                    paymentModes={paymentModes}
                    initial={{
                      id: t.id,
                      date: t.date,
                      description: t.description,
                      categoryId: t.categoryId,
                      amount: Number(t.amount),
                      paymentModeId: t.paymentModeId,
                      type: t.type,
                      notes: t.notes,
                      receipts: t.receipts ?? [],
                    }}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    }
                  />
                  <DeleteButton id={t.id} />
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  function onDelete() {
    if (!confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    startTransition(async () => {
      const result = await removeTransaction(id)
      if (result?.error) toast.error(result.error)
      else {
        toast.success(result.success ?? "Deleted")
        router.refresh()
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 ${confirming ? "text-destructive" : ""}`}
      disabled={isPending}
      onClick={onDelete}
      title={confirming ? "Click again to confirm" : "Delete"}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
