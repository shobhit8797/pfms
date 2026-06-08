"use client"

import { Home, Sparkles, PiggyBank } from "lucide-react"
import { cn } from "@/lib/utils"

type TypeBudget = {
  type: "NEED" | "WANT" | "SAVING"
  budget: number
  actual: number
  left: number
  pctUsed: number
}

const META = {
  NEED: { label: "Needs", icon: Home, bar: "bg-blue-500", text: "text-blue-600", tint: "bg-blue-500/10" },
  WANT: { label: "Wants", icon: Sparkles, bar: "bg-amber-500", text: "text-amber-600", tint: "bg-amber-500/10" },
  SAVING: { label: "Savings", icon: PiggyBank, bar: "bg-green-500", text: "text-green-600", tint: "bg-green-500/10" },
} as const

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN")

export function BudgetVsActualBars({ breakdown }: { breakdown: TypeBudget[] }) {
  return (
    <div className="space-y-6">
      {breakdown.map((b) => {
        const m = META[b.type]
        const Icon = m.icon
        const pct = Math.min(100, Math.round(b.pctUsed * 100))
        const over = b.actual > b.budget
        return (
          <div key={b.type} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center", m.tint)}>
                  <Icon className={cn("w-4 h-4", m.text)} />
                </span>
                {m.label}
              </span>
              <span className="font-mono text-muted-foreground">
                {fmt(b.actual)} <span className="opacity-50">/ {fmt(b.budget)}</span>
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : m.bar)}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className={cn(over ? "text-destructive font-medium" : "text-muted-foreground")}>
                {over
                  ? `Over by ${fmt(Math.abs(b.left))}`
                  : `${fmt(b.left)} left`}
              </span>
              <span className="text-muted-foreground">{Math.round(b.pctUsed * 100)}% used</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
