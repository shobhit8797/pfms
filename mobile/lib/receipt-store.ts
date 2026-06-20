import * as FileSystem from "expo-file-system/legacy"
import { API_BASE_URL } from "./config"

/**
 * Receipt storage helpers for the native client:
 *  - `uploadReceipt` streams the file (raw binary) to the backend, which stores
 *    it in Vercel Blob and returns the public URL.
 *  - `cacheReceiptLocally` / `localReceiptUri` keep a copy on the device keyed by
 *    the expense id, so a receipt stays viewable offline and is easy to map back
 *    to its expense. The cache lives under `cacheDirectory` (OS may evict it),
 *    which matches "keep it locally for some time".
 */

const RECEIPT_DIR = (FileSystem.cacheDirectory ?? "") + "receipts/"
const CACHE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "pdf"]

function extFor(name: string, isPdf: boolean): string {
  const fromName = name.split(".").pop()?.toLowerCase()
  if (fromName && CACHE_EXTENSIONS.includes(fromName)) return fromName
  return isPdf ? "pdf" : "jpg"
}

/** Uploads a receipt file to the backend Blob store. Returns the stored URL + name. */
export async function uploadReceipt(opts: {
  uri: string
  mime: string
  name: string
  token: string
}): Promise<{ url: string; name: string }> {
  const res = await FileSystem.uploadAsync(`${API_BASE_URL}/api/v1/blob/receipt`, opts.uri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${opts.token}`,
      "Content-Type": opts.mime,
      "x-file-name": opts.name,
    },
  })
  if (res.status < 200 || res.status >= 300) {
    let message = "Could not upload the receipt"
    try {
      message = (JSON.parse(res.body) as { error?: string }).error ?? message
    } catch {
      // non-JSON body; keep the default message
    }
    throw new Error(message)
  }
  return JSON.parse(res.body) as { url: string; name: string }
}

/** Copies the attached file into the local receipt cache, keyed by expense id. */
export async function cacheReceiptLocally(
  expenseId: string,
  fileUri: string,
  name: string,
  isPdf: boolean
): Promise<string> {
  await FileSystem.makeDirectoryAsync(RECEIPT_DIR, { intermediates: true }).catch(() => {})
  const dest = `${RECEIPT_DIR}${expenseId}.${extFor(name, isPdf)}`
  await FileSystem.copyAsync({ from: fileUri, to: dest })
  return dest
}

/** Returns the cached local URI for an expense's receipt, or null if not cached. */
export async function localReceiptUri(expenseId: string): Promise<string | null> {
  for (const ext of CACHE_EXTENSIONS) {
    const path = `${RECEIPT_DIR}${expenseId}.${ext}`
    const info = await FileSystem.getInfoAsync(path)
    if (info.exists) return path
  }
  return null
}
