import { useMemo, useState } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import type { ExpenseDTO, IncomeDTO } from "@pfms/shared"
import { useThemeColors } from "../lib/theme"
import { formatINR } from "../lib/format"

type Series = "expense" | "income" | "both"
type Period = "daily" | "weekly" | "monthly"

type Bucket = { key: string; label: string; income: number; expense: number }

const SERIES_OPTIONS: { value: Series; label: string }[] = [
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "both", label: "Both" },
]

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

/** How many buckets to show per granularity (most recent on the right). */
const SPAN: Record<Period, number> = { daily: 14, weekly: 8, monthly: 6 }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const labelFor = (p: Period) => (p === "daily" ? "daily" : p === "weekly" ? "weekly" : "monthly")

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Monday-based week start, normalized to midnight. */
function startOfWeek(d: Date): Date {
  const x = startOfDay(d)
  const day = (x.getDay() + 6) % 7 // Mon = 0 … Sun = 6
  x.setDate(x.getDate() - day)
  return x
}

/** Stable bucket key for a date under the chosen granularity. */
function keyFor(period: Period, d: Date): string {
  if (period === "monthly") return `${d.getFullYear()}-${d.getMonth()}`
  const base = period === "weekly" ? startOfWeek(d) : startOfDay(d)
  return base.toISOString().slice(0, 10)
}

/**
 * Builds the ordered, gap-filled bucket list for the window ending today, then
 * folds expenses and income into it. Empty buckets are kept so the time axis
 * stays evenly spaced.
 */
function buildBuckets(period: Period, expenses: ExpenseDTO[], income: IncomeDTO[]): Bucket[] {
  const now = new Date()
  const buckets: Bucket[] = []
  const index = new Map<string, Bucket>()

  for (let i = SPAN[period] - 1; i >= 0; i--) {
    const d = new Date(now)
    if (period === "daily") d.setDate(now.getDate() - i)
    else if (period === "weekly") d.setDate(now.getDate() - i * 7)
    else d.setMonth(now.getMonth() - i)

    let label: string
    if (period === "daily") label = String(startOfDay(d).getDate())
    else if (period === "weekly") {
      const ws = startOfWeek(d)
      label = `${ws.getDate()} ${MONTHS[ws.getMonth()]}`
    } else label = MONTHS[d.getMonth()]

    const bucket: Bucket = { key: keyFor(period, d), label, income: 0, expense: 0 }
    buckets.push(bucket)
    index.set(bucket.key, bucket)
  }

  for (const e of expenses) {
    const b = index.get(keyFor(period, new Date(e.expenseDate)))
    if (b) b.expense += e.amount
  }
  for (const i of income) {
    const b = index.get(keyFor(period, new Date(i.incomeDate)))
    if (b) b.income += i.amount
  }

  return buckets
}

const CHART_HEIGHT = 160

/**
 * Home-screen trends: a bar chart of expenses and/or income bucketed by day,
 * week, or month. Tap a bar group to inspect its exact figures.
 */
export function TrendChart({ expenses, income }: { expenses: ExpenseDTO[]; income: IncomeDTO[] }) {
  const c = useThemeColors()
  const [series, setSeries] = useState<Series>("both")
  // Default to the widest window so the chart shows data even when recent
  // activity is sparse; the user can drill down to weekly/daily.
  const [period, setPeriod] = useState<Period>("monthly")
  const [selected, setSelected] = useState<number | null>(null)

  const buckets = useMemo(() => buildBuckets(period, expenses, income), [period, expenses, income])

  const showExpense = series === "expense" || series === "both"
  const showIncome = series === "income" || series === "both"

  const max = useMemo(() => {
    let m = 0
    for (const b of buckets) {
      if (showExpense) m = Math.max(m, b.expense)
      if (showIncome) m = Math.max(m, b.income)
    }
    return m
  }, [buckets, showExpense, showIncome])

  const totals = useMemo(() => {
    const expense = buckets.reduce((s, b) => s + b.expense, 0)
    const incomeT = buckets.reduce((s, b) => s + b.income, 0)
    return { expense, income: incomeT, net: incomeT - expense }
  }, [buckets])

  const active = selected != null ? buckets[selected] : null

  const barHeight = (value: number) => (max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * CHART_HEIGHT) : 0)

  return (
    <View className="mb-3 rounded-2xl border border-border bg-card p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-foreground">Trends</Text>
        <Text className="text-xs text-muted-foreground">Max {formatINR(max)}</Text>
      </View>

      {/* Series toggle */}
      <Toggle options={SERIES_OPTIONS} value={series} onChange={setSeries} />
      {/* Granularity toggle */}
      <Toggle options={PERIOD_OPTIONS} value={period} onChange={setPeriod} className="mt-2" />

      {/* Readout for the tapped bucket, or the window totals otherwise. */}
      <View className="mb-3 mt-4 flex-row flex-wrap gap-x-5 gap-y-1">
        {active ? (
          <>
            <Text className="text-xs text-muted-foreground">{active.label}</Text>
            {showIncome && <Stat label="Income" value={active.income} color={c.success} />}
            {showExpense && <Stat label="Expense" value={active.expense} color={c.destructive} />}
          </>
        ) : (
          <>
            {showIncome && <Stat label="Income" value={totals.income} color={c.success} />}
            {showExpense && <Stat label="Expense" value={totals.expense} color={c.destructive} />}
            {series === "both" && (
              <Stat label="Net" value={totals.net} color={totals.net >= 0 ? c.success : c.destructive} />
            )}
          </>
        )}
      </View>

      {max === 0 ? (
        <View className="items-center justify-center px-6 py-10" style={{ height: CHART_HEIGHT }}>
          <Text className="text-sm text-muted-foreground">No {labelFor(period)} data in this window.</Text>
          <Text className="mt-1 text-center text-xs text-muted-foreground">
            Try a wider range, or add an expense or income entry.
          </Text>
        </View>
      ) : (
        <View className="flex-row items-end" style={{ height: CHART_HEIGHT }}>
          {buckets.map((b, i) => {
            const isActive = selected === i
            return (
              <TouchableOpacity
                key={b.key}
                activeOpacity={0.7}
                onPress={() => setSelected(isActive ? null : i)}
                className="flex-1 items-center justify-end"
                style={{ height: CHART_HEIGHT, opacity: selected != null && !isActive ? 0.45 : 1 }}
              >
                <View className="flex-row items-end justify-center gap-0.5" style={{ height: CHART_HEIGHT }}>
                  {showIncome && (
                    <View
                      style={{
                        height: barHeight(b.income),
                        backgroundColor: c.success,
                        width: series === "both" ? 7 : 14,
                        borderTopLeftRadius: 3,
                        borderTopRightRadius: 3,
                      }}
                    />
                  )}
                  {showExpense && (
                    <View
                      style={{
                        height: barHeight(b.expense),
                        backgroundColor: c.destructive,
                        width: series === "both" ? 7 : 14,
                        borderTopLeftRadius: 3,
                        borderTopRightRadius: 3,
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* X-axis labels (mirror the bar columns). */}
      {max > 0 && (
        <View className="mt-1 flex-row">
          {buckets.map((b, i) => (
            <Text
              key={b.key}
              numberOfLines={1}
              className={`flex-1 text-center text-[10px] ${selected === i ? "text-foreground" : "text-muted-foreground"}`}
            >
              {b.label}
            </Text>
          ))}
        </View>
      )}

      {/* Legend */}
      {series === "both" && max > 0 && (
        <View className="mt-3 flex-row justify-center gap-4">
          <LegendDot color={c.success} label="Income" />
          <LegendDot color={c.destructive} label="Expense" />
        </View>
      )}
    </View>
  )
}

function Toggle<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <View className={`flex-row rounded-full bg-muted p-1 ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            activeOpacity={0.8}
            className={`flex-1 items-center rounded-full py-2 ${active ? "bg-primary" : ""}`}
          >
            <Text
              className={`text-xs font-medium ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View>
      <Text className="text-[11px] text-muted-foreground">{label}</Text>
      <Text className="text-base font-semibold" style={{ color }}>
        {formatINR(value)}
      </Text>
    </View>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  )
}
