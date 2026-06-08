import { NextResponse } from "next/server"
import { runExtractionForImport } from "@/lib/services/import.service"

export const runtime = "nodejs"
export const maxDuration = 120

/**
 * Internal extraction worker. Guarded by a shared secret. Used as the target for
 * re-driving imports (cron sweep) and by non-web clients; the web path triggers
 * extraction inline via after() in the startImport action.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = request.headers.get("x-worker-secret")
  if (!process.env.EXTRACT_WORKER_SECRET || secret !== process.env.EXTRACT_WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { importId, userId } = (await request.json()) as { importId?: string; userId?: string }
  if (!importId || !userId) {
    return NextResponse.json({ error: "importId and userId required" }, { status: 400 })
  }

  await runExtractionForImport(userId, importId)
  return NextResponse.json({ ok: true })
}
