import { createHmac, timingSafeEqual } from "crypto"

/**
 * Google OAuth 2.0 helpers for Gmail read access (raw fetch — no googleapis SDK).
 * This authorizes *data access* to the user's Gmail (separate from app login),
 * requesting offline access so the backend can poll for transaction emails.
 *
 * Required env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI
 * (must exactly match an Authorized redirect URI on the OAuth client, e.g.
 * https://<host>/api/v1/google/callback). State is signed with NEXTAUTH_SECRET.
 */

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
]

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
const STATE_TTL_MS = 10 * 60 * 1000 // a connect attempt must complete in 10 min

export type GoogleTokens = {
  accessToken: string
  /** Only present on the first consent (access_type=offline, prompt=consent). */
  refreshToken?: string
  expiresAt: Date
  scope?: string
}

function cfg() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth is not configured (set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI)")
  }
  return { clientId, clientSecret, redirectUri }
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url")
}

/** Signs `{uid, exp}` so the stateless callback can trust who started the flow. */
export function signState(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "dev-secret"
  const payload = b64url(JSON.stringify({ uid: userId, exp: Date.now() + STATE_TTL_MS }))
  const sig = createHmac("sha256", secret).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

/** Verifies a state string and returns the userId, or null if invalid/expired. */
export function verifyState(state: string): string | null {
  const [payload, sig] = state.split(".")
  if (!payload || !sig) return null
  const secret = process.env.NEXTAUTH_SECRET || "dev-secret"
  const expected = createHmac("sha256", secret).update(payload).digest("base64url")
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { uid: string; exp: number }
    if (!uid || typeof exp !== "number" || exp < Date.now()) return null
    return uid
  } catch {
    return null
  }
}

export function buildConsentUrl(state: string): string {
  const { clientId, redirectUri } = cfg()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent", // force a refresh_token every time
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  error?: string
  error_description?: string
}

async function postToken(body: URLSearchParams): Promise<GoogleTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const data = (await res.json()) as TokenResponse
  if (!res.ok || data.error) {
    throw new Error(`Google token exchange failed: ${data.error_description ?? data.error ?? res.status}`)
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in - 60) * 1000), // refresh a minute early
    scope: data.scope,
  }
}

/** Exchanges the consent `code` for access + refresh tokens. */
export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const { clientId, clientSecret, redirectUri } = cfg()
  return postToken(
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    })
  )
}

/** Refreshes the access token using a stored refresh token. */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = cfg()
  const tokens = await postToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    })
  )
  return { ...tokens, refreshToken } // refresh grant doesn't return a new refresh token
}

/** Reads the connected account's email address. */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return null
  const data = (await res.json()) as { email?: string }
  return data.email ?? null
}
