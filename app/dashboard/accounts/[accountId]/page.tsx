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
import { StatementUploadSection } from "@/components/bank-accounts/statement-upload-section"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload, ArrowRightLeft } from "lucide-react"
import { serializeDecimals } from "@/lib/utils"

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

  // Serialize Decimal fields for Client Components
  const serializedAccount = serializeDecimals(account)
  const serializedAnalytics = serializeDecimals(analytics)
  const serializedBalanceHistory = serializeDecimals(balanceHistory)
  const serializedAlerts = serializeDecimals(alerts)
  const serializedTransactionHistory = serializeDecimals(transactionHistory)

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
              {serializedAccount.accountName}
            </h1>
            <p className="text-muted-foreground text-sm">
              {serializedAccount.bankName} · ····{serializedAccount.accountNumber.slice(-4)}
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
      {serializedAlerts.length > 0 && <BalanceAlertBanner alerts={serializedAlerts} />}

      {/* Account Header */}
      <AccountDetailHeader account={serializedAccount} analytics={serializedAnalytics} />

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
            analytics={serializedAnalytics}
            balanceHistory={serializedBalanceHistory}
            compact
          />
          <TransactionHistoryTable
            transactions={serializedTransactionHistory.transactions}
            showPagination={false}
            limit={10}
          />
          {serializedTransactionHistory.total > 10 && (
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
            transactions={serializedTransactionHistory.transactions}
            total={serializedTransactionHistory.total}
            pages={serializedTransactionHistory.pages}
            showPagination
          />
        </TabsContent>

        <TabsContent value="analytics">
          <AccountAnalyticsDashboard analytics={serializedAnalytics} balanceHistory={serializedBalanceHistory} />
        </TabsContent>

        <TabsContent value="upload">
          <StatementUploadSection accountId={accountId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

