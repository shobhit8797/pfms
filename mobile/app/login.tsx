import { useState } from "react"
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native"
import { router } from "expo-router"
import { ApiError } from "@pfms/shared"
import { useAuth } from "../lib/auth"
import { useThemeColors } from "../lib/theme"

export default function Login() {
  const { signIn } = useAuth()
  const c = useThemeColors()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async () => {
    setError(null)
    setBusy(true)
    try {
      await signIn(email.trim(), password)
      router.replace("/(tabs)")
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not sign in. Check your connection.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <Text className="mb-2 text-3xl font-bold text-foreground">PFMS</Text>
      <Text className="mb-8 text-base text-muted-foreground">Sign in to track your money</Text>

      <Text className="mb-1 text-sm font-medium text-foreground">Email</Text>
      <TextInput
        className="mb-4 rounded-lg border border-input bg-card px-4 py-3 text-base text-foreground"
        placeholderTextColor={c.mutedForeground}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
      />

      <Text className="mb-1 text-sm font-medium text-foreground">Password</Text>
      <TextInput
        className="mb-6 rounded-lg border border-input bg-card px-4 py-3 text-base text-foreground"
        placeholderTextColor={c.mutedForeground}
        secureTextEntry
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text className="mb-4 text-sm text-destructive">{error}</Text> : null}

      <TouchableOpacity
        className="items-center rounded-lg bg-primary py-4"
        disabled={busy}
        onPress={onSubmit}
      >
        {busy ? <ActivityIndicator color={c.primaryForeground} /> : <Text className="text-base font-semibold text-primary-foreground">Sign in</Text>}
      </TouchableOpacity>
    </View>
  )
}
