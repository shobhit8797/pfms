"use client"

import { useState, useTransition } from "react"
import { format, differenceInDays } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { EditSubscriptionDialog } from "@/components/subscriptions/edit-subscription-dialog"
import {
  markSubscriptionPaid,
  cancelSubscription,
  reactivateSubscription,
  deleteSubscription,
  getSubscriptionDetail,
} from "@/app/actions/subscription"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, History, Loader2, RotateCcw, Trash2, XCircle } from "lucide-react"

type Sub = {
  id: string
  serviceName: string
  amount: number
  billingCycle: string
  startDate: string
  endDate: string | null
  nextBillingDate: string
  autoRenewal: boolean
  category: string
  paymentMethod: string
  isActive: boolean
  notes: string | null
}

type MonthCell = { period: string; active: boolean; paid: boolean; amount: number }
type Payment = { id: string; periodStart: string; amount: number; status: string; paidDate: string | null }

export function SubscriptionCard({ sub, index }: { sub: Sub; index: number }) {
  const [isPending, startTransition] = useTransition()
  const [detailOpen, setDetailOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [months, setMonths] = useState<MonthCell[]>([])
  const [payments, setPayments] = useState<Payment[]>([])

  const daysUntilRenewal = differenceInDays(new Date(sub.nextBillingDate), new Date())
  const isOverdue = sub.isActive && daysUntilRenewal < 0
  const isRenewingSoon = sub.isActive && daysUntilRenewal >= 0 && daysUntilRenewal <= 7

  function act(fn: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const r = await fn()
      if (r?.error) toast.error(r.error)
      else if (r?.success) toast.success(r.success)
    })
  }

  async function openDetail(open: boolean) {
    setDetailOpen(open)
    if (!open) return
    setLoadingDetail(true)
    try {
      const data = await getSubscriptionDetail(sub.id)
      if (data) {
        setMonths(data.months)
        setPayments(data.payments)
      }
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <Card
      className={`bg-card border-border hover:border-border/80 transition-all opacity-0 animate-fade-in-up ${isRenewingSoon ? "border-chart-5/30" : ""} ${!sub.isActive ? "opacity-70" : ""}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-heading text-lg font-semibold">{sub.serviceName}</CardTitle>
            <Badge variant="secondary" className="mt-1 bg-muted text-muted-foreground border-0 text-xs">{sub.category}</Badge>
          </div>
          {sub.isActive && isRenewingSoon && (
            <div className="flex items-center gap-1 text-chart-5 bg-chart-5/10 px-2 py-1 rounded-lg">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-xs font-medium">{daysUntilRenewal === 0 ? "Today" : `${daysUntilRenewal}d`}</span>
            </div>
          )}
          {isOverdue && (
            <div className="flex items-center gap-1 text-destructive bg-destructive/10 px-2 py-1 rounded-lg">
              <AlertTriangle className="w-3 h-3" />
              <span className="text-xs font-medium">Overdue</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <span className="font-heading text-3xl font-semibold">
            ₹{Number(sub.amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
          <span className="text-sm text-muted-foreground ml-1">/{sub.billingCycle.toLowerCase()}</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Next billing</span>
            <span className="font-medium">{format(new Date(sub.nextBillingDate), "MMM d, yyyy")}</span>
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

        <div className="mt-4 flex flex-wrap gap-2">
          {sub.isActive && (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => act(() => markSubscriptionPaid(sub.id))}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark paid
            </Button>
          )}

          <Dialog open={detailOpen} onOpenChange={openDetail}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <History className="w-4 h-4 mr-1.5" /> History
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{sub.serviceName}</DialogTitle>
                <DialogDescription>Active &amp; paid periods, and full payment history.</DialogDescription>
              </DialogHeader>
              {loadingDetail ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium mb-2">Months</p>
                    <div className="flex flex-wrap gap-1.5">
                      {months.length === 0 && <p className="text-sm text-muted-foreground">No periods yet.</p>}
                      {months.map((m) => (
                        <span
                          key={m.period}
                          title={`${format(new Date(m.period), "MMM yyyy")} — ${m.paid ? "Paid" : m.active ? "Active, unpaid" : "Inactive"}`}
                          className={
                            "px-2 py-1 rounded-md text-xs font-medium border " +
                            (m.paid
                              ? "bg-success/10 text-success border-success/30"
                              : m.active
                                ? "bg-chart-5/10 text-chart-5 border-chart-5/30"
                                : "bg-muted text-muted-foreground border-border")
                          }
                        >
                          {format(new Date(m.period), "MMM ''yy")}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span><span className="inline-block w-2 h-2 rounded-full bg-success mr-1" />Paid</span>
                      <span><span className="inline-block w-2 h-2 rounded-full bg-chart-5 mr-1" />Active, unpaid</span>
                      <span><span className="inline-block w-2 h-2 rounded-full bg-muted-foreground mr-1" />Inactive</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Payment history</p>
                    {payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                    ) : (
                      <div className="divide-y divide-border rounded-lg border border-border">
                        {payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span>{format(new Date(p.periodStart), "MMM yyyy")}</span>
                            <span className="text-muted-foreground">
                              {p.paidDate ? format(new Date(p.paidDate), "MMM d, yyyy") : "—"}
                            </span>
                            <span className="font-medium">₹{Number(p.amount).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <EditSubscriptionDialog subscription={sub} />

          {sub.isActive ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => act(() => cancelSubscription(sub.id))}
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={() => act(() => reactivateSubscription(sub.id))}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Reactivate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  if (confirm(`Delete ${sub.serviceName} and its history?`)) act(() => deleteSubscription(sub.id))
                }}
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
