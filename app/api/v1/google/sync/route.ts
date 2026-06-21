import { withApiUser } from "@/lib/api-auth"
import { syncConnection } from "@/lib/services/gmail.service"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * On-demand Gmail sync for the signed-in user — the manual equivalent of the
 * cron sweep (`/api/v1/internal/gmail-sweep`). Lets the app offer a "Check now"
 * button so capture works without (or between) scheduled runs. Returns how many
 * emails were fetched and how many were newly queued for review.
 */
export async function POST(request: Request) {
  return withApiUser(request, (userId) => syncConnection(userId))
}
