"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BankAccount } from "@prisma/client"
import { Landmark, CreditCard, Wallet, Building2 } from "lucide-react"

interface AccountCardProps {
  account: BankAccount
}

export function AccountCard({ account }: AccountCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "SAVINGS":
        return <Wallet className="h-5 w-5 text-primary" />
      case "CURRENT":
        return <Building2 className="h-5 w-5 text-chart-4" />
      case "SALARY":
        return <CreditCard className="h-5 w-5 text-success" />
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
      default:
        return "bg-muted"
    }
  }

  return (
    <Card className="bg-card border-border hover:border-border/80 transition-all card-hover">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium truncate pr-2">
          {account.accountName}
        </CardTitle>
        <div className={`w-10 h-10 rounded-xl ${getIconBg(account.accountType)} flex items-center justify-center shrink-0`}>
          {getIcon(account.accountType)}
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-semibold tracking-tight">
          ₹{Number(account.currentBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {account.bankName} · ····{account.accountNumber.slice(-4)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge 
            variant="secondary" 
            className="text-xs bg-muted text-muted-foreground border-0 font-normal"
          >
            {account.accountType}
          </Badge>
          {account.isPrimary && (
            <Badge 
              variant="secondary" 
              className="text-xs bg-primary/10 text-primary border-0"
            >
              Primary
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
