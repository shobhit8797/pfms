import { NextResponse } from "next/server"
import { runRecurringBilling } from "@/lib/services/recurring.service"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * Vercel Cron entry point for recurring automation. Posts due subscription charges
 * as Expenses and rolls nextBillingDate forward. Secret-guarded (CRON_SECRET or the
 * worker secret), mirroring the extract-sweep route.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = request.headers.get("authorization")
  const cronOk = process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`
  const workerOk =
    process.env.EXTRACT_WORKER_SECRET &&
    request.headers.get("x-worker-secret") === process.env.EXTRACT_WORKER_SECRET
  if (!cronOk && !workerOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runRecurringBilling()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Recurring billing error:", error)
    return NextResponse.json({ error: "Recurring billing failed" }, { status: 500 })
  }
}
