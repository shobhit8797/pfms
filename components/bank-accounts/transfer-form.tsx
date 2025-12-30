"use client"

import { useState, useTransition } from "react"
import { createTransfer, BankAccountWithStats } from "@/app/actions/bank-account"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowRightLeft, CalendarIcon, Loader2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface TransferFormProps {
  accounts: BankAccountWithStats[]
  defaultFromAccountId?: string
}

export function TransferForm({ accounts, defaultFromAccountId }: TransferFormProps) {
  const [isPending, startTransition] = useTransition()
  const [fromAccountId, setFromAccountId] = useState(defaultFromAccountId || "")
  const [toAccountId, setToAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [transferDate, setTransferDate] = useState<Date>(new Date())
  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")

  const fromAccount = accounts.find((a) => a.id === fromAccountId)
  const toAccount = accounts.find((a) => a.id === toAccountId)

  const availableBalance = fromAccount ? Number(fromAccount.currentBalance) : 0
  const parsedAmount = parseFloat(amount) || 0
  const isValidAmount = parsedAmount > 0 && parsedAmount <= availableBalance

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!fromAccountId || !toAccountId || !isValidAmount) {
      toast.error("Please fill in all required fields correctly")
      return
    }

    if (fromAccountId === toAccountId) {
      toast.error("Cannot transfer to the same account")
      return
    }

    const formData = new FormData()
    formData.append("fromAccountId", fromAccountId)
    formData.append("toAccountId", toAccountId)
    formData.append("amount", amount)
    formData.append("transferDate", transferDate.toISOString())
    formData.append("description", description)
    formData.append("notes", notes)

    startTransition(async () => {
      const result = await createTransfer(formData)
      if (result.success) {
        toast.success(result.success)
        // Reset form
        setAmount("")
        setDescription("")
        setNotes("")
      } else if (result.error) {
        toast.error(result.error)
      }
    })
  }

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          New Transfer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Selection */}
          <div className="grid gap-6 md:grid-cols-[1fr,auto,1fr]">
            {/* From Account */}
            <div className="space-y-2">
              <Label htmlFor="fromAccount">From Account</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger id="fromAccount">
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.isActive)
                    .map((account) => (
                      <SelectItem
                        key={account.id}
                        value={account.id}
                        disabled={account.id === toAccountId}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span>{account.accountName}</span>
                          <span className="text-muted-foreground text-sm">
                            {formatCurrency(Number(account.currentBalance))}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {fromAccount && (
                <p className="text-sm text-muted-foreground">
                  Available: {formatCurrency(Number(fromAccount.currentBalance))}
                </p>
              )}
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            {/* To Account */}
            <div className="space-y-2">
              <Label htmlFor="toAccount">To Account</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger id="toAccount">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.isActive)
                    .map((account) => (
                      <SelectItem
                        key={account.id}
                        value={account.id}
                        disabled={account.id === fromAccountId}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span>{account.accountName}</span>
                          <span className="text-muted-foreground text-sm">
                            {formatCurrency(Number(account.currentBalance))}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {toAccount && (
                <p className="text-sm text-muted-foreground">
                  Current: {formatCurrency(Number(toAccount.currentBalance))}
                </p>
              )}
            </div>
          </div>

          {/* Amount and Date */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={availableBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                  placeholder="0.00"
                  required
                />
              </div>
              {amount && !isValidAmount && (
                <p className="text-sm text-destructive">
                  {parsedAmount <= 0
                    ? "Amount must be greater than 0"
                    : "Insufficient balance"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Transfer Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !transferDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {transferDate ? format(transferDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={transferDate}
                    onSelect={(date) => date && setTransferDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Monthly savings transfer"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={2}
            />
          </div>

          {/* Preview */}
          {fromAccount && toAccount && parsedAmount > 0 && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
              <p className="text-sm font-medium">Transfer Preview</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{fromAccount.accountName}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{toAccount.accountName}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">From balance after</p>
                  <p className="font-medium">
                    {formatCurrency(Number(fromAccount.currentBalance) - parsedAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">To balance after</p>
                  <p className="font-medium text-success">
                    {formatCurrency(Number(toAccount.currentBalance) + parsedAmount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={!fromAccountId || !toAccountId || !isValidAmount || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Transfer...
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfer {amount ? formatCurrency(parsedAmount) : ""}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

