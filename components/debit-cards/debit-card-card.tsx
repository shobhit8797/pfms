"use client"

import { useState, useTransition } from "react"
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
import { toggleDebitCardStatus } from "@/app/actions/debit-card"
import { EditDebitCardDialog } from "./edit-debit-card-dialog"
import { DeleteDebitCardDialog } from "./delete-debit-card-dialog"
import { DebitCard, BankAccount } from "@prisma/client"
import { toast } from "sonner"
import {
  CreditCard,
  MoreVertical,
  Power,
  PowerOff,
  Pencil,
  Trash2,
  Building2,
} from "lucide-react"

const NETWORK_COLORS: Record<string, string> = {
  VISA: "text-blue-600 dark:text-blue-400",
  MASTERCARD: "text-orange-600 dark:text-orange-400",
  RUPAY: "text-green-600 dark:text-green-400",
  MAESTRO: "text-purple-600 dark:text-purple-400",
  AMEX: "text-sky-600 dark:text-sky-400",
}

interface Props {
  card: DebitCard
  bankAccounts?: Pick<BankAccount, "id" | "bankName" | "accountName">[]
}

export function DebitCardCard({ card, bankAccounts = [] }: Props) {
  const [isPending, startTransition] = useTransition()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const networkColor = card.cardNetwork ? (NETWORK_COLORS[card.cardNetwork] ?? "text-muted-foreground") : "text-muted-foreground"

  const handleToggleStatus = () => {
    startTransition(async () => {
      const result = await toggleDebitCardStatus(card.id, !card.isActive)
      if (result.success) {
        toast.success(result.success)
      } else if (result.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <Card
        className={`bg-card border-border hover:border-border/80 transition-all card-hover relative ${
          !card.isActive ? "opacity-60" : ""
        }`}
      >
        <CardHeader className="flex flex-row items-start justify-between pb-2 pr-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate pr-2">{card.cardName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{card.bankName}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-emerald-500" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  disabled={isPending}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Card
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleStatus}>
                  {card.isActive ? (
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
                  Delete Card
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-2xl font-heading font-semibold tracking-tight">
            ····{card.lastFourDigits}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {card.cardNetwork && (
              <Badge
                variant="secondary"
                className={`bg-muted border-0 font-semibold ${networkColor}`}
              >
                {card.cardNetwork}
              </Badge>
            )}
            {card.bankAccountId && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 font-normal">
                <Building2 className="h-3 w-3 mr-1" />
                Linked account
              </Badge>
            )}
            {!card.isActive && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                <PowerOff className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
          {card.notes && (
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{card.notes}</p>
          )}
        </CardContent>
      </Card>

      <EditDebitCardDialog
        card={card}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        bankAccounts={bankAccounts}
      />
      <DeleteDebitCardDialog
        card={card}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  )
}
