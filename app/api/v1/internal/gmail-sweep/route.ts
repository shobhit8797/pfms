import { NextResponse } from "next/server"
import { syncDueConnections } from "@/lib/services/gmail.service"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * Periodic Gmail sync (Vercel Cron). Polls connected accounts for new
 * transaction emails and queues them for review. Guarded by CRON_SECRET.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = request.headers.get("authorization")
  const cronOk = process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
  if (!cronOk) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = await syncDueConnections()
  return NextResponse.json(result)
}
