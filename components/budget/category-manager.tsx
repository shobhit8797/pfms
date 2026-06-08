"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
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
import { Plus, Pencil, Archive, ArchiveRestore } from "lucide-react"
import { saveCategory, setCategoryArchived } from "@/app/actions/budget/category"

type Category = {
  id: string
  name: string
  type: "NEED" | "WANT" | "SAVING"
  colorHex: string
  icon: string
  isArchived: boolean
}

const TYPE_LABEL: Record<string, string> = { NEED: "Need", WANT: "Want", SAVING: "Saving" }

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter()
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CategoryDialog onSaved={() => router.refresh()} />
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 p-3">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.colorHex }} />
            <span className={c.isArchived ? "text-muted-foreground line-through" : "font-medium"}>
              {c.name}
            </span>
            <Badge variant="outline" className="font-normal text-xs">{TYPE_LABEL[c.type]}</Badge>
            <div className="ml-auto flex gap-1">
              <CategoryDialog
                category={c}
                onSaved={() => router.refresh()}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="w-4 h-4" />
                  </Button>
                }
              />
              <ArchiveButton id={c.id} isArchived={c.isArchived} onDone={() => router.refresh()} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ArchiveButton({ id, isArchived, onDone }: { id: string; isArchived: boolean; onDone: () => void }) {
  async function toggle() {
    const result = await setCategoryArchived(id, !isArchived)
    if (result.error) toast.error(result.error)
    else {
      toast.success(result.success ?? "Done")
      onDone()
    }
  }
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle} title={isArchived ? "Restore" : "Archive"}>
      {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
    </Button>
  )
}

function CategoryDialog({
  category,
  onSaved,
  trigger,
}: {
  category?: Category
  onSaved: () => void
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(category?.type ?? "NEED")

  async function handleSubmit(formData: FormData) {
    const result = await saveCategory(undefined, formData)
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
            <Plus className="w-4 h-4 mr-2" /> Add category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "Add category"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 py-2">
          {category && <input type="hidden" name="id" value={category.id} />}
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={category?.name} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Category["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEED">Need</SelectItem>
                  <SelectItem value="WANT">Want</SelectItem>
                  <SelectItem value="SAVING">Saving</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="type" value={type} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="colorHex">Color</Label>
              <Input id="colorHex" name="colorHex" type="color" defaultValue={category?.colorHex ?? "#64748b"} className="h-10 p-1" />
            </div>
          </div>
          <input type="hidden" name="icon" value={category?.icon ?? "Tag"} />
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
