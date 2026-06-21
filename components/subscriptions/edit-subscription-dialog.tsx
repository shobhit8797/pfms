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
import { updateSubscription } from "@/app/actions/subscription"
import { toast } from "sonner"
import { Pencil, Loader2 } from "lucide-react"

const SUBSCRIPTION_CATEGORIES = ["Entertainment", "Software", "Utilities", "Health & Fitness", "Education", "Other"]

export type EditableSubscription = {
  id: string
  serviceName: string
  amount: number
  billingCycle: string
  startDate: string | Date
  endDate: string | Date | null
  nextBillingDate: string | Date
  autoRenewal: boolean
  category: string
  paymentMethod: string
  notes: string | null
}

function toDateInput(d: string | Date | null): string {
  if (!d) return ""
  return new Date(d).toISOString().split("T")[0]
}

export function EditSubscriptionDialog({ subscription }: { subscription: EditableSubscription }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [billingCycle, setBillingCycle] = useState(subscription.billingCycle)
  const [category, setCategory] = useState(subscription.category)
  const [paymentMethod, setPaymentMethod] = useState(subscription.paymentMethod)
  const [autoRenewal, setAutoRenewal] = useState(subscription.autoRenewal)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSubscription(subscription.id, formData)
      if (result?.error) toast.error(result.error)
      else if (result?.success) {
        toast.success(result.success)
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Pencil className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>Update {subscription.serviceName}.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="serviceName">Service Name</Label>
            <Input id="serviceName" name="serviceName" defaultValue={subscription.serviceName} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" step="0.01" defaultValue={subscription.amount} required />
            </div>
            <div className="grid gap-2">
              <Label>Billing Cycle</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="billingCycle" value={billingCycle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={toDateInput(subscription.startDate)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nextBillingDate">Next Billing Date</Label>
              <Input id="nextBillingDate" name="nextBillingDate" type="date" defaultValue={toDateInput(subscription.nextBillingDate)} required />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="category" value={category} />
          </div>

          <div className="grid gap-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="Debit Card">Debit Card</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Net Banking">Net Banking</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="paymentMethod" value={paymentMethod} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={subscription.notes || ""} placeholder="Additional details..." />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="autoRenewal" checked={autoRenewal} onCheckedChange={(c) => setAutoRenewal(c as boolean)} />
            <Label htmlFor="autoRenewal">Auto Renewal</Label>
            <input type="hidden" name="autoRenewal" value={autoRenewal ? "on" : ""} />
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
