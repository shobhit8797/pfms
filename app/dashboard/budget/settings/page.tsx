import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getBudgetProfile } from "@/app/actions/budget/profile"
import { getCategories } from "@/app/actions/budget/category"
import { getPaymentModes } from "@/app/actions/budget/payment-mode"
import { getImports } from "@/app/actions/budget/import"
import { getApiTokens } from "@/app/actions/budget/token"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SetupWizard } from "@/components/budget/setup-wizard"
import { CategoryManager } from "@/components/budget/category-manager"
import { PaymentModeManager } from "@/components/budget/payment-mode-manager"
import { ImportManager } from "@/components/budget/import-manager"
import { ApiTokenManager } from "@/components/budget/api-token-manager"
import { serializeDecimals } from "@/lib/utils"
import { Download } from "lucide-react"

export default async function BudgetSettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const profileRaw = await getBudgetProfile()
  if (!profileRaw) redirect("/dashboard/budget/setup")

  const [categoriesRaw, paymentModesRaw, importsRaw, tokensRaw] = await Promise.all([
    getCategories(true),
    getPaymentModes(true),
    getImports(),
    getApiTokens(),
  ])

  const profile = serializeDecimals(profileRaw)
  const categories = serializeDecimals(categoriesRaw).map((c) => ({
    id: c.id, name: c.name, type: c.type, colorHex: c.colorHex, icon: c.icon, isArchived: c.isArchived,
  }))
  const paymentModes = paymentModesRaw.map((p) => ({ id: p.id, name: p.name, isArchived: p.isArchived }))
  const imports = serializeDecimals(importsRaw).map((i) => ({
    id: i.id,
    fileName: i.fileName,
    status: i.status,
    committedCount: i._count.committedTxns,
    createdAt: new Date(i.createdAt).toISOString(),
  }))
  const tokens = tokensRaw.map((t) => ({
    id: t.id,
    name: t.name,
    lastUsedAt: t.lastUsedAt ? new Date(t.lastUsedAt).toISOString() : null,
    createdAt: new Date(t.createdAt).toISOString(),
  }))

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your budget, categories, imports and sync.</p>
      </div>

      <Tabs defaultValue="budget">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="payment">Payment modes</TabsTrigger>
          <TabsTrigger value="imports">Imports</TabsTrigger>
          <TabsTrigger value="api">API &amp; export</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="mt-6">
          <SetupWizard
            redirectTo="/dashboard/budget/settings"
            initial={{
              monthlyIncome: Number(profile.monthlyIncome),
              needsPct: Number(profile.needsPct),
              wantsPct: Number(profile.wantsPct),
              savingsPct: Number(profile.savingsPct),
              weeklyLimit: Number(profile.weeklyLimit),
              annualGrowthPct: Number(profile.annualGrowthPct),
              effectiveYear: profile.effectiveYear,
            }}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoryManager categories={categories} />
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <PaymentModeManager paymentModes={paymentModes} />
        </TabsContent>

        <TabsContent value="imports" className="mt-6">
          <ImportManager imports={imports} />
        </TabsContent>

        <TabsContent value="api" className="mt-6 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-heading text-base">Export</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a href="/api/v1/export/transactions" download>
                  <Download className="w-4 h-4 mr-2" /> Export ledger to CSV
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-heading text-base">API tokens (iOS sync)</CardTitle>
            </CardHeader>
            <CardContent>
              <ApiTokenManager tokens={tokens} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
