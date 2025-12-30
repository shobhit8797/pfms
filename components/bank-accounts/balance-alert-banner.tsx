"use client"

import { useTransition } from "react"
import { markAlertAsRead } from "@/app/actions/bank-account"
import { Button } from "@/components/ui/button"
import { BalanceAlert } from "@prisma/client"
import { AlertTriangle, X, TrendingDown, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface BalanceAlertBannerProps {
  alerts: BalanceAlert[]
}

export function BalanceAlertBanner({ alerts }: BalanceAlertBannerProps) {
  const [isPending, startTransition] = useTransition()

  const handleDismiss = (alertId: string) => {
    startTransition(async () => {
      const result = await markAlertAsRead(alertId)
      if (result.error) {
        toast.error(result.error)
      }
    })
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "LOW_BALANCE":
        return <TrendingDown className="h-4 w-4" />
      case "MINIMUM_BALANCE":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case "LOW_BALANCE":
        return "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
      case "MINIMUM_BALANCE":
        return "bg-destructive/10 border-destructive/30 text-destructive"
      case "HIGH_SPENDING":
        return "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
      default:
        return "bg-primary/10 border-primary/30 text-primary"
    }
  }

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center justify-between px-4 py-3 rounded-lg border ${getAlertColor(alert.alertType)}`}
        >
          <div className="flex items-center gap-3">
            {getAlertIcon(alert.alertType)}
            <span className="text-sm font-medium">{alert.message}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-70 hover:opacity-100"
            onClick={() => handleDismiss(alert.id)}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      ))}
    </div>
  )
}

