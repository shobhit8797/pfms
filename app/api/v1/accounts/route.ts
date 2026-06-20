import { withApiUser } from "@/lib/api-auth"
import { serializeDecimals } from "@/lib/utils"
import { listAccountsForPicker } from "@/lib/services/picker.service"

export const runtime = "nodejs"

/** Read-only account list for the expense/income form pickers. */
export async function GET(request: Request) {
  return withApiUser(request, async (userId) => serializeDecimals(await listAccountsForPicker(userId)))
}
