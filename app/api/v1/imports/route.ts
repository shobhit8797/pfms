import { after } from "next/server"
import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { createImport, listImports, runExtractionForImport } from "@/lib/services/import.service"
import type { ImportFileType } from "@prisma/client"

export const runtime = "nodejs"
export const maxDuration = 120

export async function GET(request: Request) {
  return withApiUser(request, (userId) => listImports(userId))
}

export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = (await request.json().catch(() => ({}))) as {
      fileUrl?: string
      fileName?: string
      fileType?: ImportFileType
    }
    if (!body.fileUrl || !body.fileType) {
      throw new ServiceError("VALIDATION", "fileUrl and fileType are required")
    }
    const imp = await createImport(userId, {
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      fileType: body.fileType,
    })
    after(async () => {
      await runExtractionForImport(userId, imp.id)
    })
    return imp
  })
}
