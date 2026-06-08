"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, X, AlertTriangle, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { saveReview, commitImportAction } from "@/app/actions/budget/import"

type CategoryOption = { id: string; name: string; type: "NEED" | "WANT" | "SAVING" }
type PaymentModeOption = { id: string; name: string }

export type StagedRow = {
  id: string
  rawDate: string | null
  rawDescription: string
  rawAmount: number
  direction: "DEBIT" | "CREDIT"
  suggestedCategoryId: string | null
  suggestedPaymentModeId: string | null
  suggestedType: "NEED" | "WANT" | "SAVING" | null
  confidence: number | null
  isDuplicateGuess: boolean
  reviewStatus: "PENDING" | "EDITED" | "APPROVED" | "REJECTED"
}

const NONE = "__none__"

export function ReviewTable({
  importId,
  status,
  meta,
  rows: initialRows,
  categories,
  paymentModes,
}: {
  importId: string
  status: string
  meta: { modelUsed: string | null; tokensUsed: number | null; costEstimate: number | null; errorMessage?: string | null }
  rows: StagedRow[]
  categories: CategoryOption[]
  paymentModes: PaymentModeOption[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState<StagedRow[]>(initialRows)
  const [saving, startSaving] = useTransition()
  const [committing, startCommitting] = useTransition()

  // Poll while extraction is in progress.
  const isExtracting = status === "EXTRACTING" || status === "UPLOADED"
  useEffect(() => {
    if (!isExtracting) return
    const t = setInterval(() => router.refresh(), 2500)
    return () => clearInterval(t)
  }, [isExtracting, router])

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  function patch(id: string, changes: Partial<StagedRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        // An explicit reviewStatus wins; otherwise a field edit marks the row EDITED.
        const reviewStatus =
          "reviewStatus" in changes ? changes.reviewStatus! : r.reviewStatus === "PENDING" ? "EDITED" : r.reviewStatus
        return { ...r, ...changes, reviewStatus }
      })
    )
  }

  function setCategory(id: string, categoryId: string | null) {
    const type = categoryId ? catById.get(categoryId)?.type ?? null : null
    patch(id, { suggestedCategoryId: categoryId, suggestedType: type })
  }

  function approveAllDebit() {
    setRows((prev) =>
      prev.map((r) =>
        r.direction === "DEBIT" && !r.isDuplicateGuess && r.suggestedCategoryId
          ? { ...r, reviewStatus: "APPROVED" }
          : r
      )
    )
  }

  function bulkCategory(categoryId: string) {
    const type = catById.get(categoryId)?.type ?? null
    setRows((prev) =>
      prev.map((r) =>
        r.reviewStatus === "REJECTED" ? r : { ...r, suggestedCategoryId: categoryId, suggestedType: type }
      )
    )
  }

  function serialize() {
    return rows.map((r) => ({
      id: r.id,
      rawDate: r.rawDate ?? undefined,
      rawDescription: r.rawDescription,
      rawAmount: r.rawAmount,
      suggestedCategoryId: r.suggestedCategoryId,
      suggestedPaymentModeId: r.suggestedPaymentModeId,
      suggestedType: r.suggestedType,
      reviewStatus: r.reviewStatus,
    }))
  }

  function onSave() {
    startSaving(async () => {
      const result = await saveReview(importId, serialize())
      if (result.error) toast.error(result.error)
      else toast.success("Review saved")
    })
  }

  function onCommit() {
    const approved = rows.filter((r) => r.reviewStatus === "APPROVED")
    if (approved.length === 0) {
      toast.error("Approve at least one row first")
      return
    }
    if (approved.some((r) => !r.suggestedCategoryId)) {
      toast.error("Every approved row needs a category")
      return
    }
    startCommitting(async () => {
      const saved = await saveReview(importId, serialize())
      if (saved.error) {
        toast.error(saved.error)
        return
      }
      const result = await commitImportAction(importId)
      if (result.error) toast.error(result.error)
      else {
        toast.success(result.success ?? "Committed")
        router.push("/dashboard/budget/transactions")
      }
    })
  }

  if (isExtracting) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-medium text-foreground">Extracting transactions…</p>
        <p className="text-sm">This usually takes under 30 seconds. The page updates automatically.</p>
      </div>
    )
  }

  if (status === "FAILED") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <p className="font-medium">Extraction failed</p>
        <p className="text-sm text-muted-foreground max-w-md">
          {meta.errorMessage || "The model could not extract transactions from this file."}
        </p>
      </div>
    )
  }

  const approvedCount = rows.filter((r) => r.reviewStatus === "APPROVED").length

  return (
    <div className="space-y-4">
      {/* Meta + bulk actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {rows.length} rows
          {meta.modelUsed && ` · ${meta.modelUsed}`}
          {meta.tokensUsed != null && ` · ${meta.tokensUsed} tokens`}
          {meta.costEstimate != null && ` · ~$${Number(meta.costEstimate).toFixed(4)}`}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select onValueChange={bulkCategory}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Bulk assign category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={approveAllDebit}>
            Approve all debits
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-muted-foreground">Description</TableHead>
              <TableHead className="text-muted-foreground">Dir</TableHead>
              <TableHead className="text-muted-foreground text-right">Amount</TableHead>
              <TableHead className="text-muted-foreground">Category</TableHead>
              <TableHead className="text-muted-foreground">Payment</TableHead>
              <TableHead className="text-muted-foreground w-28 text-right">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const rejected = r.reviewStatus === "REJECTED"
              const approved = r.reviewStatus === "APPROVED"
              return (
                <TableRow
                  key={r.id}
                  className={cn(
                    "border-border",
                    rejected && "opacity-40",
                    approved && "bg-green-500/5"
                  )}
                >
                  <TableCell>
                    <Input
                      type="date"
                      className="h-8 w-[140px] text-xs"
                      value={r.rawDate ? r.rawDate.slice(0, 10) : ""}
                      onChange={(e) => patch(r.id, { rawDate: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-8 text-xs"
                        value={r.rawDescription}
                        onChange={(e) => patch(r.id, { rawDescription: e.target.value })}
                      />
                      {r.isDuplicateGuess && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] shrink-0">
                          <AlertTriangle className="w-3 h-3 mr-1" /> dup?
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.direction === "DEBIT" ? (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <ArrowUpRight className="w-3.5 h-3.5" /> Debit
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <ArrowDownLeft className="w-3.5 h-3.5" /> Credit
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 w-[100px] text-xs text-right ml-auto"
                      value={r.rawAmount}
                      onChange={(e) => patch(r.id, { rawAmount: Number(e.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.suggestedCategoryId ?? NONE}
                      onValueChange={(v) => setCategory(r.id, v === NONE ? null : v)}
                    >
                      <SelectTrigger className="h-8 w-[160px] text-xs">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>—</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.suggestedPaymentModeId ?? NONE}
                      onValueChange={(v) => patch(r.id, { suggestedPaymentModeId: v === NONE ? null : v })}
                    >
                      <SelectTrigger className="h-8 w-[130px] text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>—</SelectItem>
                        {paymentModes.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant={approved ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        title="Approve"
                        onClick={() => patch(r.id, { reviewStatus: approved ? "EDITED" : "APPROVED" })}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={rejected ? "destructive" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        title="Reject"
                        onClick={() => patch(r.id, { reviewStatus: rejected ? "PENDING" : "REJECTED" })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{approvedCount} approved</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save progress
          </Button>
          <Button onClick={onCommit} disabled={committing || approvedCount === 0}>
            {committing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Commit {approvedCount > 0 ? `(${approvedCount})` : ""}
          </Button>
        </div>
      </div>
    </div>
  )
}
