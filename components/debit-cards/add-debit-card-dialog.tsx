"use client"

import { useActionState, useState } from "react"
import { createDebitCard } from "@/app/actions/debit-card"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlusCircle } from "lucide-react"
import { toast } from "sonner"
import { BankAccount } from "@prisma/client"

const CARD_NETWORKS = ["VISA", "MASTERCARD", "RUPAY", "MAESTRO", "AMEX"]

interface Props {
  bankAccounts?: Pick<BankAccount, "id" | "bankName" | "accountName">[]
}

export function AddDebitCardDialog({ bankAccounts = [] }: Props) {
  const [open, setOpen] = useState(false)
  // Controlled card number for Apple AutoFill — stores the last 4 digits
  const [lastFour, setLastFour] = useState("")

  const [, formAction, isPending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await createDebitCard(prev as undefined, formData)
      if (result.success) {
        toast.success(result.success)
        setOpen(false)
        setLastFour("")
      } else if (result.error) {
        toast.error(result.error)
      }
      return result
    },
    undefined
  )

  // Accepts full card number (AutoFill) or just 4 digits; keeps last 4
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "")
    setLastFour(digits.length > 4 ? digits.slice(-4) : digits)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Debit Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Debit Card</DialogTitle>
          <DialogDescription>
            Track your debit cards and the expenses paid with them.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cardName" className="text-right">
              Name
            </Label>
            <Input
              id="cardName"
              name="cardName"
              placeholder="SBI Debit Card"
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
              name="bankName"
              placeholder="State Bank of India"
              className="col-span-3"
              autoComplete="cc-name"
              required
            />
          </div>
          {/* Card number input — supports Apple AutoFill (autocomplete="cc-number") */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cardNumberInput" className="text-right text-sm leading-tight">
              Card Number
            </Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="cardNumberInput"
                value={lastFour}
                onChange={handleCardNumberChange}
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="Last 4 digits or full number"
                maxLength={19}
              />
              <p className="text-xs text-muted-foreground">
                iOS AutoFill works here — only the last 4 digits are saved.
              </p>
            </div>
          </div>
          {/* Hidden field with just the last 4 digits for form submission */}
          <input type="hidden" name="lastFourDigits" value={lastFour} />
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cardNetwork" className="text-right text-sm">
              Network
            </Label>
            <Select name="cardNetwork">
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select network (optional)" />
              </SelectTrigger>
              <SelectContent>
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
              <Select name="bankAccountId">
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Link to bank account (optional)" />
                </SelectTrigger>
                <SelectContent>
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
              name="notes"
              placeholder="Optional notes"
              className="col-span-3"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || lastFour.length !== 4}>
              {isPending ? "Adding..." : "Add Card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
