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
import { createSubscription } from "@/app/actions/subscription"
import { toast } from "sonner"
import { Plus } from "lucide-react"

const SUBSCRIPTION_CATEGORIES = [
  "Entertainment",
  "Software",
  "Utilities",
  "Health & Fitness",
  "Education",
  "Other",
]

export function AddSubscriptionDialog() {
  const [open, setOpen] = useState(false)
  const [autoRenewal, setAutoRenewal] = useState(true)

  async function handleSubmit(formData: FormData) {
    const result = await createSubscription(undefined, formData)
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
          Add Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Subscription</DialogTitle>
          <DialogDescription>
            Track your recurring payments.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="serviceName">Service Name</Label>
            <Input id="serviceName" name="serviceName" placeholder="Netflix, Spotify, etc." required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" step="0.01" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="billingCycle">Billing Cycle</Label>
              <Select name="billingCycle" defaultValue="MONTHLY" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
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
              <Label htmlFor="nextBillingDate">Next Billing Date</Label>
              <Input
                id="nextBillingDate"
                name="nextBillingDate"
                type="date"
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
             <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          
           <div className="grid gap-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select name="paymentMethod" defaultValue="Credit Card" required>
               <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Net Banking">Net Banking</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoRenewal"
              name="autoRenewal"
              checked={autoRenewal}
              onCheckedChange={(checked) => setAutoRenewal(checked as boolean)}
            />
            <Label htmlFor="autoRenewal">Auto Renewal</Label>
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
      {pending ? "Adding..." : "Add Subscription"}
    </Button>
  )
}
