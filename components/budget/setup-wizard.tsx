"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { saveBudgetProfile } from "@/app/actions/budget/profile"
import { toast } from "sonner"
import { PiggyBank, Home, Sparkles } from "lucide-react"

type Props = {
  /** Existing values when editing from settings; absent during first onboarding. */
  initial?: {
    monthlyIncome: number
    needsPct: number
    wantsPct: number
    savingsPct: number
    weeklyLimit: number
    annualGrowthPct: number
    effectiveYear: number
  }
  redirectTo?: string
}

const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 })

export function SetupWizard({ initial, redirectTo }: Props) {
  const router = useRouter()
  const [income, setIncome] = useState(initial?.monthlyIncome ?? 0)
  const [weeklyLimit, setWeeklyLimit] = useState(initial?.weeklyLimit ?? 10000)
  const [needsPct, setNeedsPct] = useState(initial?.needsPct ?? 0.5)
  const [wantsPct, setWantsPct] = useState(initial?.wantsPct ?? 0.3)
  const [savingsPct, setSavingsPct] = useState(initial?.savingsPct ?? 0.2)
  const [growth, setGrowth] = useState(initial?.annualGrowthPct ?? 0.1)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const pctSum = needsPct + wantsPct + savingsPct
  const pctValid = Math.abs(pctSum - 1) < 0.001

  async function handleSubmit(formData: FormData) {
    if (!pctValid) {
      toast.error("Needs / Wants / Savings must add up to 100%")
      return
    }
    const result = await saveBudgetProfile(undefined, formData)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success(result.success ?? "Saved")
      router.push(redirectTo ?? "/dashboard/budget")
      router.refresh()
    }
  }

  const splits = [
    { label: "Needs", pct: needsPct, amount: income * needsPct, icon: Home, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Wants", pct: wantsPct, amount: income * wantsPct, icon: Sparkles, color: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "Savings", pct: savingsPct, amount: income * savingsPct, icon: PiggyBank, color: "text-green-600", bg: "bg-green-500/10" },
  ]

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Your monthly income</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="monthlyIncome">Monthly income (₹)</Label>
            <Input
              id="monthlyIncome"
              name="monthlyIncome"
              type="number"
              step="0.01"
              min="0"
              required
              value={income || ""}
              onChange={(e) => setIncome(Number(e.target.value))}
              placeholder="e.g. 100000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weeklyLimit">Weekly spending limit (₹)</Label>
            <Input
              id="weeklyLimit"
              name="weeklyLimit"
              type="number"
              step="0.01"
              min="0"
              value={weeklyLimit}
              onChange={(e) => setWeeklyLimit(Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Live 50:30:20 preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {splits.map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {Math.round(s.pct * 100)}%
                </span>
              </div>
              <p className="font-heading text-2xl font-semibold mt-3">{fmt(s.amount)}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label} budget / month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <button
        type="button"
        className="text-sm text-primary hover:underline"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? "Hide" : "Show"} advanced settings
      </button>

      {showAdvanced && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-base">Split & projection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Needs %</Label>
                <Input type="number" step="1" min="0" max="100"
                  value={Math.round(needsPct * 100)}
                  onChange={(e) => setNeedsPct(Number(e.target.value) / 100)} />
              </div>
              <div className="grid gap-2">
                <Label>Wants %</Label>
                <Input type="number" step="1" min="0" max="100"
                  value={Math.round(wantsPct * 100)}
                  onChange={(e) => setWantsPct(Number(e.target.value) / 100)} />
              </div>
              <div className="grid gap-2">
                <Label>Savings %</Label>
                <Input type="number" step="1" min="0" max="100"
                  value={Math.round(savingsPct * 100)}
                  onChange={(e) => setSavingsPct(Number(e.target.value) / 100)} />
              </div>
            </div>
            {!pctValid && (
              <p className="text-xs text-destructive">
                Percentages add up to {Math.round(pctSum * 100)}% — they must total 100%.
              </p>
            )}
            <div className="grid gap-2 max-w-xs">
              <Label>Annual income growth %</Label>
              <Input type="number" step="1" min="0"
                value={Math.round(growth * 100)}
                onChange={(e) => setGrowth(Number(e.target.value) / 100)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden fields submitted to the server action */}
      <input type="hidden" name="needsPct" value={needsPct} />
      <input type="hidden" name="wantsPct" value={wantsPct} />
      <input type="hidden" name="savingsPct" value={savingsPct} />
      <input type="hidden" name="annualGrowthPct" value={growth} />
      <input type="hidden" name="effectiveYear" value={initial?.effectiveYear ?? new Date().getFullYear()} />

      <SubmitButton isEditing={!!initial} />
    </form>
  )
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Saving..." : isEditing ? "Save changes" : "Start tracking"}
    </Button>
  )
}
