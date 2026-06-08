import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { runExtractionForImport } from "@/lib/services/import.service"

export const runtime = "nodejs"
export const maxDuration = 300

/**
 * Reliability backstop (Vercel Cron): re-drives statement imports stuck in
 * EXTRACTING for more than a few minutes — covers cases where the after()
 * background work was dropped on instance scale-down.
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

  const cutoff = new Date(Date.now() - 5 * 60 * 1000)
  const stuck = await prisma.statementImport.findMany({
    where: { status: "EXTRACTING", updatedAt: { lt: cutoff }, deletedAt: null },
    select: { id: true, userId: true },
    take: 20,
  })

  for (const imp of stuck) {
    await runExtractionForImport(imp.userId, imp.id)
  }

  return NextResponse.json({ swept: stuck.length })
}
