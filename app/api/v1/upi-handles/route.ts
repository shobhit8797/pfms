import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { prisma } from "@/lib/db"
import { upiHandleCreateSchema } from "@pfms/shared"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, async (userId) => {
    const items = await prisma.upiHandle.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, handle: true, isDefault: true, createdAt: true },
    })
    return { items }
  })
}

export async function POST(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = upiHandleCreateSchema.safeParse(body)
    if (!parsed.success) throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")

    const d = parsed.data

    // If this is set as default, clear the default flag on others first.
    if (d.isDefault) {
      await prisma.upiHandle.updateMany({ where: { userId }, data: { isDefault: false } })
    }

    const handle = await prisma.upiHandle.create({
      data: { userId, name: d.name, handle: d.handle, isDefault: d.isDefault },
      select: { id: true, name: true, handle: true, isDefault: true, createdAt: true },
    })
    return handle
  })
}
