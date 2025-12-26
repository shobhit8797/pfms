"use client"

import { useActionState, useState } from "react"
import { createBankAccount } from "@/app/actions/bank-account"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { PlusCircle } from "lucide-react"
import { toast } from "sonner"

export function AddAccountDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(async (prev: any, formData: FormData) => {
    const result = await createBankAccount(prev, formData)
    if (result.success) {
      toast.success(result.success)
      setOpen(false)
    } else if (result.error) {
      toast.error(result.error)
    }
    return result
  }, undefined)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
          <DialogDescription>
            Add a new bank account to track your finances.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accountName" className="text-right">
              Name
            </Label>
            <Input
              id="accountName"
              name="accountName"
              placeholder="My Savings"
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
              placeholder="HDFC Bank"
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accountType" className="text-right">
              Type
            </Label>
            <Select name="accountType" defaultValue="SAVINGS" required>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAVINGS">Savings</SelectItem>
                <SelectItem value="CURRENT">Current</SelectItem>
                <SelectItem value="SALARY">Salary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="accountNumber" className="text-right">
              Acc. No.
            </Label>
            <Input
              id="accountNumber"
              name="accountNumber"
              placeholder="1234567890"
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ifscCode" className="text-right">
              IFSC
            </Label>
            <Input
              id="ifscCode"
              name="ifscCode"
              placeholder="HDFC0001234"
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currentBalance" className="text-right">
              Balance
            </Label>
            <Input
              id="currentBalance"
              name="currentBalance"
              type="number"
              step="0.01"
              placeholder="0.00"
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isPrimary" className="text-right">
              Primary
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <Switch id="isPrimary" name="isPrimary" />
              <Label htmlFor="isPrimary" className="font-normal text-muted-foreground">
                Set as primary account
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

