import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { getImportDetail } from "@/app/actions/budget/import"
import { getCategories } from "@/app/actions/budget/category"
import { getPaymentModes } from "@/app/actions/budget/payment-mode"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ReviewTable, type StagedRow } from "@/components/budget/review-table"
import { serializeDecimals } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"

export default async function ImportReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const [impRaw, categoriesRaw, paymentModesRaw] = await Promise.all([
    getImportDetail(id),
    getCategories(),
    getPaymentModes(),
  ])
  if (!impRaw) notFound()

  const imp = serializeDecimals(impRaw)
  const categories = categoriesRaw.map((c) => ({ id: c.id, name: c.name, type: c.type }))
  const paymentModes = paymentModesRaw.map((p) => ({ id: p.id, name: p.name }))

  const rows: StagedRow[] = imp.stagedTxns.map((s) => ({
    id: s.id,
    rawDate: s.rawDate ? new Date(s.rawDate).toISOString() : null,
    rawDescription: s.rawDescription,
    rawAmount: Number(s.rawAmount),
    direction: s.direction,
    suggestedCategoryId: s.suggestedCategoryId,
    suggestedPaymentModeId: s.suggestedPaymentModeId,
    suggestedType: s.suggestedType,
    confidence: s.confidence != null ? Number(s.confidence) : null,
    isDuplicateGuess: s.isDuplicateGuess,
    reviewStatus: s.reviewStatus,
  }))

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/dashboard/budget/imports">
            <ArrowLeft className="w-4 h-4 mr-1" /> Imports
          </Link>
        </Button>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Review import</h1>
        <p className="text-muted-foreground mt-1">
          {imp.fileName ?? "Statement"} · nothing is added to your ledger until you commit.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <ReviewTable
            importId={imp.id}
            status={imp.status}
            meta={{
              modelUsed: imp.modelUsed,
              tokensUsed: imp.tokensUsed,
              costEstimate: imp.costEstimate != null ? Number(imp.costEstimate) : null,
              errorMessage: imp.errorMessage,
            }}
            rows={rows}
            categories={categories}
            paymentModes={paymentModes}
          />
        </CardContent>
      </Card>
    </div>
  )
}
