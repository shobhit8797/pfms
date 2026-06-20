import { Redirect } from "expo-router"
import { ActivityIndicator, View } from "react-native"
import { useAuth } from "../lib/auth"

/** Entry gate: wait for the stored token to load, then route accordingly. */
export default function Index() {
  const { loading, user } = useAuth()
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    )
  }
  return <Redirect href={user ? "/(tabs)" : "/login"} />
}
