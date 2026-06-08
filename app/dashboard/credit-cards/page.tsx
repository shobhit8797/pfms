import { getCreditCards } from "@/app/actions/credit-card"
import { CreditCardCard } from "@/components/credit-cards/credit-card-card"
import { AddCreditCardDialog } from "@/components/credit-cards/add-credit-card-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CreditCard, Wallet, Receipt } from "lucide-react"
import { serializeDecimals } from "@/lib/utils"

export default async function CreditCardsPage() {
  const [activeRaw, inactiveRaw] = await Promise.all([
    getCreditCards("ACTIVE"),
    getCreditCards("INACTIVE"),
  ])

  const activeCards = serializeDecimals(activeRaw)
  const inactiveCards = serializeDecimals(inactiveRaw)
  const allCards = [...activeCards, ...inactiveCards]

  const totalLimit = activeCards.reduce((acc, c) => acc + Number(c.creditLimit), 0)
  const totalOutstanding = activeCards.reduce((acc, c) => acc + Number(c.currentOutstanding), 0)
  const totalAvailable = activeCards.reduce((acc, c) => acc + Number(c.availableCredit), 0)
  const utilization = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : 0

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            Credit Cards
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your credit cards, limits, and payment due dates
          </p>
        </div>
        <AddCreditCardDialog />
      </div>

      {/* Summary Cards */}
      {allCards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Limit</p>
                <p className="font-heading text-2xl font-semibold text-gold-gradient">
                  ₹{totalLimit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="font-heading text-2xl font-semibold text-destructive">
                  ₹{totalOutstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Credit</p>
                <p className="font-heading text-2xl font-semibold text-success">
                  ₹{totalAvailable.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  utilization >= 75 ? "bg-destructive/10" : "bg-amber-500/10"
                }`}
              >
                <CreditCard
                  className={`w-6 h-6 ${utilization >= 75 ? "text-destructive" : "text-amber-500"}`}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Utilization</p>
                <p
                  className={`font-heading text-2xl font-semibold ${
                    utilization >= 75 ? "text-destructive" : "text-amber-500"
                  }`}
                >
                  {utilization.toFixed(0)}%
                </p>
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
            <h3 className="font-heading text-xl font-semibold">No credit cards added</h3>
            <p className="mb-6 mt-2 text-sm text-muted-foreground max-w-sm">
              Add your credit cards to track limits, outstanding balances, billing cycles, and
              payment due dates in one place.
            </p>
            <AddCreditCardDialog />
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
                    <CreditCardCard card={card} />
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
                    <CreditCardCard card={card} />
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
                  <CreditCardCard card={card} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
