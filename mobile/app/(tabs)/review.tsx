import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Link } from "expo-router"
import { usePendingMessages } from "../../lib/hooks"
import { ReviewCard } from "../../components/ReviewCard"

export default function ReviewScreen() {
  const { data, isLoading, refetch, isRefetching } = usePendingMessages()
  const items = data?.items ?? []
  const active = items[0]

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerClassName="p-4 pb-24"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-sm text-gray-500">
            {items.length > 0 ? `${items.length} transaction${items.length > 1 ? "s" : ""} to review` : "Review captured transactions"}
          </Text>
          <Link href="/setup-capture" asChild>
            <TouchableOpacity className="flex-row items-center gap-1">
              <Ionicons name="settings-outline" size={16} color="#4f46e5" />
              <Text className="text-sm font-medium text-brand">Auto-capture</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {isLoading ? (
          <ActivityIndicator className="mt-16" color="#4f46e5" />
        ) : active ? (
          // Keyed by id so each resolved card is replaced by a fresh next card.
          <ReviewCard key={active.id} message={active} onResolved={refetch} />
        ) : (
          <EmptyState />
        )}
      </ScrollView>
    </View>
  )
}

function EmptyState() {
  return (
    <View className="mt-16 items-center px-6">
      <Ionicons name="checkmark-done-circle-outline" size={56} color="#a5b4fc" />
      <Text className="mt-4 text-center text-base font-medium text-gray-700">You&apos;re all caught up</Text>
      <Text className="mt-1 text-center text-sm text-gray-500">
        Transactions captured from your connected Gmail and your bank SMS show up here to review.
        Connect Gmail and set up SMS auto-capture to get started.
      </Text>
      <Link href="/setup-capture" asChild>
        <TouchableOpacity className="mt-5 flex-row items-center gap-2 rounded-xl bg-brand px-5 py-3">
          <Ionicons name="flash-outline" size={18} color="white" />
          <Text className="font-semibold text-white">Set up auto-capture</Text>
        </TouchableOpacity>
      </Link>
    </View>
  )
}
