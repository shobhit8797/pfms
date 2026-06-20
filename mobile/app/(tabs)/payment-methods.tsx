import { useState } from "react"
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { CardDTO, UpiHandleDTO } from "@pfms/shared"
import { useCards, useDeleteCard, useUpiHandles, useDeleteUpiHandle } from "../../lib/hooks"
import { AddCardModal } from "../../components/AddCardModal"
import { AddUpiModal } from "../../components/AddUpiModal"

export default function PaymentMethodsScreen() {
  const cards = useCards()
  const upiHandles = useUpiHandles()
  const deleteCard = useDeleteCard()
  const deleteUpi = useDeleteUpiHandle()

  const [showAddCard, setShowAddCard] = useState(false)
  const [showAddUpi, setShowAddUpi] = useState(false)

  const isRefreshing = cards.isRefetching || upiHandles.isRefetching
  const isLoading = (cards.isLoading || upiHandles.isLoading) && !isRefreshing

  const confirmDeleteCard = (card: CardDTO) =>
    Alert.alert("Remove card", `Remove ${card.cardName} ····${card.lastFourDigits}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteCard.mutate(card.id) },
    ])

  const confirmDeleteUpi = (u: UpiHandleDTO) =>
    Alert.alert("Remove UPI", `Remove "${u.name}" (${u.handle})?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteUpi.mutate(u.id) },
    ])

  const onRefresh = () => {
    cards.refetch()
    upiHandles.refetch()
  }

  if (isLoading) return <ActivityIndicator className="mt-10" color="#4f46e5" />

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4"
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* Cards section */}
      <SectionHeader title="Credit cards" onAdd={() => setShowAddCard(true)} />

      {(cards.data?.items ?? []).length === 0 ? (
        <EmptyState message="No cards yet. Tap + to add one." />
      ) : (
        (cards.data?.items ?? []).map((card) => (
          <CardRow key={card.id} card={card} onDelete={() => confirmDeleteCard(card)} />
        ))
      )}

      {/* UPI section */}
      <SectionHeader title="UPI handles" onAdd={() => setShowAddUpi(true)} />

      {(upiHandles.data?.items ?? []).length === 0 ? (
        <EmptyState message="No UPI handles yet. Tap + to add one." />
      ) : (
        (upiHandles.data?.items ?? []).map((u) => (
          <UpiRow key={u.id} upi={u} onDelete={() => confirmDeleteUpi(u)} />
        ))
      )}

      <AddCardModal visible={showAddCard} onClose={() => setShowAddCard(false)} />
      <AddUpiModal visible={showAddUpi} onClose={() => setShowAddUpi(false)} />
    </ScrollView>
  )
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <View className="mb-2 mt-5 flex-row items-center justify-between">
      <Text className="text-base font-semibold text-gray-700">{title}</Text>
      <TouchableOpacity
        onPress={onAdd}
        className="flex-row items-center gap-1 rounded-full border border-brand px-3 py-1"
      >
        <Ionicons name="add" size={16} color="#4f46e5" />
        <Text className="text-sm font-medium text-brand">Add</Text>
      </TouchableOpacity>
    </View>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <View className="mb-2 items-center rounded-xl bg-white px-4 py-6">
      <Text className="text-sm text-gray-400">{message}</Text>
    </View>
  )
}

function CardRow({ card, onDelete }: { card: CardDTO; onDelete: () => void }) {
  const available = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(card.availableCredit)

  return (
    <TouchableOpacity
      onLongPress={onDelete}
      className="mb-2 rounded-xl bg-white p-4"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{card.cardName}</Text>
          <Text className="mt-0.5 text-sm text-gray-500">{card.bankName} · ····{card.lastFourDigits}</Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-gray-400">Available</Text>
          <Text className="text-sm font-semibold text-green-600">{available}</Text>
        </View>
      </View>
      <View className="mt-2 flex-row gap-4">
        <InfoChip label={`Billing: ${card.billingDate}`} />
        <InfoChip label={`Due: ${card.dueDate}`} />
      </View>
      <Text className="mt-2 text-xs text-gray-400">Long-press to remove</Text>
    </TouchableOpacity>
  )
}

function UpiRow({ upi, onDelete }: { upi: UpiHandleDTO; onDelete: () => void }) {
  return (
    <TouchableOpacity
      onLongPress={onDelete}
      className="mb-2 flex-row items-center justify-between rounded-xl bg-white p-4"
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-gray-900">{upi.name}</Text>
          {upi.isDefault && (
            <View className="rounded-full bg-indigo-100 px-2 py-0.5">
              <Text className="text-xs font-medium text-indigo-700">Default</Text>
            </View>
          )}
        </View>
        <Text className="mt-0.5 text-sm text-gray-500">{upi.handle}</Text>
      </View>
      <Text className="text-xs text-gray-400">Hold to remove</Text>
    </TouchableOpacity>
  )
}

function InfoChip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-gray-100 px-3 py-1">
      <Text className="text-xs text-gray-600">{label}</Text>
    </View>
  )
}
