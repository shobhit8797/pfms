import { withApiUser } from "@/lib/api-auth"
import { commitImport } from "@/lib/services/import.service"

export const runtime = "nodejs"

/** POST = commit all APPROVED staged rows into the ledger. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, (userId) => commitImport(userId, id))
}
