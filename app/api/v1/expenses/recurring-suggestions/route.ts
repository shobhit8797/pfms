import { withApiUser } from "@/lib/api-auth"
import { detectRecurringSuggestions } from "@/lib/services/recurring.service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, async (userId) => ({ items: await detectRecurringSuggestions(userId) }))
}
