"use client"

import { useState, useTransition } from "react"
import { updateDebitCard } from "@/app/actions/debit-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DebitCard, BankAccount } from "@prisma/client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const CARD_NETWORKS = ["VISA", "MASTERCARD", "RUPAY", "MAESTRO", "AMEX"]

interface Props {
  card: DebitCard
  open: boolean
  onOpenChange: (open: boolean) => void
  bankAccounts?: Pick<BankAccount, "id" | "bankName" | "accountName">[]
}

export function EditDebitCardDialog({ card, open, onOpenChange, bankAccounts = [] }: Props) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    cardName: card.cardName,
    bankName: card.bankName,
    cardNetwork: card.cardNetwork ?? "",
    bankAccountId: card.bankAccountId ?? "",
    notes: card.notes ?? "",
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const form = new FormData()
    form.append("cardName", formData.cardName)
    form.append("bankName", formData.bankName)
    form.append("lastFourDigits", card.lastFourDigits)
    if (formData.cardNetwork) form.append("cardNetwork", formData.cardNetwork)
    if (formData.bankAccountId) form.append("bankAccountId", formData.bankAccountId)
    if (formData.notes) form.append("notes", formData.notes)

    startTransition(async () => {
      const result = await updateDebitCard(card.id, form)
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
          <DialogTitle>Edit Debit Card</DialogTitle>
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
            <div className="text-right text-sm text-muted-foreground">Card</div>
            <div className="col-span-3 text-sm text-muted-foreground">
              ····{card.lastFourDigits}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cardNetwork" className="text-right text-sm">
              Network
            </Label>
            <Select
              value={formData.cardNetwork || "none"}
              onValueChange={(v) => setFormData({ ...formData, cardNetwork: v === "none" ? "" : v })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CARD_NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {bankAccounts.length > 0 && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bankAccountId" className="text-right text-sm">
                Account
              </Label>
              <Select
                value={formData.bankAccountId || "none"}
                onValueChange={(v) => setFormData({ ...formData, bankAccountId: v === "none" ? "" : v })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Link to bank account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} — {acc.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2 text-sm">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="col-span-3"
              rows={2}
            />
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
