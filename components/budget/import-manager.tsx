"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Undo2, FileText } from "lucide-react"
import { undoImportAction } from "@/app/actions/budget/import"

type ImportRow = {
  id: string
  fileName: string | null
  status: string
  committedCount: number
  createdAt: string
}

export function ImportManager({ imports }: { imports: ImportRow[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (imports.length === 0) {
    return <p className="text-sm text-muted-foreground">No committed imports to manage.</p>
  }

  function undo(id: string) {
    startTransition(async () => {
      const result = await undoImportAction(id)
      if (result.error) toast.error(result.error)
      else {
        toast.success(result.success ?? "Reverted")
        router.refresh()
      }
    })
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {imports.map((imp) => (
        <li key={imp.id} className="flex items-center gap-3 p-3">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{imp.fileName ?? "Statement"}</span>
          <Badge variant="outline" className="font-normal text-xs">
            {imp.committedCount} committed
          </Badge>
          {imp.committedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive"
              disabled={isPending}
              onClick={() => undo(imp.id)}
            >
              <Undo2 className="w-4 h-4 mr-1" /> Undo batch
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
