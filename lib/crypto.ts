import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

/**
 * Symmetric field encryption (AES-256-GCM) for secrets at rest — currently the
 * Google OAuth tokens on `GmailConnection`. The key is derived from the
 * `ENCRYPTION_KEY` env var (any string; we sha256 it to a fixed 32 bytes), so a
 * rotated/garbage key fails closed rather than corrupting silently.
 *
 * Wire format (base64): `iv(12) | authTag(16) | ciphertext`.
 */

function key(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) throw new Error("ENCRYPTION_KEY is not configured")
  return createHash("sha256").update(secret).digest()
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString("base64")
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64")
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const enc = buf.subarray(28)
  const decipher = createDecipheriv("aes-256-gcm", key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8")
}
