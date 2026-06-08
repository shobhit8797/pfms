"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { issueApiToken, listApiTokens, revokeApiToken } from "@/lib/services/token.service"
import { requireUserId, toErrorState, type ActionState } from "./_helpers"

export async function getApiTokens() {
  const session = await auth()
  if (!session?.user?.id) return []
  return listApiTokens(session.user.id)
}

export async function createApiToken(name: string): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state
  try {
    const result = await issueApiToken(ctx.userId, name || undefined)
    revalidatePath("/dashboard/budget/settings")
    return { success: "Token created", data: result }
  } catch (error) {
    return toErrorState(error)
  }
}

export async function deleteApiToken(id: string): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state
  try {
    await revokeApiToken(ctx.userId, id)
    revalidatePath("/dashboard/budget/settings")
    return { success: "Token revoked" }
  } catch (error) {
    return toErrorState(error)
  }
}
