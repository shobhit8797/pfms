"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Pencil, Archive, ArchiveRestore } from "lucide-react"
import { savePaymentMode, setPaymentModeArchived } from "@/app/actions/budget/payment-mode"

type PaymentMode = { id: string; name: string; isArchived: boolean }

export function PaymentModeManager({ paymentModes }: { paymentModes: PaymentMode[] }) {
  const router = useRouter()
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ModeDialog onSaved={() => router.refresh()} />
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {paymentModes.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3">
            <span className={p.isArchived ? "text-muted-foreground line-through" : "font-medium"}>
              {p.name}
            </span>
            <div className="ml-auto flex gap-1">
              <ModeDialog
                mode={p}
                onSaved={() => router.refresh()}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="w-4 h-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={p.isArchived ? "Restore" : "Archive"}
                onClick={async () => {
                  const result = await setPaymentModeArchived(p.id, !p.isArchived)
                  if (result.error) toast.error(result.error)
                  else {
                    toast.success(result.success ?? "Done")
                    router.refresh()
                  }
                }}
              >
                {p.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ModeDialog({
  mode,
  onSaved,
  trigger,
}: {
  mode?: PaymentMode
  onSaved: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  async function handleSubmit(formData: FormData) {
    const result = await savePaymentMode(undefined, formData)
    if (result.error) toast.error(result.error)
    else {
      toast.success(result.success ?? "Saved")
      setOpen(false)
      onSaved()
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> Add payment mode
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>{mode ? "Edit payment mode" : "Add payment mode"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-2">
          {mode && <input type="hidden" name="id" value={mode.id} />}
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={mode?.name} required />
          </div>
          <DialogFooter>
            <SaveButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SaveButton() {
  const { pending } = useFormStatus()
  return <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
}
