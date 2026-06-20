import { useEffect, useState } from "react"
import { ActivityIndicator, Alert, FlatList, Image, Linking, RefreshControl, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { ExpenseDTO } from "@pfms/shared"
import { useDeleteExpense, useExpenses } from "../../lib/hooks"
import { useThemeColors } from "../../lib/theme"
import { formatDate, formatINR } from "../../lib/format"
import { localReceiptUri } from "../../lib/receipt-store"
import { AddExpenseModal } from "../../components/AddExpenseModal"

export default function ExpensesScreen() {
  const { data, isLoading, refetch, isRefetching } = useExpenses()
  const c = useThemeColors()
  const del = useDeleteExpense()
  const [modal, setModal] = useState(false)

  const confirmDelete = (e: ExpenseDTO) =>
    Alert.alert("Delete expense", `Delete "${e.description}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => del.mutate(e.id) },
    ])

  return (
    <View className="flex-1 bg-background">
      {isLoading ? (
        <ActivityIndicator className="mt-10" color={c.primary} />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(e) => e.id}
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.mutedForeground} />}
          ListEmptyComponent={<Text className="mt-10 text-center text-muted-foreground">No expenses yet. Tap + to add one.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              onLongPress={() => confirmDelete(item)}
              className="mb-2 flex-row items-center justify-between rounded-xl border border-border bg-card p-4"
            >
              {item.receiptUrl ? <ReceiptThumb expenseId={item.id} url={item.receiptUrl} /> : null}
              <View className="flex-1 pr-3">
                <Text className="text-base font-medium text-foreground">{item.description}</Text>
                <Text className="text-xs text-muted-foreground">
                  {item.category} · {formatDate(item.expenseDate)}
                </Text>
              </View>
              <Text className="text-base font-semibold text-destructive">-{formatINR(item.amount)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        onPress={() => setModal(true)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
      >
        <Text className="text-3xl leading-9 text-primary-foreground">+</Text>
      </TouchableOpacity>

      <AddExpenseModal visible={modal} onClose={() => setModal(false)} />
    </View>
  )
}

/**
 * Small receipt preview for an expense row. Prefers the on-device cached copy
 * (offline-capable), falling back to the remote Blob URL. PDFs show a doc icon.
 * Tapping opens the receipt (remote URL) in the system viewer/browser.
 */
function ReceiptThumb({ expenseId, url }: { expenseId: string; url: string }) {
  const c = useThemeColors()
  const [localUri, setLocalUri] = useState<string | null>(null)
  const isPdf = url.toLowerCase().includes(".pdf")

  useEffect(() => {
    let active = true
    localReceiptUri(expenseId).then((u) => active && setLocalUri(u))
    return () => { active = false }
  }, [expenseId])

  const source = localUri ?? url

  return (
    <TouchableOpacity
      onPress={() => Linking.openURL(url).catch(() => {})}
      className="mr-3 h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-muted"
    >
      {isPdf ? (
        <Ionicons name="document-text-outline" size={20} color={c.primary} />
      ) : (
        <Image source={{ uri: source }} className="h-11 w-11" resizeMode="cover" />
      )}
    </TouchableOpacity>
  )
}
