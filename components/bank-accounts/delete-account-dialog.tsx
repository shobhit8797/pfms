"use client"

import { useState, useTransition } from "react"
import { deleteAccount } from "@/app/actions/bank-account"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BankAccount } from "@prisma/client"
import { toast } from "sonner"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"

interface DeleteAccountDialogProps {
  account: BankAccount
  hasTransactions?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAccountDialog({
  account,
  hasTransactions = false,
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [confirmText, setConfirmText] = useState("")

  const expectedConfirmText = account.accountName.toLowerCase()
  const canDelete = confirmText.toLowerCase() === expectedConfirmText

  const handleDelete = () => {
    if (!canDelete) return

    startTransition(async () => {
      const result = await deleteAccount(account.id)
      if (result.success) {
        toast.success(result.success)
        onOpenChange(false)
      } else if (result.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
            {hasTransactions ? (
              <span className="block mt-2 text-amber-600 dark:text-amber-400">
                This account has linked transactions and will be archived instead of permanently
                deleted.
              </span>
            ) : (
              <span className="block mt-2">
                This will permanently delete the account and all associated data.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{account.accountName}</p>
                <p className="text-sm text-muted-foreground">
                  {account.bankName} · ····{account.accountNumber.slice(-4)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  ₹{Number(account.currentBalance).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground">{account.accountType}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-semibold">{account.accountName}</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter account name"
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canDelete || isPending}
            onClick={handleDelete}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {hasTransactions ? "Archive Account" : "Delete Account"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

