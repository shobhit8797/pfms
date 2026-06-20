import { useState } from "react"
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TouchableOpacity, View } from "react-native"
import type { IncomeDTO } from "@pfms/shared"
import { useDeleteIncome, useIncome } from "../../lib/hooks"
import { formatDate, formatINR } from "../../lib/format"
import { AddIncomeModal } from "../../components/AddIncomeModal"

export default function IncomeScreen() {
  const { data, isLoading, refetch, isRefetching } = useIncome()
  const del = useDeleteIncome()
  const [modal, setModal] = useState(false)

  const confirmDelete = (i: IncomeDTO) =>
    Alert.alert("Delete income", `Delete "${i.source}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => del.mutate(i.id) },
    ])

  return (
    <View className="flex-1 bg-gray-50">
      {isLoading ? (
        <ActivityIndicator className="mt-10" color="#4f46e5" />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(i) => i.id}
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<Text className="mt-10 text-center text-gray-400">No income yet. Tap + to add one.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              onLongPress={() => confirmDelete(item)}
              className="mb-2 flex-row items-center justify-between rounded-xl bg-white p-4"
            >
              <View className="flex-1 pr-3">
                <Text className="text-base font-medium text-gray-900">{item.source}</Text>
                <Text className="text-xs text-gray-500">
                  {item.category} · {formatDate(item.incomeDate)}
                </Text>
              </View>
              <Text className="text-base font-semibold text-green-600">+{formatINR(item.amount)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        onPress={() => setModal(true)}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand shadow-lg"
      >
        <Text className="text-3xl leading-9 text-white">+</Text>
      </TouchableOpacity>

      <AddIncomeModal visible={modal} onClose={() => setModal(false)} />
    </View>
  )
}
