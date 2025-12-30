"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BankAccountWithStats, setPrimaryAccount, toggleAccountStatus } from "@/app/actions/bank-account"
import { EditAccountDialog } from "./edit-account-dialog"
import { DeleteAccountDialog } from "./delete-account-dialog"
import { toast } from "sonner"
import {
  Landmark,
  CreditCard,
  Wallet,
  Building2,
  MoreVertical,
  Star,
  Power,
  PowerOff,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Eye,
  Upload,
  ArrowRightLeft,
  AlertTriangle,
} from "lucide-react"

interface AccountCardProps {
  account: BankAccountWithStats
}

export function AccountCard({ account }: AccountCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const getIcon = (type: string) => {
    switch (type) {
      case "SAVINGS":
        return <Wallet className="h-5 w-5 text-primary" />
      case "CURRENT":
        return <Building2 className="h-5 w-5 text-chart-4" />
      case "SALARY":
        return <CreditCard className="h-5 w-5 text-success" />
      case "OVERDRAFT":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      default:
        return <Landmark className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case "SAVINGS":
        return "bg-primary/10"
      case "CURRENT":
        return "bg-chart-4/10"
      case "SALARY":
        return "bg-success/10"
      case "OVERDRAFT":
        return "bg-amber-500/10"
      default:
        return "bg-muted"
    }
  }

  const getColorAccent = (color: string | null) => {
    if (!color) return ""
    const colorMap: Record<string, string> = {
      emerald: "border-l-4 border-l-emerald-500",
      blue: "border-l-4 border-l-blue-500",
      violet: "border-l-4 border-l-violet-500",
      amber: "border-l-4 border-l-amber-500",
      rose: "border-l-4 border-l-rose-500",
      slate: "border-l-4 border-l-slate-500",
    }
    return colorMap[color] || ""
  }

  const handleToggleStatus = () => {
    startTransition(async () => {
      const result = await toggleAccountStatus(account.id, !account.isActive)
      if (result.success) {
        toast.success(result.success)
      } else if (result.error) {
        toast.error(result.error)
      }
    })
  }

  const handleSetPrimary = () => {
    startTransition(async () => {
      const result = await setPrimaryAccount(account.id)
      if (result.success) {
        toast.success(result.success)
      } else if (result.error) {
        toast.error(result.error)
      }
    })
  }

  const handleViewDetails = () => {
    router.push(`/dashboard/accounts/${account.id}`)
  }

  const formatTrend = (trend: number) => {
    if (Math.abs(trend) < 0.1) return null
    return {
      value: Math.abs(trend).toFixed(1),
      isPositive: trend > 0,
    }
  }

  const trend = formatTrend(account.balanceTrend)

  return (
    <>
      <Card
        className={`bg-card border-border hover:border-border/80 transition-all card-hover relative ${
          !account.isActive ? "opacity-60" : ""
        } ${getColorAccent(account.color)}`}
      >
        <CardHeader className="flex flex-row items-start justify-between pb-2 pr-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate pr-2">
              {account.accountName}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{account.bankName}</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-xl ${getIconBg(account.accountType)} flex items-center justify-center shrink-0`}
            >
              {getIcon(account.accountType)}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={isPending}>
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleViewDetails}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push(`/dashboard/accounts/${account.id}?tab=upload`)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Statement
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/dashboard/accounts/transfers?from=${account.id}`)}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer Funds
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!account.isPrimary && account.isActive && (
                  <DropdownMenuItem onClick={handleSetPrimary}>
                    <Star className="mr-2 h-4 w-4 text-amber-500" />
                    Set as Primary
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleToggleStatus}>
                  {account.isActive ? (
                    <>
                      <PowerOff className="mr-2 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 h-4 w-4 text-success" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-baseline gap-2">
            <p className="font-heading text-2xl font-semibold tracking-tight">
              ₹{Number(account.currentBalance).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
            {trend && (
              <span
                className={`flex items-center text-xs font-medium ${
                  trend.isPositive ? "text-success" : "text-destructive"
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-0.5" />
                )}
                {trend.value}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ····{account.accountNumber.slice(-4)} · {account.ifscCode}
          </p>

          {/* Monthly Stats */}
          {(account.monthlyIncome > 0 || account.monthlyExpense > 0) && (
            <div className="mt-3 flex items-center gap-3 text-xs">
              {account.monthlyIncome > 0 && (
                <span className="text-success flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />+₹
                  {account.monthlyIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              )}
              {account.monthlyExpense > 0 && (
                <span className="text-destructive flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  -₹{account.monthlyExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>
          )}

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge
              variant="secondary"
              className="text-xs bg-muted text-muted-foreground border-0 font-normal"
            >
              {account.accountType}
            </Badge>
            {account.isPrimary && (
              <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-0">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Primary
              </Badge>
            )}
            {!account.isActive && (
              <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-0">
                <PowerOff className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <EditAccountDialog
        account={account}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <DeleteAccountDialog
        account={account}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  )
}
