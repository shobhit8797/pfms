"use client"

import { cn } from "@/lib/utils"

const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN")

export function WeeklyRatio({ spend, limit, ratio }: { spend: number; limit: number; ratio: number }) {
  const pct = Math.round(ratio * 100)
  const over = ratio > 1
  const barPct = Math.min(100, pct)
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-heading text-3xl font-semibold">{fmt(spend)}</p>
          <p className="text-xs text-muted-foreground mt-1">spent this week · limit {fmt(limit)}</p>
        </div>
        <span
          className={cn(
            "text-sm font-semibold px-2 py-1 rounded-md",
            over ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-600"
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : "bg-green-500")}
          style={{ width: `${Math.max(2, barPct)}%` }}
        />
      </div>
      {over && (
        <p className="text-xs text-destructive font-medium">
          Over the weekly limit by {fmt(spend - limit)}
        </p>
      )}
    </div>
  )
}
