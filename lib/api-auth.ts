import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { resolveApiToken } from "@/lib/services/token.service"
import { ServiceError, statusForCode } from "@/lib/errors"

/**
 * Resolves the authenticated user for a REST request. Accepts either a native
 * client's `Authorization: Bearer <token>` or the web session cookie, so the
 * same routes serve both iOS and the web.
 */
export async function requireApiUser(request: Request): Promise<string> {
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim()
    const userId = await resolveApiToken(token)
    if (userId) return userId
    throw new ServiceError("UNAUTHORIZED", "Invalid or expired token")
  }

  const session = await auth()
  if (session?.user?.id) return session.user.id

  throw new ServiceError("UNAUTHORIZED", "Authentication required")
}

/** Wraps a REST handler: resolves auth, runs it, and maps errors to HTTP. */
export async function withApiUser(
  request: Request,
  handler: (userId: string) => Promise<unknown>
): Promise<NextResponse> {
  try {
    const userId = await requireApiUser(request)
    const data = await handler(userId)
    return NextResponse.json(data ?? { ok: true })
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: statusForCode(error.code) })
    }
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
