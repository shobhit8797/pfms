"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { deleteIncome } from "@/app/actions/income"
import { deleteExpense } from "@/app/actions/expense"
import { toast } from "sonner"
import { Trash2, Loader2, AlertTriangle } from "lucide-react"

interface DeleteEntryButtonProps {
  id: string
  kind: "income" | "expense"
  label: string
  amount: string
}

export function DeleteEntryButton({ id, kind, label, amount }: DeleteEntryButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = kind === "income" ? await deleteIncome(id) : await deleteExpense(id)
      if (result?.success) {
        toast.success(result.success)
        setOpen(false)
      } else if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${kind}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete {kind === "income" ? "Income" : "Expense"}
          </DialogTitle>
          <DialogDescription>
            This permanently deletes <span className="font-medium text-foreground">{label}</span>{" "}
            ({amount}) and reverses any linked account balance change. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
