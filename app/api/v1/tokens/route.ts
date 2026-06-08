import { withApiUser } from "@/lib/api-auth"
import { issueApiToken, listApiTokens } from "@/lib/services/token.service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, (userId) => listApiTokens(userId))
}

export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = (await request.json().catch(() => ({}))) as { name?: string; expiresAt?: string }
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined
    return issueApiToken(userId, body.name, expiresAt)
  })
}
