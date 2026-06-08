"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StatementUploadDialog } from "./statement-upload-dialog"
import { Upload } from "lucide-react"

interface StatementUploadSectionProps {
  accountId: string
}

export function StatementUploadSection({ accountId }: StatementUploadSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
        <div className="text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading text-lg font-semibold">Statement Upload</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Upload your bank statement (CSV, Excel, or PDF) to automatically import
            transactions.
          </p>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Select File
          </Button>
        </div>
      </div>

      <StatementUploadDialog
        accountId={accountId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
