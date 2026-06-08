import { createHash, randomBytes } from "crypto"
import { prisma } from "@/lib/db"
import { notFound } from "@/lib/errors"

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/**
 * Issues a long-lived bearer token for a native client. The plaintext is shown
 * exactly once (only its sha256 hash is stored).
 */
export async function issueApiToken(userId: string, name?: string, expiresAt?: Date) {
  const plaintext = "pfms_" + randomBytes(32).toString("hex")
  const record = await prisma.apiToken.create({
    data: { userId, tokenHash: hashToken(plaintext), name: name ?? null, expiresAt: expiresAt ?? null },
  })
  return { id: record.id, token: plaintext, name: record.name, createdAt: record.createdAt }
}

export async function listApiTokens(userId: string) {
  return prisma.apiToken.findMany({
    where: { userId, revokedAt: null },
    select: { id: true, name: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function revokeApiToken(userId: string, id: string) {
  const token = await prisma.apiToken.findFirst({ where: { id, userId } })
  if (!token) throw notFound("Token not found")
  await prisma.apiToken.update({ where: { id }, data: { revokedAt: new Date() } })
  return { id }
}

/** Resolves a plaintext bearer token to a userId, or null if invalid/expired. */
export async function resolveApiToken(token: string): Promise<string | null> {
  const record = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!record) return null
  if (record.revokedAt) return null
  if (record.expiresAt && record.expiresAt < new Date()) return null
  // Best-effort last-used stamp (don't block the request on it).
  prisma.apiToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {})
  return record.userId
}
