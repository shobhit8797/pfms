"use client"

import { useState } from "react"
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
import { updateExpense } from "@/app/actions/expense"
import { toast } from "sonner"
import { Pencil, Loader2 } from "lucide-react"
import { useTransition } from "react"

const EXPENSE_CATEGORIES = [
  "Food & Dining", "Transportation", "Utilities", "Housing", "Healthcare",
  "Insurance", "Personal Care", "Education", "Entertainment", "Shopping",
  "Gifts & Donations", "Travel", "Debt", "Taxes", "Business", "Miscellaneous",
]

type AccountLite = { id: string; bankName: string; accountName: string }
type CardLite = { id: string; cardName: string; lastFourDigits: string }

export type EditableExpense = {
  id: string
  amount: number
  expenseDate: string | Date
  category: string
  description: string
  paymentMethod: string
  bankAccountId: string | null
  creditCardId: string | null
  isRecurring: boolean
  frequency: string | null
  isTaxDeductible: boolean
  taxSection: string | null
  notes: string | null
}

interface Props {
  expense: EditableExpense
  bankAccounts: AccountLite[]
  creditCards: CardLite[]
}

export function EditExpenseDialog({ expense, bankAccounts, creditCards = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>(expense.paymentMethod)
  const [isRecurring, setIsRecurring] = useState(expense.isRecurring)
  const [isTaxDeductible, setIsTaxDeductible] = useState(expense.isTaxDeductible)
  const [isPending, startTransition] = useTransition()

  const dateValue = new Date(expense.expenseDate).toISOString().split("T")[0]

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateExpense(expense.id, formData)
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
          aria-label="Edit expense"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>Update this expense. Account balances adjust automatically.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" step="0.01" defaultValue={expense.amount} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expenseDate">Date</Label>
              <Input id="expenseDate" name="expenseDate" type="date" defaultValue={dateValue} required />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={expense.description} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" defaultValue={expense.category} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select name="paymentMethod" onValueChange={setPaymentMethod} defaultValue={expense.paymentMethod} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(paymentMethod === "BANK_TRANSFER" || paymentMethod === "UPI") && (
            <div className="grid gap-2">
              <Label htmlFor="bankAccountId">Bank Account</Label>
              <Select name="bankAccountId" defaultValue={expense.bankAccountId || undefined} required={paymentMethod === "BANK_TRANSFER"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bankName} - {account.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {paymentMethod === "CREDIT_CARD" && (
            <div className="grid gap-2">
              <Label htmlFor="creditCardId">Credit Card</Label>
              <Select name="creditCardId" defaultValue={expense.creditCardId || undefined} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select credit card" />
                </SelectTrigger>
                <SelectContent>
                  {creditCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.cardName} - {card.lastFourDigits}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox id="isRecurring" name="isRecurring" checked={isRecurring} onCheckedChange={(c) => setIsRecurring(c as boolean)} />
            <Label htmlFor="isRecurring">Recurring Expense</Label>
          </div>

          {isRecurring && (
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select name="frequency" defaultValue={expense.frequency || undefined} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox id="isTaxDeductible" name="isTaxDeductible" checked={isTaxDeductible} onCheckedChange={(c) => setIsTaxDeductible(c as boolean)} />
            <Label htmlFor="isTaxDeductible">Tax Deductible</Label>
          </div>

          {isTaxDeductible && (
            <div className="grid gap-2">
              <Label htmlFor="taxSection">Tax Section</Label>
              <Select name="taxSection" defaultValue={expense.taxSection || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80C">80C (Life Insurance, PF, etc.)</SelectItem>
                  <SelectItem value="80D">80D (Health Insurance)</SelectItem>
                  <SelectItem value="80G">80G (Donations)</SelectItem>
                  <SelectItem value="HRA">HRA (Rent)</SelectItem>
                  <SelectItem value="BUSINESS">Business Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={expense.notes || ""} placeholder="Additional details..." />
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
