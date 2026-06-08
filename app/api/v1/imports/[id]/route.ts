import { withApiUser } from "@/lib/api-auth"
import { getImportWithStaged, undoImport } from "@/lib/services/import.service"

export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, (userId) => getImportWithStaged(userId, id))
}

/** DELETE = undo the committed batch (soft-deletes its transactions). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, (userId) => undoImport(userId, id))
}
