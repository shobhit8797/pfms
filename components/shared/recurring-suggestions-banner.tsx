"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { confirmRecurring } from "@/app/actions/recurring"
import { toast } from "sonner"
import { Repeat, X } from "lucide-react"

type Suggestion = {
  kind: "expense" | "income"
  label: string
  amount: number
  occurrences: number
  suggestedFrequency: string
  ids: string[]
  category: string | null
}

/**
 * Surfaces detected month-on-month repeats not yet flagged recurring, with a
 * one-tap "Mark recurring" confirm. Fed by the server page (getRecurringSuggestions).
 */
export function RecurringSuggestionsBanner({ suggestions }: { suggestions: Suggestion[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const visible = suggestions.filter((s) => !dismissed.has(s.label + s.amount))
  if (visible.length === 0) return null

  function confirm(s: Suggestion) {
    startTransition(async () => {
      const r = await confirmRecurring(s.kind, s.ids, s.suggestedFrequency as "MONTHLY")
      if (r.error) toast.error(r.error)
      else {
        toast.success(r.success!)
        setDismissed((prev) => new Set(prev).add(s.label + s.amount))
      }
    })
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Repeat className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">These look like they repeat every month</p>
      </div>
      <div className="space-y-2">
        {visible.map((s) => (
          <div key={s.label + s.amount} className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">
                ₹{s.amount.toLocaleString("en-IN")} · seen in {s.occurrences} months
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => confirm(s)}>
                Mark recurring
              </Button>
              <button
                type="button"
                aria-label="Dismiss"
                className="text-muted-foreground hover:text-foreground p-1"
                onClick={() => setDismissed((prev) => new Set(prev).add(s.label + s.amount))}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
