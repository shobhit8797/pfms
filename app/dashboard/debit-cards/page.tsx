import { getDebitCards } from "@/app/actions/debit-card"
import { DebitCardCard } from "@/components/debit-cards/debit-card-card"
import { AddDebitCardDialog } from "@/components/debit-cards/add-debit-card-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard } from "lucide-react"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export default async function DebitCardsPage() {
  const session = await auth()
  const userId = session?.user?.id

  const [activeCards, inactiveCards, bankAccountsRaw] = await Promise.all([
    getDebitCards("ACTIVE"),
    getDebitCards("INACTIVE"),
    userId
      ? prisma.bankAccount.findMany({
          where: { userId, isActive: true },
          select: { id: true, bankName: true, accountName: true },
          orderBy: { bankName: "asc" },
        })
      : Promise.resolve([]),
  ])

  const allCards = [...activeCards, ...inactiveCards]

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            Debit Cards
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your debit cards and the expenses paid with them
          </p>
        </div>
        <AddDebitCardDialog bankAccounts={bankAccountsRaw} />
      </div>

      {/* Summary */}
      {allCards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 via-card to-card border border-emerald-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cards</p>
                <p className="font-heading text-2xl font-semibold">{allCards.length}</p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="font-heading text-2xl font-semibold text-primary">{activeCards.length}</p>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="font-heading text-2xl font-semibold text-muted-foreground">{inactiveCards.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {allCards.length === 0 ? (
        <div className="flex h-[400px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-xl font-semibold">No debit cards added</h3>
            <p className="mb-6 mt-2 text-sm text-muted-foreground max-w-sm">
              Add your debit cards to track which card was used for each expense.
              Use Apple AutoFill on iOS to fill in card details instantly.
            </p>
            <AddDebitCardDialog bankAccounts={bankAccountsRaw} />
          </div>
        </div>
      ) : (
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              Active
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeCards.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="gap-2">
              Inactive
              {inactiveCards.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {inactiveCards.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {allCards.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeCards.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
                <p className="text-sm text-muted-foreground">No active cards</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <DebitCardCard card={card} bankAccounts={bankAccountsRaw} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inactive">
            {inactiveCards.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
                <p className="text-sm text-muted-foreground">No inactive cards</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {inactiveCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <DebitCardCard card={card} bankAccounts={bankAccountsRaw} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {allCards.map((card, index) => (
                <div
                  key={card.id}
                  className="opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <DebitCardCard card={card} bankAccounts={bankAccountsRaw} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
