/**
 * One-off: enable curated Gmail capture for a connection — point ongoing sync at
 * the "Expenses" label + Gmail's "Purchases" category (in addition to the
 * transaction keywords) and backfill all existing curated mail into the review
 * queue.
 *
 *   bun run scripts/gmail-expenses-label.ts [connected-email]
 *
 * - Pass the connected Gmail address to pick a connection; omit it only if
 *   there is exactly one GmailConnection in the DB.
 * - Reads .env automatically (DATABASE_URL, ENCRYPTION_KEY, GOOGLE_CLIENT_ID/
 *   SECRET for token refresh, and the message-parse LLM key).
 * - Idempotent — ingest dedupes — so it's safe to re-run.
 * - This is the deep/unbounded equivalent of the in-app "Import Expenses &
 *   Purchases" button (which caps the fetch count to fit a request window).
 *
 * Note: ongoing sync applies the date watermark to every branch, so labeling an
 * *old* email later won't auto-capture it (Gmail `after:` filters by the email's
 * date, not when you labeled it). Re-run this script to sweep up such mail.
 */
import { prisma } from "@/lib/db"
import { CURATED_SYNC_QUERY, enableCuratedCapture } from "@/lib/services/gmail.service"

async function pickConnection(email?: string) {
  if (email) {
    const conn = await prisma.gmailConnection.findFirst({ where: { email } })
    if (!conn) throw new Error(`No GmailConnection for ${email}`)
    return conn
  }
  const all = await prisma.gmailConnection.findMany()
  if (all.length === 0) throw new Error("No GmailConnection rows found")
  if (all.length > 1) {
    throw new Error(
      `Found ${all.length} connections (${all.map((c) => c.email).join(", ")}). ` +
        "Pass the connected email as an argument to choose one."
    )
  }
  return all[0]
}

async function main() {
  const conn = await pickConnection(process.argv[2])
  console.log(`Connection: ${conn.email} (user ${conn.userId}) — status ${conn.status}`)
  if (conn.status !== "CONNECTED") {
    console.warn("⚠️  Connection is not CONNECTED; reconnect Gmail in the app first if this fails.")
  }
  console.log(`Ongoing syncQuery will be set to:\n  ${CURATED_SYNC_QUERY}\n`)

  console.log('Enabling curated capture + backfilling "Expenses" label and Purchases category…')
  const res = await enableCuratedCapture(conn.userId)
  console.log(
    `✓ Done — fetched ${res.fetched}, newly queued ${res.queued}` +
      (res.truncated ? " (safety cap hit — re-run to continue)" : "")
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
