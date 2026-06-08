import { withApiUser } from "@/lib/api-auth"
import { changedSince } from "@/lib/services/sync.service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, async (userId) => {
    const url = new URL(request.url)
    const sinceParam = url.searchParams.get("since")
    const since = sinceParam ? new Date(sinceParam) : undefined
    if (sinceParam && Number.isNaN(since!.getTime())) {
      return { error: "Invalid 'since' timestamp" }
    }
    return changedSince(userId, since)
  })
}
