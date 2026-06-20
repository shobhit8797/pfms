import { withApiUser } from "@/lib/api-auth"
import { disconnect, getConnectionStatus } from "@/lib/services/gmail.service"

export const runtime = "nodejs"

/** GET → Gmail connection status. DELETE → disconnect (revoke + remove tokens). */
export async function GET(request: Request) {
  return withApiUser(request, (userId) => getConnectionStatus(userId))
}

export async function DELETE(request: Request) {
  return withApiUser(request, (userId) => disconnect(userId))
}
