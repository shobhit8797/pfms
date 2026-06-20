import { Redirect } from "expo-router"
import { ActivityIndicator, View } from "react-native"
import { useAuth } from "../lib/auth"
import { useThemeColors } from "../lib/theme"

/** Entry gate: wait for the stored token to load, then route accordingly. */
export default function Index() {
  const { loading, user } = useAuth()
  const c = useThemeColors()
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    )
  }
  return <Redirect href={user ? "/(tabs)" : "/login"} />
}
