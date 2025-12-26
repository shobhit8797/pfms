"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BankAccount } from "@prisma/client"
import { Landmark, CreditCard, Wallet } from "lucide-react"

interface AccountCardProps {
  account: BankAccount
}

export function AccountCard({ account }: AccountCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "SAVINGS":
        return <Wallet className="h-4 w-4 text-muted-foreground" />
      case "CURRENT":
        return <Landmark className="h-4 w-4 text-muted-foreground" />
      case "SALARY":
        return <CreditCard className="h-4 w-4 text-muted-foreground" />
      default:
        return <Landmark className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {account.accountName}
        </CardTitle>
        {getIcon(account.accountType)}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">₹{Number(account.currentBalance).toLocaleString('en-IN')}</div>
        <p className="text-xs text-muted-foreground">
          {account.bankName} • {account.accountNumber.slice(-4).padStart(account.accountNumber.length, '•')}
        </p>
        <div className="mt-2 flex gap-2">
            <Badge variant="secondary" className="text-xs">
                {account.accountType}
            </Badge>
            {account.isPrimary && (
                <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                    Primary
                </Badge>
            )}
        </div>
      </CardContent>
    </Card>
  )
}

