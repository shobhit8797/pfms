import { useCallback, useState } from "react"
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "expo-router"
import { ApiError } from "@pfms/shared"
import { useConnectGoogle, useDisconnectGoogle, useGmailStatus, useIssueToken } from "../lib/hooks"
import { API_BASE_URL } from "../lib/config"
import { formatDate } from "../lib/format"

const ENDPOINT = `${API_BASE_URL}/api/v1/messages`

/**
 * Auto-capture hub. Primary path: connect Gmail so transaction emails are read
 * automatically. Secondary path: an iOS Shortcuts "Message" automation for bank
 * SMS (iOS can't read the Messages inbox, so capture is push-based).
 */
export default function SetupCaptureScreen() {
  const issue = useIssueToken()
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setError(null)
    try {
      const res = await issue.mutateAsync("iOS auto-capture shortcut")
      setToken(res.token)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not generate a token")
    }
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-5 pb-16">
      <Text className="text-2xl font-bold text-gray-900">Auto-capture transactions</Text>
      <Text className="mt-1 text-sm leading-5 text-gray-600">
        Connect Gmail to read transaction emails automatically, and set up an SMS shortcut for
        bank texts. Captured transactions appear on the Review tab.
      </Text>

      <GmailSection />

      <Text className="mt-7 text-lg font-semibold text-gray-900">Bank SMS (optional)</Text>
      <Text className="mt-1 text-sm leading-5 text-gray-600">
        iOS can&apos;t read your Messages, but the Shortcuts app can forward a bank SMS here when it
        arrives. Set it up once.
      </Text>

      {/* Step 1: token */}
      <Section n={1} title="Generate your secret token">
        <Text className="text-sm leading-5 text-gray-600">
          This authorizes the shortcut to add transactions to your account. Keep it private.
        </Text>
        {token ? (
          <View className="mt-3">
            <Text className="mb-1 text-xs font-medium text-gray-500">Your token (long-press to copy)</Text>
            <TextInput
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-xs text-gray-900"
              value={token}
              editable={false}
              selectTextOnFocus
              multiline
            />
            <Text className="mt-1 text-xs text-amber-600">Shown once — copy it now before leaving this screen.</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={generate}
            disabled={issue.isPending}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-brand py-3"
          >
            {issue.isPending ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="key-outline" size={18} color="white" />
                <Text className="font-semibold text-white">Generate token</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}
      </Section>

      {/* Step 2: endpoint */}
      <Section n={2} title="Copy the endpoint">
        <CopyField label="Request URL" value={ENDPOINT} />
        <Text className="mt-2 text-xs text-gray-500">Method: POST · Header: Authorization = Bearer &lt;your token&gt; · Content-Type: application/json</Text>
        <Text className="mt-2 text-xs font-medium text-gray-500">Request body (JSON)</Text>
        <TextInput
          className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-xs text-gray-900"
          value={'{\n  "text": "[Shortcut Input]",\n  "source": "IOS_SHORTCUT"\n}'}
          editable={false}
          selectTextOnFocus
          multiline
        />
        <Text className="mt-1 text-xs text-gray-500">
          Replace <Text className="font-mono">[Shortcut Input]</Text> with the &quot;Shortcut Input&quot; magic variable in the Shortcuts editor.
        </Text>
      </Section>

      {/* Step 3: build the automation */}
      <Section n={3} title="Build the automation in Shortcuts">
        <Step text="Open the Shortcuts app → Automation tab → + → Create Personal Automation." />
        <Step text="Choose 'Message'. Set 'Message Contains' to keywords like debited, credited, spent, txn (or pick your bank's sender)." />
        <Step text="Turn on 'Run Immediately' so it fires without tapping (iOS 16+)." />
        <Step text="Add action 'Get Contents of URL'. Set it to POST to the URL above." />
        <Step text="Under Headers, add Authorization = 'Bearer <your token>' and Content-Type = 'application/json'." />
        <Step text="Set Request Body to JSON with a 'text' key whose value is the 'Shortcut Input' variable, and 'source' = 'IOS_SHORTCUT'." />
        <Step text="Save. New bank SMS now appear in Review automatically." />
      </Section>

      <View className="mt-5 rounded-xl bg-indigo-50 p-4">
        <Text className="text-xs leading-5 text-indigo-700">
          No shortcut yet? You can still capture any message by tapping the clipboard button on the Review tab and
          pasting it.
        </Text>
      </View>
    </ScrollView>
  )
}

/**
 * Connect / manage the Gmail link. Opens Google consent in the system browser;
 * the backend stores the tokens and bounces back to the app, where we refresh
 * the status on focus.
 */
function GmailSection() {
  const status = useGmailStatus()
  const connect = useConnectGoogle()
  const disconnect = useDisconnectGoogle()

  // Re-check status whenever the screen regains focus (e.g. after returning
  // from the Google consent browser flow).
  useFocusEffect(useCallback(() => { status.refetch() }, [status]))

  const onConnect = async () => {
    try {
      const { url } = await connect.mutateAsync()
      await Linking.openURL(url)
    } catch (e) {
      Alert.alert("Couldn't start Google sign-in", e instanceof ApiError ? e.message : "Please try again")
    }
  }

  const onDisconnect = () =>
    Alert.alert("Disconnect Gmail", "Stop reading transaction emails from this account?", [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: () => disconnect.mutate() },
    ])

  const data = status.data
  const connected = data?.connected === true

  return (
    <View className="mt-5 rounded-2xl bg-white p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name="mail" size={18} color="#4f46e5" />
        <Text className="text-base font-semibold text-gray-900">Gmail</Text>
        {connected && (
          <View className="ml-auto rounded-full bg-green-100 px-2.5 py-0.5">
            <Text className="text-xs font-semibold text-green-700">Connected</Text>
          </View>
        )}
      </View>

      {status.isLoading ? (
        <ActivityIndicator className="my-3" color="#4f46e5" />
      ) : connected && data.connected ? (
        <>
          <Text className="text-sm text-gray-700">{data.email}</Text>
          <Text className="mt-0.5 text-xs text-gray-500">
            {data.status === "CONNECTED"
              ? data.lastSyncedAt
                ? `Last checked ${formatDate(data.lastSyncedAt)}`
                : "Waiting for the first sync…"
              : data.status === "REVOKED"
                ? "Access expired — reconnect to resume."
                : "Sync error — try reconnecting."}
          </Text>
          <View className="mt-3 flex-row gap-2">
            {data.status !== "CONNECTED" && (
              <TouchableOpacity onPress={onConnect} disabled={connect.isPending} className="flex-1 items-center rounded-xl bg-brand py-2.5">
                <Text className="text-sm font-semibold text-white">Reconnect</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onDisconnect} disabled={disconnect.isPending} className="flex-1 items-center rounded-xl border border-gray-300 py-2.5">
              <Text className="text-sm font-semibold text-gray-700">Disconnect</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <Text className="text-sm leading-5 text-gray-600">
            Read transaction emails (receipts, bank alerts) automatically. We only scan
            transaction-like mail, never your whole inbox.
          </Text>
          <TouchableOpacity
            onPress={onConnect}
            disabled={connect.isPending}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-brand py-3"
          >
            {connect.isPending ? <ActivityIndicator color="white" /> : (
              <>
                <Ionicons name="logo-google" size={16} color="white" />
                <Text className="font-semibold text-white">Connect Gmail</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <View className="mt-5 rounded-2xl bg-white p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <View className="h-6 w-6 items-center justify-center rounded-full bg-brand">
          <Text className="text-xs font-bold text-white">{n}</Text>
        </View>
        <Text className="text-base font-semibold text-gray-900">{title}</Text>
      </View>
      {children}
    </View>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="mb-1 text-xs font-medium text-gray-500">{label}</Text>
      <TextInput
        className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-xs text-gray-900"
        value={value}
        editable={false}
        selectTextOnFocus
      />
    </View>
  )
}

function Step({ text }: { text: string }) {
  return (
    <View className="mb-2 flex-row gap-2">
      <Ionicons name="ellipse" size={6} color="#9ca3af" style={{ marginTop: 6 }} />
      <Text className="flex-1 text-sm leading-5 text-gray-600">{text}</Text>
    </View>
  )
}
