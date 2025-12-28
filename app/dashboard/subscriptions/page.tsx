import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getSubscriptions, cancelSubscription } from "@/app/actions/subscription"
import { AddSubscriptionDialog } from "@/components/subscriptions/add-subscription-dialog"
import { format, differenceInDays } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { XCircle, Sparkles, Clock, CreditCard, AlertTriangle } from "lucide-react"

export default async function SubscriptionsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const subscriptions = await getSubscriptions()

  // Calculate monthly burn
  const monthlyBurn = subscriptions.reduce((acc, sub) => {
    let monthlyAmount = Number(sub.amount)
    if (sub.billingCycle === "YEARLY") monthlyAmount /= 12
    if (sub.billingCycle === "QUARTERLY") monthlyAmount /= 3
    return acc + monthlyAmount
  }, 0)

  const upcomingRenewals = subscriptions.filter(s => differenceInDays(s.nextBillingDate, new Date()) <= 7)

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
            <p className="font-heading text-3xl font-semibold">{subscriptions.length}</p>
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
          {subscriptions.map((sub, index) => {
            const daysUntilRenewal = differenceInDays(sub.nextBillingDate, new Date())
            const isRenewingSoon = daysUntilRenewal <= 7
            
            return (
              <Card 
                key={sub.id} 
                className={`bg-card border-border hover:border-border/80 transition-all opacity-0 animate-fade-in-up ${isRenewingSoon ? "border-chart-5/30" : ""}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-heading text-lg font-semibold">{sub.serviceName}</CardTitle>
                      <Badge variant="secondary" className="mt-1 bg-muted text-muted-foreground border-0 text-xs">
                        {sub.category}
                      </Badge>
                    </div>
                    {isRenewingSoon && (
                      <div className="flex items-center gap-1 text-chart-5 bg-chart-5/10 px-2 py-1 rounded-lg">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-xs font-medium">{daysUntilRenewal}d</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="font-heading text-3xl font-semibold">
                      ₹{Number(sub.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      /{sub.billingCycle.toLowerCase()}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next billing</span>
                      <span className="font-medium">{format(sub.nextBillingDate, "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment</span>
                      <span className="font-medium">{sub.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <Badge 
                        variant={sub.isActive ? "default" : "secondary"} 
                        className={sub.isActive ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}
                      >
                        {sub.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  
                  <form action={async () => {
                    "use server"
                    await cancelSubscription(sub.id)
                  }}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Subscription
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
