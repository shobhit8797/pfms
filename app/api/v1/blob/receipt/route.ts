import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { MAX_UPLOAD_BYTES, RECEIPT_CONTENT_TYPES, putReceipt } from "@/lib/blob"

export const runtime = "nodejs"
export const maxDuration = 30

/**
 * POST /api/v1/blob/receipt
 * Body: raw binary file. Headers: `Content-Type` = the file's MIME type,
 * `x-file-name` = original name. Stores the receipt in Vercel Blob (scoped to
 * the authenticated user) and returns `{ url, name }`.
 *
 * Native clients use this because they have no browser client-upload primitive.
 * Note: a function request body is subject to the platform's limit (~4.5MB on
 * Vercel); the mobile app compresses images to stay well under it. Moving large
 * PDFs to a direct client→Blob upload is a future hardening.
 */
export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const contentType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase()
    if (!RECEIPT_CONTENT_TYPES.includes(contentType)) {
      throw new ServiceError("VALIDATION", "Unsupported receipt type (use JPEG/PNG/WebP/HEIC/PDF)")
    }

    const buffer = Buffer.from(await request.arrayBuffer())
    if (buffer.byteLength === 0) throw new ServiceError("VALIDATION", "Empty file")
    if (buffer.byteLength > MAX_UPLOAD_BYTES) throw new ServiceError("VALIDATION", "Receipt is too large (10MB max)")

    const fileName = request.headers.get("x-file-name") ?? "receipt"
    const blob = await putReceipt(userId, buffer, { fileName, contentType })
    return { url: blob.url, name: fileName }
  })
}
