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
import { Textarea } from "@/components/ui/textarea"
import { createInvestment } from "@/app/actions/investment"
import { toast } from "sonner"
import { Plus } from "lucide-react"

const ASSET_CLASSES = [
  "EQUITY",
  "DEBT",
  "HYBRID",
  "FD",
  "PPF",
  "NPS",
  "GOLD",
  "REAL_ESTATE",
  "EPF",
  "BONDS",
  "OTHERS",
]

export function AddInvestmentDialog() {
  const [open, setOpen] = useState(false)

  async function handleSubmit(formData: FormData) {
    const result = await createInvestment(undefined, formData)
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
          Add Investment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Investment</DialogTitle>
          <DialogDescription>
            Track your assets and investments.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="assetClass">Asset Class</Label>
            <Select name="assetClass" required>
              <SelectTrigger>
                <SelectValue placeholder="Select asset class" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CLASSES.map((ac) => (
                  <SelectItem key={ac} value={ac}>
                    {ac.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assetName">Asset Name</Label>
            <Input
              id="assetName"
              name="assetName"
              placeholder="e.g. HDFC Bank, SBI PPF"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.001"
                placeholder="1"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="purchasePrice">Purchase Price (Per Unit)</Label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currentPrice">Current Price (Optional)</Label>
              <Input
                id="currentPrice"
                name="currentPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maturityDate">Maturity Date (Optional)</Label>
            <Input id="maturityDate" name="maturityDate" type="date" />
          </div>

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
      {pending ? "Adding..." : "Add Investment"}
    </Button>
  )
}
