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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { updateIncome } from "@/app/actions/income"
import { toast } from "sonner"
import { Pencil, Loader2 } from "lucide-react"

type AccountLite = { id: string; accountName: string; bankName: string }

export type EditableIncome = {
  id: string
  source: string
  amount: number
  incomeDate: string | Date
  type: string
  isRecurring: boolean
  frequency: string | null
  isTaxable: boolean
  bankAccountId: string | null
  category: string
  notes: string | null
}

interface Props {
  income: EditableIncome
  accounts: AccountLite[]
}

export function EditIncomeDialog({ income, accounts }: Props) {
  const [open, setOpen] = useState(false)
  const [isRecurring, setIsRecurring] = useState(income.isRecurring)
  const [isTaxable, setIsTaxable] = useState(income.isTaxable)
  const [isPending, startTransition] = useTransition()

  const dateValue = new Date(income.incomeDate).toISOString().split("T")[0]

  function handleSubmit(formData: FormData) {
    // Date input gives YYYY-MM-DD; updateIncome does new Date(...) which parses it fine.
    startTransition(async () => {
      const result = await updateIncome(income.id, formData)
      if (result?.error) {
        toast.error(result.error)
      } else if (result?.success) {
        toast.success(result.success)
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Edit income"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Income</DialogTitle>
          <DialogDescription>Update this income. Linked account balance adjusts automatically.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="source">Source / Payer</Label>
              <Input id="source" name="source" defaultValue={income.source} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" defaultValue={income.amount} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={income.type} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALARY">Salary</SelectItem>
                  <SelectItem value="FREELANCE">Freelance</SelectItem>
                  <SelectItem value="RENTAL">Rental</SelectItem>
                  <SelectItem value="INTEREST">Interest</SelectItem>
                  <SelectItem value="BONUS">Bonus</SelectItem>
                  <SelectItem value="GIFT">Gift</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incomeDate">Date</Label>
              <Input id="incomeDate" name="incomeDate" type="date" defaultValue={dateValue} required />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" defaultValue={income.category} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bankAccountId">Deposit To Account (Optional)</Label>
            <Select name="bankAccountId" defaultValue={income.bankAccountId || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.accountName} - {acc.bankName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="isRecurring" name="isRecurring" checked={isRecurring} onCheckedChange={(c) => setIsRecurring(c as boolean)} />
            <Label htmlFor="isRecurring">Recurring Income</Label>
          </div>

          {isRecurring && (
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select name="frequency" defaultValue={income.frequency || undefined} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox id="isTaxable" name="isTaxable" checked={isTaxable} onCheckedChange={(c) => setIsTaxable(c as boolean)} />
            <Label htmlFor="isTaxable">Taxable Income</Label>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={income.notes || ""} placeholder="Additional details..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
