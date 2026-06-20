import { withApiUser } from "@/lib/api-auth"
import { buildConsentUrl, signState } from "@/lib/google/oauth"

export const runtime = "nodejs"

/**
 * Returns the Google consent URL for the authenticated user to open in a
 * browser. The signed `state` lets the (stateless) callback know which user
 * started the flow.
 */
export async function POST(request: Request) {
  return withApiUser(request, async (userId) => ({ url: buildConsentUrl(signState(userId)) }))
}
