"use client"

import { useMemo } from "react"
import {
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"]

/** Calendar heatmap of daily spend (weekday rows × week columns). */
export function YearlyHeatmap({ data, year }: { data: Record<string, number>; year: number }) {
  const { weeks, max } = useMemo(() => {
    const yearStart = startOfYear(new Date(year, 0, 1))
    const yearEnd = endOfYear(new Date(year, 0, 1))
    const gridStart = startOfWeek(yearStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(yearEnd, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

    const cols: { date: Date | null; key: string; amount: number; inYear: boolean }[][] = []
    let max = 0
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7).map((d) => {
        const key = format(d, "yyyy-MM-dd")
        const amount = data[key] ?? 0
        if (amount > max) max = amount
        return { date: d, key, amount, inYear: d.getFullYear() === year }
      })
      cols.push(week)
    }
    return { weeks: cols, max }
  }, [data, year])

  function intensity(amount: number) {
    if (amount <= 0) return 0
    if (max <= 0) return 0
    const ratio = amount / max
    if (ratio > 0.75) return 4
    if (ratio > 0.5) return 3
    if (ratio > 0.25) return 2
    return 1
  }

  const LEVEL_CLASS = [
    "bg-muted",
    "bg-primary/25",
    "bg-primary/50",
    "bg-primary/75",
    "bg-primary",
  ]

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {/* Weekday labels */}
        <div className="flex flex-col gap-1 pr-1 sticky left-0">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="h-3 text-[9px] leading-3 text-muted-foreground w-7 text-right">
              {w}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.key}
                title={`${format(cell.date!, "MMM d, yyyy")}: ₹${Math.round(cell.amount).toLocaleString("en-IN")}`}
                className={cn(
                  "w-3 h-3 rounded-[3px]",
                  cell.inYear ? LEVEL_CLASS[intensity(cell.amount)] : "bg-transparent"
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {LEVEL_CLASS.map((c, i) => (
          <span key={i} className={cn("w-3 h-3 rounded-[3px]", c)} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
