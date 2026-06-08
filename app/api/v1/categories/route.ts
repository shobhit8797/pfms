import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { categorySchema } from "@/lib/validation/budget"
import { listCategories, createCategory } from "@/lib/services/category.service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, (userId) => {
    const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true"
    return listCategories(userId, includeArchived)
  })
}

export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = categorySchema.safeParse(body)
    if (!parsed.success) {
      throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    }
    return createCategory(userId, parsed.data)
  })
}
