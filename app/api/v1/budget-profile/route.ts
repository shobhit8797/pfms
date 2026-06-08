import { withApiUser } from "@/lib/api-auth"
import { ServiceError } from "@/lib/errors"
import { budgetProfileSchema } from "@/lib/validation/budget"
import { getActiveProfile, upsertBudgetProfile, deriveBudgets } from "@/lib/services/budget-profile.service"
import { seedBudgetDefaults } from "@/lib/services/seed.service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return withApiUser(request, async (userId) => {
    const profile = await getActiveProfile(userId)
    if (!profile) return { profile: null }
    return { profile, derived: deriveBudgets(profile) }
  })
}

export async function PUT(request: Request) {
  return withApiUser(request, async (userId) => {
    const body = await request.json().catch(() => ({}))
    const parsed = budgetProfileSchema.safeParse(body)
    if (!parsed.success) {
      throw new ServiceError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input")
    }
    const profile = await upsertBudgetProfile(userId, parsed.data)
    await seedBudgetDefaults(userId)
    return { profile, derived: deriveBudgets(profile) }
  })
}
