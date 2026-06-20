import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { prisma } from "@/lib/db"

export const runtime = "nodejs"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withApiUser(request, async (userId) => {
    const existing = await prisma.upiHandle.findFirst({ where: { id, userId }, select: { id: true } })
    if (!existing) throw new ServiceError("NOT_FOUND", "UPI handle not found")
    await prisma.upiHandle.delete({ where: { id } })
    return { ok: true as const }
  })
}
