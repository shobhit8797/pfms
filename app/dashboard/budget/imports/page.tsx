import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { getBudgetProfile } from "@/app/actions/budget/profile"
import { getImports } from "@/app/actions/budget/import"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ImportDropzone } from "@/components/budget/import-dropzone"
import { serializeDecimals } from "@/lib/utils"
import { FileText, ArrowRight } from "lucide-react"

const STATUS_CLASS: Record<string, string> = {
  UPLOADED: "bg-muted text-muted-foreground",
  EXTRACTING: "bg-amber-500/10 text-amber-600",
  NEEDS_REVIEW: "bg-blue-500/10 text-blue-600",
  PARTIALLY_APPROVED: "bg-violet-500/10 text-violet-600",
  COMPLETED: "bg-green-500/10 text-green-600",
  FAILED: "bg-destructive/10 text-destructive",
}

export default async function BudgetImportsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const profile = await getBudgetProfile()
  if (!profile) redirect("/dashboard/budget/setup")

  const imports = serializeDecimals(await getImports())

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
          Statement import
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload a bank statement — AI extracts the transactions for you to review.
        </p>
      </div>

      <ImportDropzone />

      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="font-heading text-lg">Past imports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {imports.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>No imports yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {imports.map((imp) => (
                <li key={imp.id} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{imp.fileName ?? "Statement"}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(imp.createdAt), "MMM d, yyyy · HH:mm")}
                      {" · "}
                      {imp._count.stagedTxns} rows
                      {imp.modelUsed && ` · ${imp.modelUsed}`}
                      {imp.costEstimate != null && ` · $${Number(imp.costEstimate).toFixed(4)}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={`font-normal ${STATUS_CLASS[imp.status] ?? ""}`}>
                    {imp.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/budget/imports/${imp.id}/review`}>
                      Review <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
