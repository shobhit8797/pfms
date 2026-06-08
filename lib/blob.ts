import { del, head } from "@vercel/blob"

/**
 * Thin wrapper around Vercel Blob. Receipts and statements are uploaded
 * client-side via the token route (app/api/v1/blob/upload), so there is no
 * server-side `put` here — only lifecycle helpers used by services.
 *
 * v1 note: blobs use `access: "public"` with unguessable random pathnames.
 * The signed/private-read flow is a follow-up once iOS needs authenticated reads.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10MB (per CLAUDE.md)

export const RECEIPT_PREFIX = "receipts"
export const STATEMENT_PREFIX = "statements"

export const RECEIPT_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]

export const STATEMENT_CONTENT_TYPES = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]

/** Deletes a blob by URL (best-effort; used to honour "delete source file"). */
export async function deleteBlob(url: string): Promise<void> {
  try {
    await del(url)
  } catch (err) {
    console.error("Blob delete failed:", err)
  }
}

/** Fetches the raw bytes of a blob (used by the extraction worker). */
export async function fetchBlobBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch blob (${res.status})`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function blobExists(url: string): Promise<boolean> {
  try {
    await head(url)
    return true
  } catch {
    return false
  }
}
