"use client"

import { useRef, useState } from "react"
import { upload } from "@vercel/blob/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Paperclip, Loader2, FileText, X } from "lucide-react"
import { toast } from "sonner"

/**
 * Client-side receipt/invoice attachment for the income dialogs. Uploads the
 * file directly to Vercel Blob via the token route (`/api/v1/blob/upload`,
 * same flow expense receipts use) and exposes the resulting URL + name through
 * hidden inputs (`receiptUrl`, `receiptName`) that the income Server Action reads.
 */
export function ReceiptUploadField({
  defaultUrl = null,
  defaultName = null,
  onChange,
}: {
  defaultUrl?: string | null
  defaultName?: string | null
  /** Notified on upload/remove so RHF-based dialogs can capture the values. */
  onChange?: (v: { url: string | null; name: string | null }) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(defaultUrl)
  const [name, setName] = useState<string | null>(defaultName)
  const [uploading, setUploading] = useState(false)

  function set(nextUrl: string | null, nextName: string | null) {
    setUrl(nextUrl)
    setName(nextName)
    onChange?.({ url: nextUrl, name: nextName })
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await upload(`receipts/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/v1/blob/upload",
      })
      set(result.url, file.name)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="grid gap-2">
      <Label>Invoice / Pay slip (optional)</Label>
      {/* The Server Action reads these. Empty when nothing attached. */}
      <input type="hidden" name="receiptUrl" value={url ?? ""} />
      <input type="hidden" name="receiptName" value={name ?? ""} />

      {url ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 truncate text-foreground hover:underline">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{name ?? "Attachment"}</span>
          </a>
          <button
            type="button"
            aria-label="Remove attachment"
            onClick={() => set(null, null)}
            className="ml-2 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
          {uploading ? "Uploading..." : "Attach file (image / PDF)"}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={onPick}
      />
    </div>
  )
}
