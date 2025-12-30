"use client"

import { useState, useTransition } from "react"
import { updateBankAccount } from "@/app/actions/bank-account"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { BankAccount } from "@prisma/client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface EditAccountDialogProps {
  account: BankAccount
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditAccountDialog({ account, open, onOpenChange }: EditAccountDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    accountName: account.accountName,
    bankName: account.bankName,
    accountType: account.accountType,
    currentBalance: Number(account.currentBalance),
    minimumBalance: Number(account.minimumBalance || 0),
    interestRate: Number(account.interestRate || 0),
    isPrimary: account.isPrimary,
    notes: account.notes || "",
    color: account.color || "",
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const form = new FormData()
    form.append("accountName", formData.accountName)
    form.append("bankName", formData.bankName)
    form.append("accountType", formData.accountType)
    form.append("currentBalance", formData.currentBalance.toString())
    form.append("minimumBalance", formData.minimumBalance.toString())
    form.append("interestRate", formData.interestRate.toString())
    form.append("isPrimary", formData.isPrimary ? "true" : "false")
    form.append("notes", formData.notes)
    form.append("color", formData.color)

    startTransition(async () => {
      const result = await updateBankAccount(account.id, form)
      if (result.success) {
        toast.success(result.success)
        onOpenChange(false)
      } else if (result.error) {
        toast.error(result.error)
      }
    })
  }

  const colorOptions = [
    { value: "", label: "Default" },
    { value: "emerald", label: "Emerald" },
    { value: "blue", label: "Blue" },
    { value: "violet", label: "Violet" },
    { value: "amber", label: "Amber" },
    { value: "rose", label: "Rose" },
    { value: "slate", label: "Slate" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bank Account</DialogTitle>
          <DialogDescription>
            Update account details. Account number and IFSC cannot be changed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accountName" className="text-right">
              Name
            </Label>
            <Input
              id="accountName"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
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
            <Label htmlFor="accountType" className="text-right">
              Type
            </Label>
            <Select
              value={formData.accountType}
              onValueChange={(value) =>
                setFormData({ ...formData, accountType: value as typeof formData.accountType })
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAVINGS">Savings</SelectItem>
                <SelectItem value="CURRENT">Current</SelectItem>
                <SelectItem value="SALARY">Salary</SelectItem>
                <SelectItem value="OVERDRAFT">Overdraft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currentBalance" className="text-right">
              Balance
            </Label>
            <Input
              id="currentBalance"
              type="number"
              step="0.01"
              value={formData.currentBalance}
              onChange={(e) =>
                setFormData({ ...formData, currentBalance: parseFloat(e.target.value) || 0 })
              }
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="minimumBalance" className="text-right text-sm">
              Min Balance
            </Label>
            <Input
              id="minimumBalance"
              type="number"
              step="0.01"
              value={formData.minimumBalance}
              onChange={(e) =>
                setFormData({ ...formData, minimumBalance: parseFloat(e.target.value) || 0 })
              }
              className="col-span-3"
              placeholder="Alert when below this"
            />
          </div>

          {(formData.accountType === "SAVINGS" || formData.accountType === "CURRENT") && (
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
                placeholder="Annual interest rate"
              />
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="color" className="text-right">
              Color
            </Label>
            <Select
              value={formData.color}
              onValueChange={(value) => setFormData({ ...formData, color: value })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Choose accent color" />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      {color.value && (
                        <div
                          className={`w-3 h-3 rounded-full bg-${color.value}-500`}
                          style={{
                            backgroundColor:
                              color.value === "emerald"
                                ? "#10b981"
                                : color.value === "blue"
                                  ? "#3b82f6"
                                  : color.value === "violet"
                                    ? "#8b5cf6"
                                    : color.value === "amber"
                                      ? "#f59e0b"
                                      : color.value === "rose"
                                        ? "#f43f5e"
                                        : color.value === "slate"
                                          ? "#64748b"
                                          : undefined,
                          }}
                        />
                      )}
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isPrimary" className="text-right">
              Primary
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch
                id="isPrimary"
                checked={formData.isPrimary}
                onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
              />
              <Label htmlFor="isPrimary" className="font-normal text-muted-foreground">
                Set as primary account
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right pt-2">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="col-span-3"
              placeholder="Add any notes about this account..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm text-muted-foreground">Account</div>
            <div className="col-span-3 text-sm text-muted-foreground">
              ····{account.accountNumber.slice(-4)} · {account.ifscCode}
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

