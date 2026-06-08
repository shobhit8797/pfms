import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getBudgetProfile } from "@/app/actions/budget/profile"
import { SetupWizard } from "@/components/budget/setup-wizard"
import { serializeDecimals } from "@/lib/utils"

export default async function BudgetSetupPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const profileRaw = await getBudgetProfile()
  const profile = profileRaw ? serializeDecimals(profileRaw) : null

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
          {profile ? "Edit your budget" : "Set up your budget"}
        </h1>
        <p className="text-muted-foreground mt-1">
          The 50:30:20 rule splits your income into Needs, Wants and Savings.
        </p>
      </div>

      <SetupWizard
        redirectTo="/dashboard/budget"
        initial={
          profile
            ? {
                monthlyIncome: Number(profile.monthlyIncome),
                needsPct: Number(profile.needsPct),
                wantsPct: Number(profile.wantsPct),
                savingsPct: Number(profile.savingsPct),
                weeklyLimit: Number(profile.weeklyLimit),
                annualGrowthPct: Number(profile.annualGrowthPct),
                effectiveYear: profile.effectiveYear,
              }
            : undefined
        }
      />
    </div>
  )
}
