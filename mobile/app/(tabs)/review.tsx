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
import { useThemeColors } from "../../lib/theme"
import { ReviewCard } from "../../components/ReviewCard"

export default function ReviewScreen() {
  const { data, isLoading, refetch, isRefetching } = usePendingMessages()
  const c = useThemeColors()
  const items = data?.items ?? []
  const active = items[0]

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="p-4 pb-24"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.mutedForeground} />}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-sm text-muted-foreground">
            {items.length > 0 ? `${items.length} transaction${items.length > 1 ? "s" : ""} to review` : "Review captured transactions"}
          </Text>
          <Link href="/setup-capture" asChild>
            <TouchableOpacity className="flex-row items-center gap-1">
              <Ionicons name="settings-outline" size={16} color={c.primary} />
              <Text className="text-sm font-medium text-primary">Auto-capture</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {isLoading ? (
          <ActivityIndicator className="mt-16" color={c.primary} />
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
  const c = useThemeColors()
  return (
    <View className="mt-16 items-center px-6">
      <Ionicons name="checkmark-done-circle-outline" size={56} color={c.goldMuted} />
      <Text className="mt-4 text-center text-base font-medium text-foreground">You&apos;re all caught up</Text>
      <Text className="mt-1 text-center text-sm text-muted-foreground">
        Transactions captured from your connected Gmail and your bank SMS show up here to review.
        Connect Gmail and set up SMS auto-capture to get started.
      </Text>
      <Link href="/setup-capture" asChild>
        <TouchableOpacity className="mt-5 flex-row items-center gap-2 rounded-xl bg-primary px-5 py-3">
          <Ionicons name="flash-outline" size={18} color={c.primaryForeground} />
          <Text className="font-semibold text-primary-foreground">Set up auto-capture</Text>
        </TouchableOpacity>
      </Link>
    </View>
  )
}
