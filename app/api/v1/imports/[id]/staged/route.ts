import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { bulkReviewSchema } from "@/lib/validation/budget"
import { applyReview } from "@/lib/services/import.service"

export const runtime = "nodejs"

/** PATCH staged rows (edits + review status) for an import. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = bulkReviewSchema.safeParse(body)
    if (!parsed.success) {
      throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    }
    return applyReview(userId, id, parsed.data.rows)
  })
}
