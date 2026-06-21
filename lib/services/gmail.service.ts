import { prisma } from "@/lib/db"
import { notFound } from "@/lib/errors"
import { decryptSecret, encryptSecret } from "@/lib/crypto"
import {
  exchangeCode,
  fetchGoogleEmail,
  refreshAccessToken,
  type GoogleTokens,
} from "@/lib/google/oauth"
import { getParsedMessage, listMessageIds, listMessageIdsPage } from "@/lib/google/gmail"
import { ingestMessage } from "@/lib/services/message.service"
import type { GmailConnection } from "@prisma/client"

/**
 * Gmail connection + background email sync. Authorizes read access to a user's
 * Gmail, then periodically pulls transaction-looking emails and feeds them to
 * the message pipeline (same parse → dedupe → review path as SMS). Tokens are
 * encrypted at rest; every query is userId-scoped.
 */

// Default Gmail search. Intentionally transaction-leaning and excludes bulk
// promo/social mail; the LLM `isTransaction` gate discards the rest downstream.
const DEFAULT_QUERY =
  '(debited OR credited OR spent OR "payment" OR transaction OR txn OR receipt OR invoice OR "order placed" OR "order confirmed") -category:promotions -category:social'

/**
 * High-signal curated sources for one user: their **Expenses** Gmail label plus
 * Gmail's built-in **Purchases** category (order confirmations, receipts). Used
 * as the backfill target and OR-ed into ongoing sync by `enableCuratedCapture`.
 */
export const CURATED_QUERY = "(label:expenses) OR (category:purchases)"

/** Ongoing per-connection sync once curated capture is on: curated OR keywords. */
export const CURATED_SYNC_QUERY = `${CURATED_QUERY} OR (${DEFAULT_QUERY})`

const MAX_MESSAGES_PER_SYNC = 25
const FIRST_SYNC_LOOKBACK = "newer_than:30d" // don't pull years of history on connect
const BACKFILL_MAX = 300 // safety cap for the one-time catch-up (logs if hit)

// ---- Connect / status / disconnect -----------------------------------------

/** Completes the OAuth flow: exchanges the code, stores the encrypted tokens. */
export async function connectFromCode(userId: string, code: string): Promise<GmailConnection> {
  const tokens = await exchangeCode(code)
  if (!tokens.refreshToken) {
    // Without offline access we can't poll later; force a clean re-consent.
    throw new Error("Google did not return a refresh token — reconnect and grant offline access")
  }
  const email = (await fetchGoogleEmail(tokens.accessToken)) ?? "unknown"
  return prisma.gmailConnection.upsert({
    where: { userId },
    create: {
      userId,
      email,
      accessTokenEnc: encryptSecret(tokens.accessToken),
      refreshTokenEnc: encryptSecret(tokens.refreshToken),
      expiresAt: tokens.expiresAt,
      status: "CONNECTED",
    },
    update: {
      email,
      accessTokenEnc: encryptSecret(tokens.accessToken),
      refreshTokenEnc: encryptSecret(tokens.refreshToken),
      expiresAt: tokens.expiresAt,
      status: "CONNECTED",
      lastError: null,
    },
  })
}

export async function getConnectionStatus(userId: string) {
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } })
  if (!conn) return { connected: false as const }
  return {
    connected: true as const,
    email: conn.email,
    status: conn.status,
    lastSyncedAt: conn.lastSyncedAt,
  }
}

export async function disconnect(userId: string) {
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } })
  if (!conn) throw notFound("No connected Google account")
  // Best-effort token revocation at Google (don't block on failure).
  try {
    const token = decryptSecret(conn.refreshTokenEnc)
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" })
  } catch {
    // ignore
  }
  await prisma.gmailConnection.delete({ where: { userId } })
  return { ok: true as const }
}

// ---- Sync -------------------------------------------------------------------

/** Returns a valid access token, refreshing + persisting if it has expired. */
async function freshAccessToken(conn: GmailConnection): Promise<string> {
  if (conn.expiresAt.getTime() > Date.now()) return decryptSecret(conn.accessTokenEnc)
  const refreshed: GoogleTokens = await refreshAccessToken(decryptSecret(conn.refreshTokenEnc))
  await prisma.gmailConnection.update({
    where: { userId: conn.userId },
    data: { accessTokenEnc: encryptSecret(refreshed.accessToken), expiresAt: refreshed.expiresAt },
  })
  return refreshed.accessToken
}

/** Fetches one email, normalizes it to message text, and runs it through ingest. */
async function ingestEmail(
  userId: string,
  accessToken: string,
  id: string
): Promise<{ duplicate: boolean; date: Date }> {
  const email = await getParsedMessage(accessToken, id)
  const text = `Subject: ${email.subject ?? ""}\nFrom: ${email.from ?? ""}\n\n${email.body}`.slice(0, 20000)
  const res = await ingestMessage(userId, {
    text,
    sender: email.from ?? undefined,
    receivedAt: email.date,
    source: "EMAIL",
  })
  return { duplicate: res.duplicate, date: email.date }
}

function buildQuery(conn: GmailConnection): string {
  const base = conn.syncQuery?.trim() || DEFAULT_QUERY
  if (!conn.lastSyncedAt) return `${base} ${FIRST_SYNC_LOOKBACK}`
  // Gmail accepts a unix-seconds watermark; small 60s overlap is fine (deduped).
  const after = Math.floor((conn.lastSyncedAt.getTime() - 60_000) / 1000)
  return `${base} after:${after}`
}

/**
 * Pulls new transaction emails for one connection and runs each through
 * `ingestMessage` (which parses, dedupes SMS↔email, and queues). Advances the
 * sync watermark. Marks the connection REVOKED/ERROR on auth/other failures.
 */
export async function syncConnection(userId: string): Promise<{ fetched: number; queued: number }> {
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } })
  if (!conn || conn.status === "REVOKED") return { fetched: 0, queued: 0 }

  let accessToken: string
  try {
    accessToken = await freshAccessToken(conn)
  } catch (err) {
    await prisma.gmailConnection.update({
      where: { userId },
      data: { status: "REVOKED", lastError: err instanceof Error ? err.message : "token refresh failed" },
    })
    return { fetched: 0, queued: 0 }
  }

  try {
    const ids = await listMessageIds(accessToken, buildQuery(conn), MAX_MESSAGES_PER_SYNC)
    let queued = 0
    let newest = conn.lastSyncedAt?.getTime() ?? 0
    for (const id of ids) {
      const res = await ingestEmail(userId, accessToken, id)
      newest = Math.max(newest, res.date.getTime())
      if (!res.duplicate) queued++
    }
    await prisma.gmailConnection.update({
      where: { userId },
      data: {
        lastSyncedAt: newest ? new Date(newest) : new Date(),
        status: "CONNECTED",
        lastError: null,
      },
    })
    return { fetched: ids.length, queued }
  } catch (err) {
    await prisma.gmailConnection.update({
      where: { userId },
      data: { status: "ERROR", lastError: err instanceof Error ? err.message : "sync failed" },
    })
    return { fetched: 0, queued: 0 }
  }
}

/**
 * One-time catch-up: pulls **all** messages matching `query` (no watermark/date
 * bound), paging past the per-sync cap, and ingests each. Unlike `syncConnection`
 * it does not move the sync watermark — ongoing forward-sync is untouched — and
 * it walks every page so old mail (e.g. emails you labeled long ago) is included.
 * Idempotent: ingest dedupes by text + transaction fingerprint, so re-running is
 * safe. `truncated` is true when `max` was hit and more mail remains.
 */
export async function backfillConnection(
  userId: string,
  query: string,
  max = BACKFILL_MAX
): Promise<{ fetched: number; queued: number; truncated: boolean }> {
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } })
  if (!conn) throw notFound("No connected Google account")

  let fetched = 0
  let queued = 0
  let truncated = false
  let pageToken: string | undefined
  do {
    // Re-read the connection each page so token refreshes (which persist a new
    // expiry) are picked up — a long backfill can outlive a single access token.
    const live = await prisma.gmailConnection.findUnique({ where: { userId } })
    if (!live) break
    const accessToken = await freshAccessToken(live)

    const { ids, nextPageToken } = await listMessageIdsPage(
      accessToken,
      query,
      Math.min(100, max - fetched),
      pageToken
    )
    for (const id of ids) {
      const res = await ingestEmail(userId, accessToken, id)
      fetched++
      if (!res.duplicate) queued++
    }
    pageToken = nextPageToken
    if (fetched >= max && pageToken) {
      truncated = true
      break
    }
  } while (pageToken)

  return { fetched, queued, truncated }
}

/**
 * Turns on curated capture for one connection: points ongoing sync at the
 * Expenses label + Purchases category (in addition to keywords) and backfills the
 * existing curated mail. Idempotent. `max` bounds the backfill's fetch count —
 * interactive callers pass a small value to stay within the request timeout;
 * re-running goes deeper (already-imported mail dedupes without re-parsing).
 */
export async function enableCuratedCapture(
  userId: string,
  max = BACKFILL_MAX
): Promise<{ fetched: number; queued: number; truncated: boolean }> {
  const conn = await prisma.gmailConnection.findUnique({ where: { userId } })
  if (!conn) throw notFound("No connected Google account")
  await prisma.gmailConnection.update({ where: { userId }, data: { syncQuery: CURATED_SYNC_QUERY } })
  return backfillConnection(userId, CURATED_QUERY, max)
}

/** Cron entrypoint: sync the least-recently-synced connected accounts. */
export async function syncDueConnections(limit = 20): Promise<{ synced: number; queued: number }> {
  const due = await prisma.gmailConnection.findMany({
    where: { status: "CONNECTED" },
    orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } },
    take: limit,
    select: { userId: true },
  })
  let queued = 0
  for (const c of due) {
    const r = await syncConnection(c.userId)
    queued += r.queued
  }
  return { synced: due.length, queued }
}
