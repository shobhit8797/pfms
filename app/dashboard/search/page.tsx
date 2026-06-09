import { searchAll } from "@/app/actions/search"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Search, ArrowUpRight, ArrowDownRight, Sparkles, TrendingUp } from "lucide-react"

const inr = (v: number) => `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = "" } = await searchParams
  const results = q.trim().length >= 2 ? await searchAll(q) : null

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">Search</h1>
        <p className="text-muted-foreground mt-1">
          Find any transaction across income, expenses, subscriptions, and investments.
        </p>
      </div>

      {/* Search form (GET → ?q=) */}
      <form method="GET" className="flex items-center gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search descriptions, sources, categories…"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {results === null ? (
        <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
      ) : results.total === 0 ? (
        <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
          <p className="text-sm text-muted-foreground">
            No matches for &ldquo;{results.query}&rdquo;.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {results.total} result{results.total === 1 ? "" : "s"} for &ldquo;{results.query}&rdquo;
          </p>

          {results.expenses.length > 0 && (
            <ResultGroup title="Expenses" href="/dashboard/expenses" icon={<ArrowDownRight className="h-4 w-4 text-destructive" />}>
              {results.expenses.map((e) => (
                <Row key={e.id} primary={e.description} secondary={`${e.category} · ${format(new Date(e.date), "MMM d, yyyy")}`} amount={`-${inr(e.amount)}`} amountClass="text-destructive" />
              ))}
            </ResultGroup>
          )}

          {results.income.length > 0 && (
            <ResultGroup title="Income" href="/dashboard/income" icon={<ArrowUpRight className="h-4 w-4 text-success" />}>
              {results.income.map((i) => (
                <Row key={i.id} primary={i.source} secondary={`${i.category} · ${format(new Date(i.date), "MMM d, yyyy")}`} amount={`+${inr(i.amount)}`} amountClass="text-success" />
              ))}
            </ResultGroup>
          )}

          {results.subscriptions.length > 0 && (
            <ResultGroup title="Subscriptions" href="/dashboard/subscriptions" icon={<Sparkles className="h-4 w-4 text-chart-5" />}>
              {results.subscriptions.map((s) => (
                <Row key={s.id} primary={s.serviceName} secondary={s.category} amount={inr(s.amount)} amountClass="text-foreground" />
              ))}
            </ResultGroup>
          )}

          {results.investments.length > 0 && (
            <ResultGroup title="Investments" href="/dashboard/investments" icon={<TrendingUp className="h-4 w-4 text-primary" />}>
              {results.investments.map((inv) => (
                <Row key={inv.id} primary={inv.assetName} secondary={inv.assetClass} amount={inr(inv.amount)} amountClass="text-foreground" />
              ))}
            </ResultGroup>
          )}
        </div>
      )}
    </div>
  )
}

function ResultGroup({
  title,
  href,
  icon,
  children,
}: {
  title: string
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border">
        <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <Link href={href} className="text-xs text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border">{children}</CardContent>
    </Card>
  )
}

function Row({
  primary,
  secondary,
  amount,
  amountClass,
}: {
  primary: string
  secondary: string
  amount: string
  amountClass: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium truncate">{primary}</p>
        <p className="text-xs text-muted-foreground truncate">{secondary}</p>
      </div>
      <span className={`font-mono font-semibold shrink-0 ml-4 ${amountClass}`}>{amount}</span>
    </div>
  )
}
