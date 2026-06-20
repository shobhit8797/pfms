import { Ionicons } from "@expo/vector-icons"
import { Redirect, Tabs } from "expo-router"
import { useAuth } from "../../lib/auth"
import { usePendingMessages } from "../../lib/hooks"

export default function TabsLayout() {
  const { user, loading } = useAuth()
  const pending = usePendingMessages()
  const pendingCount = pending.data?.items.length ?? 0
  if (loading) return null
  if (!user) return <Redirect href="/login" />

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4f46e5",
        tabBarInactiveTintColor: "#9ca3af",
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="review"
        options={{
          title: "Review",
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "albums" : "albums-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "trending-down" : "trending-down-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: "Income",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "trending-up" : "trending-up-outline"} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="payment-methods"
        options={{
          title: "Payments",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "card" : "card-outline"} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}
