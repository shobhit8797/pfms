"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toggleCreditCardStatus } from "@/app/actions/credit-card"
import { EditCreditCardDialog } from "./edit-credit-card-dialog"
import { DeleteCreditCardDialog } from "./delete-credit-card-dialog"
import { CreditCard as CreditCardModel } from "@prisma/client"
import { toast } from "sonner"
import {
  CreditCard,
  MoreVertical,
  Power,
  PowerOff,
  Pencil,
  Trash2,
  CalendarClock,
  Gift,
} from "lucide-react"

interface CreditCardCardProps {
  card: CreditCardModel
}

export function CreditCardCard({ card }: CreditCardCardProps) {
  const [isPending, startTransition] = useTransition()
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const limit = Number(card.creditLimit)
  const outstanding = Number(card.currentOutstanding)
  const available = Number(card.availableCredit)
  const utilization = limit > 0 ? Math.min((outstanding / limit) * 100, 100) : 0

  const utilColor =
    utilization >= 75
      ? "text-destructive"
      : utilization >= 40
        ? "text-amber-500"
        : "text-success"

  const handleToggleStatus = () => {
    startTransition(async () => {
      const result = await toggleCreditCardStatus(card.id, !card.isActive)
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
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
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
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="font-heading text-2xl font-semibold tracking-tight">
                ₹{outstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Available</p>
              <p className="font-medium text-success">
                ₹{available.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            ····{card.lastFourDigits} · Limit ₹
            {limit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>

          {/* Utilization */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Utilization</span>
              <span className={`font-medium ${utilColor}`}>{utilization.toFixed(0)}%</span>
            </div>
            <Progress value={utilization} className="h-1.5" />
          </div>

          {/* Meta */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge
              variant="secondary"
              className="bg-muted text-muted-foreground border-0 font-normal"
            >
              <CalendarClock className="h-3 w-3 mr-1" />
              Bills {card.billingDate} · Due {card.dueDate}
            </Badge>
            {card.rewardPoints > 0 && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 font-normal">
                <Gift className="h-3 w-3 mr-1" />
                {card.rewardPoints.toLocaleString("en-IN")} pts
              </Badge>
            )}
            {!card.isActive && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground border-0">
                <PowerOff className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <EditCreditCardDialog card={card} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      <DeleteCreditCardDialog
        card={card}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  )
}
