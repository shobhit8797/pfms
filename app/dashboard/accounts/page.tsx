import { getBankAccounts } from "@/app/actions/bank-account"
import { AccountCard } from "@/components/bank-accounts/account-card"
import { AddAccountDialog } from "@/components/bank-accounts/add-account-dialog"
import { Separator } from "@/components/ui/separator"

export default async function AccountsPage() {
  const accounts = await getBankAccounts()

  return (
    <div className="container mx-auto py-10 px-4 md:px-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bank Accounts</h2>
          <p className="text-muted-foreground">
            Manage your bank accounts and view balances.
          </p>
        </div>
        <AddAccountDialog />
      </div>
      <Separator className="my-6" />
      
      {accounts.length === 0 ? (
        <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <h3 className="mt-4 text-lg font-semibold">No accounts added</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              You haven't added any bank accounts yet. Add one to start tracking your finances.
            </p>
            <AddAccountDialog />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  )
}

