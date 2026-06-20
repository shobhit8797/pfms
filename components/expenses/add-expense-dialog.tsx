"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
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
import { createExpense } from "@/app/actions/expense"
import { BankAccount, CreditCard, DebitCard } from "@prisma/client"
import { toast } from "sonner"
import { Plus } from "lucide-react"

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Utilities",
  "Housing",
  "Healthcare",
  "Insurance",
  "Personal Care",
  "Education",
  "Entertainment",
  "Shopping",
  "Gifts & Donations",
  "Travel",
  "Debt",
  "Taxes",
  "Business",
  "Miscellaneous",
]

type Props = {
  bankAccounts: BankAccount[]
  creditCards: CreditCard[]
  debitCards?: DebitCard[]
}

export function AddExpenseDialog({ bankAccounts, creditCards = [], debitCards = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH")
  const [isRecurring, setIsRecurring] = useState(false)
  const [isTaxDeductible, setIsTaxDeductible] = useState(false)

  async function handleSubmit(formData: FormData) {
    const result = await createExpense(undefined, formData)
    if (result?.error) {
      toast.error(result.error)
    } else if (result?.success) {
      toast.success(result.success)
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Record a new expense transaction.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expenseDate">Date</Label>
              <Input
                id="expenseDate"
                name="expenseDate"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="What was this for?"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                name="paymentMethod"
                onValueChange={setPaymentMethod}
                defaultValue="CASH"
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                  <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(paymentMethod === "BANK_TRANSFER" || paymentMethod === "UPI") && (
            <div className="grid gap-2">
              <Label htmlFor="bankAccountId">Bank Account</Label>
              <Select name="bankAccountId" required={paymentMethod === "BANK_TRANSFER"}>
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
              <Select name="creditCardId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select credit card" />
                </SelectTrigger>
                <SelectContent>
                  {creditCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.cardName} — ····{card.lastFourDigits}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {paymentMethod === "DEBIT_CARD" && (
            <div className="grid gap-2">
              <Label htmlFor="debitCardId">Debit Card</Label>
              <Select name="debitCardId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select debit card" />
                </SelectTrigger>
                <SelectContent>
                  {debitCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.cardName} — ····{card.lastFourDigits}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecurring"
              name="isRecurring"
              checked={isRecurring}
              onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
            />
            <Label htmlFor="isRecurring">Recurring Expense</Label>
          </div>

          {isRecurring && (
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select name="frequency" required>
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
             <Checkbox
              id="isTaxDeductible"
              name="isTaxDeductible"
              checked={isTaxDeductible}
              onCheckedChange={(checked) => setIsTaxDeductible(checked as boolean)}
            />
            <Label htmlFor="isTaxDeductible">Tax Deductible</Label>
          </div>

          {isTaxDeductible && (
             <div className="grid gap-2">
              <Label htmlFor="taxSection">Tax Section</Label>
              <Select name="taxSection">
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
            <Textarea id="notes" name="notes" placeholder="Additional details..." />
          </div>

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding..." : "Add Expense"}
    </Button>
  )
}
