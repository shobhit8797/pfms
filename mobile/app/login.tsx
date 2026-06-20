import { useState } from "react"
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native"
import { router } from "expo-router"
import { ApiError } from "@pfms/shared"
import { useAuth } from "../lib/auth"

export default function Login() {
  const { signIn } = useAuth()
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
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="mb-2 text-3xl font-bold text-gray-900">PFMS</Text>
      <Text className="mb-8 text-base text-gray-500">Sign in to track your money</Text>

      <Text className="mb-1 text-sm font-medium text-gray-700">Email</Text>
      <TextInput
        className="mb-4 rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
      />

      <Text className="mb-1 text-sm font-medium text-gray-700">Password</Text>
      <TextInput
        className="mb-6 rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900"
        secureTextEntry
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text className="mb-4 text-sm text-red-600">{error}</Text> : null}

      <TouchableOpacity
        className="items-center rounded-lg bg-brand py-4"
        disabled={busy}
        onPress={onSubmit}
      >
        {busy ? <ActivityIndicator color="white" /> : <Text className="text-base font-semibold text-white">Sign in</Text>}
      </TouchableOpacity>
    </View>
  )
}
