"use client"

import { useRef, useState } from "react"
import { upload } from "@vercel/blob/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, Loader2, X } from "lucide-react"
import { startImport } from "@/app/actions/budget/import"
import type { ImportFileType } from "@prisma/client"

function detectType(file: File): ImportFileType | null {
  const name = file.name.toLowerCase()
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "PDF"
  if (file.type === "text/csv" || name.endsWith(".csv")) return "CSV"
  if (file.type.startsWith("image/")) return "IMAGE"
  return null
}

const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)

export function ImportDropzone() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)

  function pick(f: File | null) {
    if (!f) return
    if (!detectType(f)) {
      toast.error("Unsupported file. Upload a PDF, CSV, or image.")
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File exceeds the 10MB limit.")
      return
    }
    setFile(f)
  }

  async function process() {
    if (!file) return
    const fileType = detectType(file)!
    setProcessing(true)
    try {
      const blob = await upload(`statements/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/v1/blob/upload",
      })
      const result = await startImport(blob.url, file.name, fileType)
      if (result.error) {
        toast.error(result.error)
        setProcessing(false)
        return
      }
      const data = result.data as { id: string }
      toast.success("Extracting transactions…")
      router.push(`/dashboard/budget/imports/${data.id}/review`)
    } catch (err) {
      toast.error((err as Error).message || "Upload failed")
      setProcessing(false)
    }
  }

  return (
    <Card className="bg-card border-border border-dashed">
      <CardContent className="py-8">
        {!file ? (
          <div
            className="flex flex-col items-center gap-3 text-center cursor-pointer"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              pick(e.dataTransfer.files?.[0] ?? null)
            }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Drop a bank statement, or click to choose</p>
              <p className="text-sm text-muted-foreground mt-1">PDF, CSV or image · up to 10MB</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,text/csv,image/*"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{fmtSize(file.size)} · {detectType(file)}</p>
              </div>
              {!processing && (
                <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              The file will be sent to an AI model for extraction. Nothing is added to your ledger
              until you review and approve it.
            </p>
            <div className="flex gap-2">
              <Button onClick={process} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {processing ? "Processing…" : "Extract transactions"}
              </Button>
              {!processing && (
                <Button variant="outline" onClick={() => setFile(null)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
