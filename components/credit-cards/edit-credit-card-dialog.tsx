"use client"

import { useState, useTransition } from "react"
import { updateCreditCard } from "@/app/actions/credit-card"
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
import { CreditCard } from "@prisma/client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface EditCreditCardDialogProps {
  card: CreditCard
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCreditCardDialog({ card, open, onOpenChange }: EditCreditCardDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    cardName: card.cardName,
    bankName: card.bankName,
    creditLimit: Number(card.creditLimit),
    currentOutstanding: Number(card.currentOutstanding),
    billingDate: card.billingDate,
    dueDate: card.dueDate,
    interestRate: Number(card.interestRate || 0),
    rewardPoints: card.rewardPoints,
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const form = new FormData()
    form.append("cardName", formData.cardName)
    form.append("bankName", formData.bankName)
    form.append("creditLimit", formData.creditLimit.toString())
    form.append("currentOutstanding", formData.currentOutstanding.toString())
    form.append("billingDate", formData.billingDate.toString())
    form.append("dueDate", formData.dueDate.toString())
    form.append("interestRate", formData.interestRate.toString())
    form.append("rewardPoints", formData.rewardPoints.toString())

    startTransition(async () => {
      const result = await updateCreditCard(card.id, form)
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Credit Card</DialogTitle>
          <DialogDescription>
            Update card details. The last 4 digits cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cardName" className="text-right">
              Name
            </Label>
            <Input
              id="cardName"
              value={formData.cardName}
              onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bankName" className="text-right">
              Bank
            </Label>
            <Input
              id="bankName"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="creditLimit" className="text-right">
              Limit
            </Label>
            <Input
              id="creditLimit"
              type="number"
              step="0.01"
              min="0"
              value={formData.creditLimit}
              onChange={(e) =>
                setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })
              }
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currentOutstanding" className="text-right text-sm">
              Outstanding
            </Label>
            <Input
              id="currentOutstanding"
              type="number"
              step="0.01"
              min="0"
              value={formData.currentOutstanding}
              onChange={(e) =>
                setFormData({ ...formData, currentOutstanding: parseFloat(e.target.value) || 0 })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="billingDate" className="text-right text-sm">
              Billing Day
            </Label>
            <Input
              id="billingDate"
              type="number"
              min="1"
              max="31"
              value={formData.billingDate}
              onChange={(e) =>
                setFormData({ ...formData, billingDate: parseInt(e.target.value) || 1 })
              }
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate" className="text-right text-sm">
              Due Day
            </Label>
            <Input
              id="dueDate"
              type="number"
              min="1"
              max="31"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData({ ...formData, dueDate: parseInt(e.target.value) || 1 })
              }
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="interestRate" className="text-right text-sm">
              Interest %
            </Label>
            <Input
              id="interestRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.interestRate}
              onChange={(e) =>
                setFormData({ ...formData, interestRate: parseFloat(e.target.value) || 0 })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rewardPoints" className="text-right text-sm">
              Reward Pts
            </Label>
            <Input
              id="rewardPoints"
              type="number"
              min="0"
              value={formData.rewardPoints}
              onChange={(e) =>
                setFormData({ ...formData, rewardPoints: parseInt(e.target.value) || 0 })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm text-muted-foreground">Card</div>
            <div className="col-span-3 text-sm text-muted-foreground">
              ····{card.lastFourDigits}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
