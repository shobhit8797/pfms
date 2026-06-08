"use client"

import { cn } from "@/lib/utils"

export function AdherenceScore({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color =
    score >= 7 ? "text-green-600" : score >= 4 ? "text-amber-600" : "text-destructive"
  const ring =
    score >= 7 ? "stroke-green-500" : score >= 4 ? "stroke-amber-500" : "stroke-destructive"
  const r = 42
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} className="fill-none stroke-muted" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r={r}
            className={cn("fill-none transition-all", ring)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-heading text-2xl font-semibold", color)}>{score}</span>
          <span className="text-[10px] text-muted-foreground">/ 10</span>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Adherence score</p>
        <p className="mt-1">
          {score >= 7
            ? "On track — spending within budget."
            : score >= 4
            ? "Watch it — approaching your limits."
            : "Over budget this month."}
        </p>
      </div>
    </div>
  )
}
