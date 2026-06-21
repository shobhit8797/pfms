import { useCallback, useState } from "react"
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Link } from "expo-router"
import { useQueryClient } from "@tanstack/react-query"
import { useExpenses, useIncome, usePendingMessages } from "../../lib/hooks"
import { useAuth } from "../../lib/auth"
import { useThemeColors } from "../../lib/theme"
import { formatINR } from "../../lib/format"
import { AddExpenseModal } from "../../components/AddExpenseModal"
import { TrendChart } from "../../components/TrendChart"

export default function HomeScreen() {
  const { signOut } = useAuth()
  const c = useThemeColors()
  const expenses = useExpenses()
  const income = useIncome()
  const pending = usePendingMessages()
  const pendingCount = pending.data?.items.length ?? 0
  const [addExpense, setAddExpense] = useState(false)
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  // Pull-to-refresh refetches every query in the app (expenses, income, accounts,
  // cards, UPI, review queue, …) so all tabs reflect fresh data after a pull.
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await qc.invalidateQueries()
    } finally {
      setRefreshing(false)
    }
  }, [qc])

  const totalExpense = (expenses.data?.items ?? []).reduce((s, e) => s + e.amount, 0)
  const totalIncome = (income.data?.items ?? []).reduce((s, i) => s + i.amount, 0)
  const net = totalIncome - totalExpense

  return (
    <ScrollView
      className="flex-1 bg-background p-4"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.mutedForeground} />}
    >
      <Text className="mb-4 text-sm text-muted-foreground">
        Totals across your most recent entries (also visible on the web app).
      </Text>

      {/* Surfaces captured transactions to review as soon as the app opens. */}
      {pendingCount > 0 && (
        <Link href="/review" asChild>
          <TouchableOpacity
            activeOpacity={0.85}
            className="mb-3 flex-row items-center gap-3 rounded-2xl border border-primary/30 bg-secondary p-4"
          >
            <Ionicons name="albums" size={22} color={c.primary} />
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                {pendingCount} transaction{pendingCount > 1 ? "s" : ""} to review
              </Text>
              <Text className="text-xs text-muted-foreground">Captured from your messages — tap to review & save.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.primary} />
          </TouchableOpacity>
        </Link>
      )}

      <Card label="Net" value={formatINR(net)} accent={net >= 0 ? "text-success" : "text-destructive"} />
      <Card label="Income" value={formatINR(totalIncome)} accent="text-success" />
      <Card label="Expenses" value={formatINR(totalExpense)} accent="text-destructive" />

      {/* Expense & income trends, bucketed by day/week/month. */}
      <TrendChart expenses={expenses.data?.items ?? []} income={income.data?.items ?? []} />

      {/* Quick action: add an expense from anywhere on the home screen. */}
      <TouchableOpacity
        onPress={() => setAddExpense(true)}
        activeOpacity={0.85}
        className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-4 shadow-lg"
      >
        <Ionicons name="add-circle" size={22} color={c.primaryForeground} />
        <Text className="text-base font-semibold text-primary-foreground">Add expense</Text>
      </TouchableOpacity>
      <Text className="mt-2 text-center text-xs text-muted-foreground">
        Snap a receipt and let AI fill in the details.
      </Text>

      <TouchableOpacity onPress={signOut} className="mt-8 items-center rounded-lg border border-border py-3">
        <Text className="font-medium text-muted-foreground">Sign out</Text>
      </TouchableOpacity>

      <AddExpenseModal visible={addExpense} onClose={() => setAddExpense(false)} />
    </ScrollView>
  )
}

function Card({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View className="mb-3 rounded-2xl border border-border bg-card p-5">
      <Text className="mb-1 text-sm text-muted-foreground">{label}</Text>
      <Text className={`text-3xl font-bold ${accent}`}>{value}</Text>
    </View>
  )
}
