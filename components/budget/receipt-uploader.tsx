"use client"

import { useRef, useState, useTransition } from "react"
import { upload } from "@vercel/blob/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Paperclip, Loader2, X, FileText } from "lucide-react"
import { linkReceipt, removeReceipt } from "@/app/actions/budget/receipt"

export type ReceiptItem = { id: string; fileUrl: string; thumbnailUrl: string | null }

export function ReceiptUploader({
  transactionId,
  receipts: initialReceipts,
}: {
  transactionId: string
  receipts: ReceiptItem[]
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [receipts, setReceipts] = useState<ReceiptItem[]>(initialReceipts)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const blob = await upload(`receipts/${transactionId}/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/v1/blob/upload",
        })
        const result = await linkReceipt(blob.url, { transactionId })
        if (result.error) {
          toast.error(result.error)
        } else {
          const data = result.data as { id: string; fileUrl: string }
          setReceipts((prev) => [...prev, { id: data.id, fileUrl: data.fileUrl, thumbnailUrl: null }])
        }
      }
      toast.success("Receipt attached")
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message || "Upload failed")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function onRemove(id: string) {
    startTransition(async () => {
      const result = await removeReceipt(id)
      if (result.error) toast.error(result.error)
      else {
        setReceipts((prev) => prev.filter((r) => r.id !== id))
        router.refresh()
      }
    })
  }

  const isPdf = (url: string) => url.toLowerCase().split("?")[0].endsWith(".pdf")

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {receipts.map((r) => (
          <div key={r.id} className="relative group">
            <a href={r.fileUrl} target="_blank" rel="noopener noreferrer">
              {isPdf(r.fileUrl) ? (
                <div className="w-16 h-16 rounded-lg border border-border bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={r.thumbnailUrl ?? r.fileUrl}
                  alt="Receipt"
                  className="w-16 h-16 rounded-lg border border-border object-cover"
                />
              )}
            </a>
            <button
              type="button"
              disabled={isPending}
              onClick={() => onRemove(r.id)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              aria-label="Remove receipt"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Paperclip className="w-4 h-4 mr-2" />
        )}
        {uploading ? "Uploading..." : "Attach receipt"}
      </Button>
    </div>
  )
}
