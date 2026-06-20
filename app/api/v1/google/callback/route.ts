import { after } from "next/server"
import { verifyState } from "@/lib/google/oauth"
import { connectFromCode, syncConnection } from "@/lib/services/gmail.service"

export const runtime = "nodejs"

// Where to bounce the browser back to the app after consent. Custom scheme so
// the OS reopens the Expo app; the app refreshes its connection status on focus.
const RETURN_URL = process.env.APP_OAUTH_RETURN_URL || "pfms://gmail-connected"

/** Minimal HTML that deep-links back into the app and degrades to a manual tap. */
function page(ok: boolean, message: string): Response {
  const deep = `${RETURN_URL}?ok=${ok ? 1 : 0}${ok ? "" : `&error=${encodeURIComponent(message)}`}`
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ok ? "Connected" : "Connection failed"}</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#f9fafb;color:#111827;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}
.card{max-width:380px;text-align:center;background:#fff;border-radius:20px;padding:32px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
h1{font-size:20px;margin:0 0 8px}p{color:#6b7280;font-size:14px;line-height:1.5;margin:0 0 20px}
a{display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px}</style>
<script>setTimeout(function(){location.href=${JSON.stringify(deep)}},400)</script></head>
<body><div class="card"><h1>${ok ? "Gmail connected ✓" : "Couldn't connect"}</h1>
<p>${ok ? "Your transaction emails will start appearing in the app to review." : message}</p>
<a href="${deep}">Return to the app</a></div></body></html>`
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")

  if (oauthError) return page(false, oauthError)
  if (!code || !state) return page(false, "Missing authorization code")

  const userId = verifyState(state)
  if (!userId) return page(false, "This connection link expired — try again")

  try {
    await connectFromCode(userId, code)
    // Kick off a first sync in the background so results show up quickly.
    after(async () => {
      await syncConnection(userId).catch(() => {})
    })
    return page(true, "")
  } catch (e) {
    return page(false, e instanceof Error ? e.message : "Connection failed")
  }
}
