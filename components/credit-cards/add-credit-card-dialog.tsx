"use client"

import { useActionState, useState } from "react"
import { createCreditCard } from "@/app/actions/credit-card"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { PlusCircle } from "lucide-react"
import { toast } from "sonner"

export function AddCreditCardDialog() {
  const [open, setOpen] = useState(false)
  // Controlled card number for Apple AutoFill — stores the last 4 digits
  const [lastFour, setLastFour] = useState("")

  // Accepts full card number (AutoFill) or just 4 digits; keeps last 4
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "")
    setLastFour(digits.length > 4 ? digits.slice(-4) : digits)
  }

  const [, formAction, isPending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await createCreditCard(prev as undefined, formData)
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Credit Card</DialogTitle>
          <DialogDescription>
            Add a new credit card to track limits, outstanding, and due dates.
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
              placeholder="Amazon Pay ICICI"
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
              placeholder="ICICI Bank"
              className="col-span-3"
              required
            />
          </div>
          {/* Card number with Apple AutoFill support */}
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
          <input type="hidden" name="lastFourDigits" value={lastFour} />
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="creditLimit" className="text-right">
              Limit
            </Label>
            <Input
              id="creditLimit"
              name="creditLimit"
              type="number"
              step="0.01"
              min="0"
              placeholder="200000"
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
              name="currentOutstanding"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              placeholder="0.00"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="billingDate" className="text-right text-sm">
              Billing Day
            </Label>
            <Input
              id="billingDate"
              name="billingDate"
              type="number"
              min="1"
              max="31"
              placeholder="Day of month (1-31)"
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
              name="dueDate"
              type="number"
              min="1"
              max="31"
              placeholder="Day of month (1-31)"
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
              name="interestRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="Annual rate (optional)"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rewardPoints" className="text-right text-sm">
              Reward Pts
            </Label>
            <Input
              id="rewardPoints"
              name="rewardPoints"
              type="number"
              min="0"
              placeholder="0"
              className="col-span-3"
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
