import { useState } from "react"
import { ScrollView, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Link } from "expo-router"
import { useExpenses, useIncome, usePendingMessages } from "../../lib/hooks"
import { useAuth } from "../../lib/auth"
import { formatINR } from "../../lib/format"
import { AddExpenseModal } from "../../components/AddExpenseModal"

export default function HomeScreen() {
  const { signOut } = useAuth()
  const expenses = useExpenses()
  const income = useIncome()
  const pending = usePendingMessages()
  const pendingCount = pending.data?.items.length ?? 0
  const [addExpense, setAddExpense] = useState(false)

  const totalExpense = (expenses.data?.items ?? []).reduce((s, e) => s + e.amount, 0)
  const totalIncome = (income.data?.items ?? []).reduce((s, i) => s + i.amount, 0)
  const net = totalIncome - totalExpense

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <Text className="mb-4 text-sm text-gray-500">
        Totals across your most recent entries (also visible on the web app).
      </Text>

      {/* Surfaces captured transactions to review as soon as the app opens. */}
      {pendingCount > 0 && (
        <Link href="/review" asChild>
          <TouchableOpacity
            activeOpacity={0.85}
            className="mb-3 flex-row items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4"
          >
            <Ionicons name="albums" size={22} color="#4f46e5" />
            <View className="flex-1">
              <Text className="text-base font-semibold text-indigo-900">
                {pendingCount} transaction{pendingCount > 1 ? "s" : ""} to review
              </Text>
              <Text className="text-xs text-indigo-600">Captured from your messages — tap to review & save.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#4f46e5" />
          </TouchableOpacity>
        </Link>
      )}

      <Card label="Net" value={formatINR(net)} accent={net >= 0 ? "text-green-600" : "text-red-600"} />
      <Card label="Income" value={formatINR(totalIncome)} accent="text-green-600" />
      <Card label="Expenses" value={formatINR(totalExpense)} accent="text-red-600" />

      {/* Quick action: add an expense from anywhere on the home screen. */}
      <TouchableOpacity
        onPress={() => setAddExpense(true)}
        activeOpacity={0.85}
        className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl bg-brand py-4 shadow-lg"
      >
        <Ionicons name="add-circle" size={22} color="white" />
        <Text className="text-base font-semibold text-white">Add expense</Text>
      </TouchableOpacity>
      <Text className="mt-2 text-center text-xs text-gray-400">
        Snap a receipt and let AI fill in the details.
      </Text>

      <TouchableOpacity onPress={signOut} className="mt-8 items-center rounded-lg border border-gray-300 py-3">
        <Text className="font-medium text-gray-700">Sign out</Text>
      </TouchableOpacity>

      <AddExpenseModal visible={addExpense} onClose={() => setAddExpense(false)} />
    </ScrollView>
  )
}

function Card({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View className="mb-3 rounded-2xl bg-white p-5">
      <Text className="mb-1 text-sm text-gray-500">{label}</Text>
      <Text className={`text-3xl font-bold ${accent}`}>{value}</Text>
    </View>
  )
}
