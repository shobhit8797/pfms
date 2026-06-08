import { auth } from "@/auth"
import { ServiceError } from "@/lib/errors"

export type ActionState = {
  error?: string
  success?: string
  /** Optional payload returned on success (e.g. a created id). */
  data?: unknown
}

/** Resolves the authenticated user id or returns an Unauthorized ActionState. */
export async function requireUserId(): Promise<{ userId: string } | { state: ActionState }> {
  const session = await auth()
  if (!session?.user?.id) return { state: { error: "Unauthorized" } }
  return { userId: session.user.id }
}

/** Maps a thrown error to an ActionState, surfacing ServiceError messages. */
export function toErrorState(error: unknown): ActionState {
  if (error instanceof ServiceError) return { error: error.message }
  console.error("Budget action error:", error)
  return { error: "Something went wrong" }
}
