import { prisma } from "@/lib/db"
import { notFound } from "@/lib/errors"
import type { CategoryInput } from "@/lib/validation/budget"

export async function listCategories(userId: string, includeArchived = false) {
  return prisma.category.findMany({
    where: {
      userId,
      deletedAt: null,
      ...(includeArchived ? {} : { isArchived: false }),
    },
    orderBy: { name: "asc" },
  })
}

export async function getCategoryOrThrow(userId: string, id: string) {
  const category = await prisma.category.findFirst({
    where: { id, userId, deletedAt: null },
  })
  if (!category) throw notFound("Category not found")
  return category
}

export async function createCategory(userId: string, input: CategoryInput) {
  return prisma.category.create({ data: { ...input, userId } })
}

export async function updateCategory(userId: string, id: string, input: Partial<CategoryInput>) {
  await getCategoryOrThrow(userId, id)
  return prisma.category.update({ where: { id }, data: input })
}

/** Soft-archive (keeps existing transactions intact). */
export async function archiveCategory(userId: string, id: string, isArchived = true) {
  await getCategoryOrThrow(userId, id)
  return prisma.category.update({ where: { id }, data: { isArchived } })
}
