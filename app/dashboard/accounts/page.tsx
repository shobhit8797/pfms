import { getBankAccounts } from "@/app/actions/bank-account"
import { AccountCard } from "@/components/bank-accounts/account-card"
import { AddAccountDialog } from "@/components/bank-accounts/add-account-dialog"
import { Landmark } from "lucide-react"

export default async function AccountsPage() {
  const accounts = await getBankAccounts()

  const totalBalance = accounts.reduce((acc, account) => acc + Number(account.currentBalance), 0)

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

      {/* Total Balance Card */}
      {accounts.length > 0 && (
        <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Landmark className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="font-heading text-3xl font-semibold text-gold-gradient">
                ₹{totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {accounts.length === 0 ? (
        <div className="flex h-[400px] shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Landmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-xl font-semibold">No accounts added</h3>
            <p className="mb-6 mt-2 text-sm text-muted-foreground max-w-sm">
              Link your bank accounts to start tracking your finances and get a complete view of your wealth.
            </p>
            <AddAccountDialog />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {accounts.map((account, index) => (
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
    </div>
  )
}
