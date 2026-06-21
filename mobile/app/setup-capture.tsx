import { useCallback, useState } from "react"
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useFocusEffect } from "expo-router"
import { ApiError } from "@pfms/shared"
import { useBackfillGmail, useConnectGoogle, useDisconnectGoogle, useGmailStatus, useIssueToken, useSyncGmail } from "../lib/hooks"
import { useThemeColors } from "../lib/theme"
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
  const c = useThemeColors()
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
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-16">
      <Text className="text-2xl font-bold text-foreground">Auto-capture transactions</Text>
      <Text className="mt-1 text-sm leading-5 text-muted-foreground">
        Connect Gmail to read transaction emails automatically, and set up an SMS shortcut for
        bank texts. Captured transactions appear on the Review tab.
      </Text>

      <GmailSection />

      <Text className="mt-7 text-lg font-semibold text-foreground">Bank SMS (optional)</Text>
      <Text className="mt-1 text-sm leading-5 text-muted-foreground">
        iOS can&apos;t read your Messages, but the Shortcuts app can forward a bank SMS here when it
        arrives. Set it up once.
      </Text>

      {/* Step 1: token */}
      <Section n={1} title="Generate your secret token">
        <Text className="text-sm leading-5 text-muted-foreground">
          This authorizes the shortcut to add transactions to your account. Keep it private.
        </Text>
        {token ? (
          <View className="mt-3">
            <Text className="mb-1 text-xs font-medium text-muted-foreground">Your token (long-press to copy)</Text>
            <TextInput
              className="rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-xs text-foreground"
              value={token}
              editable={false}
              selectTextOnFocus
              multiline
            />
            <Text className="mt-1 text-xs text-gold">Shown once — copy it now before leaving this screen.</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={generate}
            disabled={issue.isPending}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
          >
            {issue.isPending ? <ActivityIndicator color={c.primaryForeground} /> : (
              <>
                <Ionicons name="key-outline" size={18} color={c.primaryForeground} />
                <Text className="font-semibold text-primary-foreground">Generate token</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {error ? <Text className="mt-2 text-sm text-destructive">{error}</Text> : null}
      </Section>

      {/* Step 2: endpoint */}
      <Section n={2} title="Copy the endpoint">
        <CopyField label="Request URL" value={ENDPOINT} />
        <Text className="mt-2 text-xs text-muted-foreground">Method: POST · Header: Authorization = Bearer &lt;your token&gt; · Content-Type: application/json</Text>
        <Text className="mt-2 text-xs font-medium text-muted-foreground">Request body (JSON)</Text>
        <TextInput
          className="mt-1 rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-xs text-foreground"
          value={'{\n  "text": "[Shortcut Input]",\n  "source": "IOS_SHORTCUT"\n}'}
          editable={false}
          selectTextOnFocus
          multiline
        />
        <Text className="mt-1 text-xs text-muted-foreground">
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

      <View className="mt-5 rounded-xl border border-primary/30 bg-secondary p-4">
        <Text className="text-xs leading-5 text-secondary-foreground">
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
  const c = useThemeColors()
  const connect = useConnectGoogle()
  const disconnect = useDisconnectGoogle()
  const sync = useSyncGmail()
  const backfill = useBackfillGmail()

  // Re-check status whenever the screen regains focus (e.g. after returning
  // from the Google consent browser flow).
  useFocusEffect(useCallback(() => { status.refetch() }, [status]))

  const onSync = async () => {
    try {
      const res = await sync.mutateAsync()
      Alert.alert(
        "Sync complete",
        res.queued > 0
          ? `Found ${res.queued} new transaction${res.queued === 1 ? "" : "s"} to review.`
          : res.fetched > 0
            ? "Checked your latest emails — nothing new to review."
            : "No new transaction emails since the last check."
      )
    } catch (e) {
      Alert.alert("Couldn't sync", e instanceof ApiError ? e.message : "Please try again")
    }
  }

  const onBackfill = async () => {
    try {
      const res = await backfill.mutateAsync()
      Alert.alert(
        "Import complete",
        (res.queued > 0
          ? `Imported ${res.queued} transaction${res.queued === 1 ? "" : "s"} from your Expenses label and Purchases.`
          : "Nothing new to import — your labeled and purchase emails are already captured.") +
          (res.truncated ? " There may be more — tap again to continue." : "")
      )
    } catch (e) {
      Alert.alert("Couldn't import", e instanceof ApiError ? e.message : "Please try again")
    }
  }

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
    <View className="mt-5 rounded-2xl border border-border bg-card p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons name="mail" size={18} color={c.primary} />
        <Text className="text-base font-semibold text-foreground">Gmail</Text>
        {connected && (
          <View className="ml-auto rounded-full bg-success/15 px-2.5 py-0.5">
            <Text className="text-xs font-semibold text-success">Connected</Text>
          </View>
        )}
      </View>

      {status.isLoading ? (
        <ActivityIndicator className="my-3" color={c.primary} />
      ) : connected && data.connected ? (
        <>
          <Text className="text-sm text-foreground">{data.email}</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {data.status === "CONNECTED"
              ? data.lastSyncedAt
                ? `Last checked ${formatDate(data.lastSyncedAt)}`
                : "Waiting for the first sync…"
              : data.status === "REVOKED"
                ? "Access expired — reconnect to resume."
                : "Sync error — try reconnecting."}
          </Text>
          <View className="mt-3 flex-row gap-2">
            {data.status === "CONNECTED" ? (
              <TouchableOpacity
                onPress={onSync}
                disabled={sync.isPending}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-2.5"
              >
                {sync.isPending ? <ActivityIndicator color={c.primaryForeground} /> : (
                  <>
                    <Ionicons name="refresh" size={16} color={c.primaryForeground} />
                    <Text className="text-sm font-semibold text-primary-foreground">Check now</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onConnect} disabled={connect.isPending} className="flex-1 items-center rounded-xl bg-primary py-2.5">
                <Text className="text-sm font-semibold text-primary-foreground">Reconnect</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onDisconnect} disabled={disconnect.isPending} className="flex-1 items-center rounded-xl border border-border py-2.5">
              <Text className="text-sm font-semibold text-foreground">Disconnect</Text>
            </TouchableOpacity>
          </View>

          {data.status === "CONNECTED" && (
            <>
              <TouchableOpacity
                onPress={onBackfill}
                disabled={backfill.isPending}
                className="mt-2 flex-row items-center justify-center gap-2 rounded-xl border border-primary/40 bg-secondary py-2.5"
              >
                {backfill.isPending ? <ActivityIndicator color={c.primary} /> : (
                  <>
                    <Ionicons name="download-outline" size={16} color={c.primary} />
                    <Text className="text-sm font-semibold text-primary">Import Expenses &amp; Purchases</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text className="mt-1.5 text-xs leading-4 text-muted-foreground">
                One-time import of emails in your Gmail “Expenses” label and the Purchases
                category, and keeps watching them going forward.
              </Text>
            </>
          )}
        </>
      ) : (
        <>
          <Text className="text-sm leading-5 text-muted-foreground">
            Read transaction emails (receipts, bank alerts) automatically. We only scan
            transaction-like mail, never your whole inbox.
          </Text>
          <TouchableOpacity
            onPress={onConnect}
            disabled={connect.isPending}
            className="mt-3 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
          >
            {connect.isPending ? <ActivityIndicator color={c.primaryForeground} /> : (
              <>
                <Ionicons name="logo-google" size={16} color={c.primaryForeground} />
                <Text className="font-semibold text-primary-foreground">Connect Gmail</Text>
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
    <View className="mt-5 rounded-2xl border border-border bg-card p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
          <Text className="text-xs font-bold text-primary-foreground">{n}</Text>
        </View>
        <Text className="text-base font-semibold text-foreground">{title}</Text>
      </View>
      {children}
    </View>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="mb-1 text-xs font-medium text-muted-foreground">{label}</Text>
      <TextInput
        className="rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-xs text-foreground"
        value={value}
        editable={false}
        selectTextOnFocus
      />
    </View>
  )
}

function Step({ text }: { text: string }) {
  const c = useThemeColors()
  return (
    <View className="mb-2 flex-row gap-2">
      <Ionicons name="ellipse" size={6} color={c.mutedForeground} style={{ marginTop: 6 }} />
      <Text className="flex-1 text-sm leading-5 text-muted-foreground">{text}</Text>
    </View>
  )
}
