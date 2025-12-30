import { notFound } from "next/navigation"
import Link from "next/link"
import {
  getBankAccountById,
  getAccountAnalytics,
  getAccountTransactionHistory,
  getBalanceHistory,
  getBalanceAlerts,
} from "@/app/actions/bank-account"
import { AccountDetailHeader } from "@/components/bank-accounts/account-detail-header"
import { AccountAnalyticsDashboard } from "@/components/bank-accounts/account-analytics-dashboard"
import { TransactionHistoryTable } from "@/components/bank-accounts/transaction-history-table"
import { BalanceAlertBanner } from "@/components/bank-accounts/balance-alert-banner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload, ArrowRightLeft } from "lucide-react"

interface AccountDetailPageProps {
  params: Promise<{ accountId: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function AccountDetailPage({ params, searchParams }: AccountDetailPageProps) {
  const { accountId } = await params
  const { tab } = await searchParams

  const [account, analytics, transactionHistory, balanceHistory, alerts] = await Promise.all([
    getBankAccountById(accountId),
    getAccountAnalytics(accountId, "MONTH"),
    getAccountTransactionHistory(accountId, 1, 20),
    getBalanceHistory(
      accountId,
      new Date(new Date().setMonth(new Date().getMonth() - 3)),
      new Date()
    ),
    getBalanceAlerts(accountId, true),
  ])

  if (!account) {
    notFound()
  }

  const defaultTab = tab || "overview"

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Breadcrumb and Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/accounts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">
              {account.accountName}
            </h1>
            <p className="text-muted-foreground text-sm">
              {account.bankName} · ····{account.accountNumber.slice(-4)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/accounts/${accountId}?tab=upload`}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Statement
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/accounts/transfers?from=${accountId}`}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transfer
            </Link>
          </Button>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && <BalanceAlertBanner alerts={alerts} />}

      {/* Account Header */}
      <AccountDetailHeader account={account} analytics={analytics} />

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="upload">Upload Statement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AccountAnalyticsDashboard
            analytics={analytics}
            balanceHistory={balanceHistory}
            compact
          />
          <TransactionHistoryTable
            transactions={transactionHistory.transactions}
            showPagination={false}
            limit={10}
          />
          {transactionHistory.total > 10 && (
            <div className="flex justify-center">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/accounts/${accountId}?tab=transactions`}>
                  View All Transactions
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionHistoryTable
            transactions={transactionHistory.transactions}
            total={transactionHistory.total}
            pages={transactionHistory.pages}
            showPagination
          />
        </TabsContent>

        <TabsContent value="analytics">
          <AccountAnalyticsDashboard analytics={analytics} balanceHistory={balanceHistory} />
        </TabsContent>

        <TabsContent value="upload">
          <div className="flex h-[400px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
            <div className="text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-lg font-semibold">Statement Upload</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Upload your bank statement (CSV, Excel, or PDF) to automatically import
                transactions.
              </p>
              <Button className="mt-4">
                <Upload className="h-4 w-4 mr-2" />
                Select File
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

