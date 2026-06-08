import { getBankAccounts } from "@/app/actions/bank-account"
import { AccountCard } from "@/components/bank-accounts/account-card"
import { AddAccountDialog } from "@/components/bank-accounts/add-account-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Landmark, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { serializeDecimals } from "@/lib/utils"

export default async function AccountsPage() {
  const [activeAccountsRaw, inactiveAccountsRaw] = await Promise.all([
    getBankAccounts("ACTIVE"),
    getBankAccounts("INACTIVE"),
  ])

  // Serialize Decimal fields for Client Components
  const activeAccounts = serializeDecimals(activeAccountsRaw)
  const inactiveAccounts = serializeDecimals(inactiveAccountsRaw)

  const allAccounts = [...activeAccounts, ...inactiveAccounts]

  const totalBalance = activeAccounts.reduce(
    (acc, account) => acc + Number(account.currentBalance),
    0
  )

  const monthlyIncome = activeAccounts.reduce((acc, account) => acc + account.monthlyIncome, 0)
  const monthlyExpense = activeAccounts.reduce((acc, account) => acc + account.monthlyExpense, 0)
  const netFlow = monthlyIncome - monthlyExpense

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            Bank Accounts
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your bank accounts and view balances
          </p>
        </div>
        <AddAccountDialog />
      </div>

      {/* Summary Cards */}
      {allAccounts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Balance */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Landmark className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="font-heading text-2xl font-semibold text-gold-gradient">
                  ₹{totalBalance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Income */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month Income</p>
                <p className="font-heading text-2xl font-semibold text-success">
                  +₹{monthlyIncome.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Monthly Expenses */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month Expenses</p>
                <p className="font-heading text-2xl font-semibold text-destructive">
                  -₹{monthlyExpense.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Net Flow */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  netFlow >= 0 ? "bg-success/10" : "bg-destructive/10"
                }`}
              >
                <Wallet className={`w-6 h-6 ${netFlow >= 0 ? "text-success" : "text-destructive"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                <p
                  className={`font-heading text-2xl font-semibold ${
                    netFlow >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {netFlow >= 0 ? "+" : ""}₹
                  {Math.abs(netFlow).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {allAccounts.length === 0 ? (
        <div className="flex h-[400px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Landmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-xl font-semibold">No accounts added</h3>
            <p className="mb-6 mt-2 text-sm text-muted-foreground max-w-sm">
              Link your bank accounts to start tracking your finances and get a complete view of
              your wealth.
            </p>
            <AddAccountDialog />
          </div>
        </div>
      ) : (
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              Active
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {activeAccounts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="gap-2">
              Inactive
              {inactiveAccounts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {inactiveAccounts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              All
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {allAccounts.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {activeAccounts.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
                <p className="text-sm text-muted-foreground">No active accounts</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeAccounts.map((account, index) => (
                  <div
                    key={account.id}
                    className="opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <AccountCard account={account} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inactive">
            {inactiveAccounts.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
                <p className="text-sm text-muted-foreground">No inactive accounts</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {inactiveAccounts.map((account, index) => (
                  <div
                    key={account.id}
                    className="opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <AccountCard account={account} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {allAccounts.map((account, index) => (
                <div
                  key={account.id}
                  className="opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <AccountCard account={account} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
