"use client"

import { useState, useTransition } from "react"
import { deleteDebitCard } from "@/app/actions/debit-card"
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
import { DebitCard } from "@prisma/client"
import { toast } from "sonner"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"

interface Props {
  card: DebitCard
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteDebitCardDialog({ card, open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition()
  const [confirmText, setConfirmText] = useState("")

  const canDelete = confirmText.toLowerCase() === card.cardName.toLowerCase()

  const handleDelete = () => {
    if (!canDelete) return

    startTransition(async () => {
      const result = await deleteDebitCard(card.id)
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
            Delete Debit Card
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone.
            <span className="block mt-2">
              If this card has linked expenses, it will be archived instead of permanently deleted.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="font-medium">{card.cardName}</p>
            <p className="text-sm text-muted-foreground">
              {card.bankName} · ····{card.lastFourDigits}
              {card.cardNetwork && ` · ${card.cardNetwork}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-semibold">{card.cardName}</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter card name"
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
                Delete Card
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
