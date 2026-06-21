import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getSubscriptions } from "@/app/actions/subscription"
import { AddSubscriptionDialog } from "@/components/subscriptions/add-subscription-dialog"
import { SubscriptionCard } from "@/components/subscriptions/subscription-card"
import { differenceInDays } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Sparkles, Clock, CreditCard } from "lucide-react"

export default async function SubscriptionsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  // Returns DTOs (Decimals already serialized for Client Components).
  const subscriptions = await getSubscriptions(true)
  const activeSubscriptions = subscriptions.filter((s) => s.isActive)

  // Calculate monthly burn (active only)
  const monthlyBurn = activeSubscriptions.reduce((acc, sub) => {
    let monthlyAmount = Number(sub.amount)
    if (sub.billingCycle === "YEARLY") monthlyAmount /= 12
    if (sub.billingCycle === "QUARTERLY") monthlyAmount /= 3
    return acc + monthlyAmount
  }, 0)

  const upcomingRenewals = activeSubscriptions.filter(s => {
    const days = differenceInDays(new Date(s.nextBillingDate), new Date())
    return days >= 0 && days <= 7
  })

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            Subscriptions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your recurring subscriptions
          </p>
        </div>
        <AddSubscriptionDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">{activeSubscriptions.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active services</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/10 via-card to-card border-destructive/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Burn
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">
              ₹{monthlyBurn.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Per month</p>
          </CardContent>
        </Card>

        <Card className={`bg-card border-border ${upcomingRenewals.length > 0 ? "border-chart-5/30" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Renewals
            </CardTitle>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${upcomingRenewals.length > 0 ? "bg-chart-5/10" : "bg-muted"}`}>
              <Clock className={`w-4 h-4 ${upcomingRenewals.length > 0 ? "text-chart-5" : "text-muted-foreground"}`} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-3xl font-semibold">{upcomingRenewals.length}</p>
            <p className="text-xs text-muted-foreground mt-1">In next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Grid */}
      {subscriptions.length === 0 ? (
        <div className="flex h-[400px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-xl font-semibold">No subscriptions</h3>
            <p className="mb-6 mt-2 text-sm text-muted-foreground max-w-sm">
              Add your subscriptions to track recurring expenses and never miss a renewal.
            </p>
            <AddSubscriptionDialog />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((sub, index) => (
            <SubscriptionCard key={sub.id} sub={sub} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
