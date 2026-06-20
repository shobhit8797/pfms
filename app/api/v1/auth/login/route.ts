import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { issueApiToken } from "@/lib/services/token.service"

export const runtime = "nodejs"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  deviceName: z.string().max(60).optional(),
})

/**
 * Email + password → long-lived bearer ApiToken for native clients. Mirrors the
 * NextAuth Credentials provider's bcrypt check (auth.ts), then mints a token via
 * the token service. The plaintext token is returned once; only its hash is stored.
 *
 * TODO(security): add IP/email rate-limiting before public exposure to blunt
 * credential-stuffing (this endpoint is unauthenticated by design).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input", code: "VALIDATION" }, { status: 422 })
  }

  const { email, password, deviceName } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  // Same generic message whether the user is missing, OAuth-only, or the
  // password is wrong — don't leak which accounts exist.
  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Invalid email or password", code: "UNAUTHORIZED" }, { status: 401 })
  }

  const { token } = await issueApiToken(user.id, deviceName ?? "Mobile app")
  return NextResponse.json({ token, user: { id: user.id, name: user.name, email: user.email } })
}
