import { withApiUser } from "@/lib/api-auth"
import { enableCuratedCapture } from "@/lib/services/gmail.service"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * Enable curated Gmail capture for the signed-in user: point ongoing sync at the
 * Expenses label + Purchases category (alongside keywords) and import the
 * existing curated mail. The fetch count is bounded so the request returns in
 * time; `truncated: true` means more remains — tap again (already-imported mail
 * dedupes without re-parsing, so repeats are cheap and keep making progress).
 */
export async function POST(request: Request) {
  return withApiUser(request, (userId) => enableCuratedCapture(userId, 80))
}
