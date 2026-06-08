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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { saveTransaction } from "@/app/actions/budget/transaction"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { ReceiptUploader, type ReceiptItem } from "./receipt-uploader"

export type CategoryOption = {
  id: string
  name: string
  type: "NEED" | "WANT" | "SAVING"
  colorHex: string
}
export type PaymentModeOption = { id: string; name: string }

export type TransactionInitial = {
  id: string
  date: string
  description: string
  categoryId: string
  amount: number
  paymentModeId: string | null
  type: "NEED" | "WANT" | "SAVING"
  notes: string | null
  receipts?: ReceiptItem[]
}

const TYPE_LABEL: Record<string, string> = { NEED: "Need", WANT: "Want", SAVING: "Saving" }

export function TransactionDialog({
  categories,
  paymentModes,
  initial,
  trigger,
}: {
  categories: CategoryOption[]
  paymentModes: PaymentModeOption[]
  initial?: TransactionInitial
  trigger?: React.ReactNode
}) {
  const isEditing = !!initial
  const [open, setOpen] = useState(false)
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "")
  const [paymentModeId, setPaymentModeId] = useState(initial?.paymentModeId ?? "")
  const [typeOverride, setTypeOverride] = useState<string | undefined>(initial?.type)

  const selectedCategory = categories.find((c) => c.id === categoryId)
  // Type auto-fills from category; user can override.
  const effectiveType = typeOverride ?? selectedCategory?.type

  async function handleSubmit(formData: FormData) {
    const result = await saveTransaction(undefined, formData)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(result.success ?? "Saved")
      setOpen(false)
      if (!isEditing) {
        setCategoryId("")
        setPaymentModeId("")
        setTypeOverride(undefined)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>
            Amount, category and payment mode. Type is set automatically from the category.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-2">
          {isEditing && <input type="hidden" name="id" value={initial.id} />}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0"
                defaultValue={initial?.amount} required autoFocus />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date"
                defaultValue={(initial?.date ?? new Date().toISOString()).split("T")[0]} required />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.colorHex }} />
                      {c.name}
                      <span className="text-xs text-muted-foreground">· {TYPE_LABEL[c.type]}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="categoryId" value={categoryId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Payment mode</Label>
              <Select value={paymentModeId} onValueChange={setPaymentModeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {paymentModes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="paymentModeId" value={paymentModeId} />
            </div>
            <div className="grid gap-2">
              <Label>Type {effectiveType && <Badge variant="outline" className="ml-1 font-normal">{TYPE_LABEL[effectiveType]}</Badge>}</Label>
              <Select value={effectiveType ?? ""} onValueChange={setTypeOverride}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEED">Need</SelectItem>
                  <SelectItem value="WANT">Want</SelectItem>
                  <SelectItem value="SAVING">Saving</SelectItem>
                </SelectContent>
              </Select>
              {effectiveType && <input type="hidden" name="type" value={effectiveType} />}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" defaultValue={initial?.description}
              placeholder="What was this for?" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""}
              placeholder="Optional" rows={2} />
          </div>

          {isEditing && (
            <div className="grid gap-2">
              <Label>Receipts</Label>
              <ReceiptUploader transactionId={initial.id} receipts={initial.receipts ?? []} />
            </div>
          )}

          <DialogFooter>
            <SubmitButton isEditing={isEditing} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : isEditing ? "Save changes" : "Add transaction"}
    </Button>
  )
}
