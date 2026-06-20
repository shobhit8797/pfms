import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { extractReceipt } from "@/lib/llm/receipt"

export const runtime = "nodejs"
// Receipt OCR via a vision model can take a while; allow a generous budget.
export const maxDuration = 60

/** Rough cap on the inbound data URL (~10MB file ≈ 13.5MB base64). */
const MAX_DATA_URL_LENGTH = 14_000_000

/**
 * POST /api/v1/expenses/scan
 * Body: { image: "data:image/jpeg;base64,..." | "data:application/pdf;base64,..." }
 * Runs the receipt through a Gemini vision model (OpenRouter) and returns the
 * structured fields to pre-fill the expense form. Does NOT persist anything.
 */
export async function POST(request: Request) {
  return withApiUser(request, async () => {
    const body = (await request.json().catch(() => ({}))) as { image?: unknown }
    const image = body.image

    if (typeof image !== "string" || !image.startsWith("data:")) {
      throw new ServiceError("VALIDATION", "Provide the receipt as a base64 data URL in `image`")
    }
    if (!/^data:(image\/|application\/pdf)/i.test(image)) {
      throw new ServiceError("VALIDATION", "Only image or PDF receipts are supported")
    }
    if (image.length > MAX_DATA_URL_LENGTH) {
      throw new ServiceError("VALIDATION", "Receipt is too large (10MB max)")
    }

    try {
      const { fields } = await extractReceipt(image)
      return fields
    } catch (err) {
      console.error("Receipt scan failed:", err)
      throw new ServiceError("INTERNAL", "Could not read the receipt. Enter the details manually.")
    }
  })
}
