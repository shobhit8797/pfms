import { withApiUser } from "@/lib/api-auth"
import { revokeApiToken } from "@/lib/services/token.service"

export const runtime = "nodejs"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, (userId) => revokeApiToken(userId, id))
}
