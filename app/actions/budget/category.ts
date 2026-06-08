"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { categorySchema } from "@/lib/validation/budget"
import {
  listCategories,
  createCategory,
  updateCategory,
  archiveCategory,
} from "@/lib/services/category.service"
import { requireUserId, toErrorState, type ActionState } from "./_helpers"

export async function getCategories(includeArchived = false) {
  const session = await auth()
  if (!session?.user?.id) return []
  return listCategories(session.user.id, includeArchived)
}

export async function saveCategory(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state

  const id = (formData.get("id") as string) || undefined
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    colorHex: formData.get("colorHex") ?? undefined,
    icon: formData.get("icon") ?? undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  try {
    if (id) {
      await updateCategory(ctx.userId, id, parsed.data)
    } else {
      await createCategory(ctx.userId, parsed.data)
    }
    revalidatePath("/dashboard/budget/settings")
    revalidatePath("/dashboard/budget/transactions")
    return { success: id ? "Category updated" : "Category created" }
  } catch (error) {
    return toErrorState(error)
  }
}

export async function setCategoryArchived(id: string, isArchived: boolean): Promise<ActionState> {
  const ctx = await requireUserId()
  if ("state" in ctx) return ctx.state
  try {
    await archiveCategory(ctx.userId, id, isArchived)
    revalidatePath("/dashboard/budget/settings")
    return { success: isArchived ? "Category archived" : "Category restored" }
  } catch (error) {
    return toErrorState(error)
  }
}
