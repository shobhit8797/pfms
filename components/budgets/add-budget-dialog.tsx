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
import { createBudget } from "@/app/actions/budget"
import { toast } from "sonner"
import { Plus } from "lucide-react"

const BUDGET_CATEGORIES = [
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

export function AddBudgetDialog() {
  const [open, setOpen] = useState(false)
  const [carryForward, setCarryForward] = useState(false)

  async function handleSubmit(formData: FormData) {
    const result = await createBudget(undefined, formData)
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
          Create Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
          <DialogDescription>
            Set spending limits for categories.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
             <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Limit Amount</Label>
              <Input id="amount" name="amount" type="number" step="0.01" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period">Period</Label>
              <Select name="period" defaultValue="MONTHLY" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                required
              />
            </div>
          </div>
          
           <div className="grid gap-2">
              <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
              <Input
                id="alertThreshold"
                name="alertThreshold"
                type="number"
                defaultValue="80"
                min="1"
                max="100"
                required
              />
           </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="carryForward"
              name="carryForward"
              checked={carryForward}
              onCheckedChange={(checked) => setCarryForward(checked as boolean)}
            />
            <Label htmlFor="carryForward">Carry forward remaining amount</Label>
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
      {pending ? "Creating..." : "Create Budget"}
    </Button>
  )
}
