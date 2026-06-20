import { useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Animated,
  PanResponder,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  ApiError,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  expenseCreateSchema,
  type InboundMessageDTO,
  type PaymentMethod,
} from "@pfms/shared"
import { useAccounts, useCards, useResolveMessage } from "../lib/hooks"
import { useAuth } from "../lib/auth"
import { formatDate, formatINR } from "../lib/format"
import { captureReceiptPhoto, pickReceiptDocument, pickReceiptImage, type PickedReceipt } from "../lib/receipt"
import { cacheReceiptLocally, uploadReceipt } from "../lib/receipt-store"
import { Chips } from "./Chips"

const SWIPE_THRESHOLD = 120

/**
 * One pending captured transaction. Review the parsed amount/merchant/date,
 * tweak the category & payment method (category is pre-filled from what you've
 * taught the app for this merchant), optionally attach a receipt, then either
 * swipe right / tap Save to log it as an expense, or swipe left / tap Dismiss
 * to clear it. Saving teaches the app this merchant's category; declining a
 * receipt teaches it to stop asking for that merchant.
 */
export function ReviewCard({
  message,
  onResolved,
}: {
  message: InboundMessageDTO
  onResolved: () => void
}) {
  const resolve = useResolveMessage()
  const accounts = useAccounts()
  const cards = useCards()
  const { getToken } = useAuth()

  const [category, setCategory] = useState(message.suggestedCategory ?? "")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(message.parsedPaymentMethod ?? "OTHER")
  const [bankAccountId, setBankAccountId] = useState<string | null>(null)
  const [creditCardId, setCreditCardId] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<PickedReceipt | null>(null)
  const [receiptDeclined, setReceiptDeclined] = useState(false)
  const [busy, setBusy] = useState(false)

  const pan = useRef(new Animated.ValueXY()).current
  const isCredit = message.parsedDirection === "CREDIT"

  // --- Receipt attaching -------------------------------------------------
  const onAttach = async (kind: "camera" | "gallery" | "file") => {
    try {
      const picked =
        kind === "camera" ? await captureReceiptPhoto()
        : kind === "gallery" ? await pickReceiptImage()
        : await pickReceiptDocument()
      if (picked) {
        setAttachment(picked)
        setReceiptDeclined(false)
      }
    } catch (e) {
      Alert.alert("Couldn't attach receipt", e instanceof Error ? e.message : "Please try again")
    }
  }

  // --- Save / dismiss ----------------------------------------------------
  const doSave = async () => {
    if (busy) return
    if (message.parsedAmount == null) {
      Alert.alert("Amount missing", "We couldn't read an amount from this message. Edit it on the web app, or dismiss it.")
      resetPosition()
      return
    }
    setBusy(true)
    try {
      // Upload the receipt first (if attached) so the expense stores its URL.
      let receiptUrl: string | undefined
      let receiptName: string | undefined
      if (attachment) {
        const token = getToken()
        if (!token) throw new Error("Your session expired — sign in again")
        const up = await uploadReceipt({ uri: attachment.uri, mime: attachment.mime, name: attachment.name, token })
        receiptUrl = up.url
        receiptName = up.name
      }

      const expense = {
        amount: message.parsedAmount,
        description: message.parsedMerchant ?? "Expense",
        category: category.trim() || "Other",
        expenseDate: message.parsedDate ?? message.receivedAt,
        paymentMethod,
        bankAccountId: bankAccountId ?? undefined,
        creditCardId: creditCardId ?? undefined,
        receiptUrl,
        receiptName,
        notes: `Captured from message${message.sender ? ` (${message.sender})` : ""}: ${message.rawText}`,
      }
      const parsed = expenseCreateSchema.safeParse(expense)
      if (!parsed.success) {
        Alert.alert("Check the details", parsed.error.issues[0]?.message ?? "Invalid input")
        setBusy(false)
        resetPosition()
        return
      }

      const res = await resolve.mutateAsync({
        id: message.id,
        input: { action: "save", kind: "expense", expense: parsed.data, receiptDeclined },
      })
      // Cache the receipt on-device keyed by the created expense (best-effort).
      if (attachment && res.expense?.id) {
        await cacheReceiptLocally(res.expense.id, attachment.uri, attachment.name, attachment.isPdf).catch(() => {})
      }
      onResolved()
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Please try again")
      setBusy(false)
      resetPosition()
    }
  }

  const doDismiss = async () => {
    if (busy) return
    setBusy(true)
    try {
      await resolve.mutateAsync({ id: message.id, input: { action: "dismiss", receiptDeclined } })
      onResolved()
    } catch (e) {
      Alert.alert("Couldn't dismiss", e instanceof Error ? e.message : "Please try again")
      setBusy(false)
      resetPosition()
    }
  }

  const resetPosition = () => Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()

  const flyOut = (direction: 1 | -1, after: () => void) => {
    Animated.timing(pan, {
      toValue: { x: direction * 600, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(after)
  }

  // Horizontal swipe: right = save, left = dismiss. Only claims the gesture for
  // clearly-horizontal drags so taps/scroll/inputs keep working.
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_e, g) => {
        if (g.dx > SWIPE_THRESHOLD) flyOut(1, doSave)
        else if (g.dx < -SWIPE_THRESHOLD) flyOut(-1, doDismiss)
        else resetPosition()
      },
    })
  ).current

  const rotate = pan.x.interpolate({ inputRange: [-300, 0, 300], outputRange: ["-8deg", "0deg", "8deg"] })
  const saveHintOpacity = pan.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: "clamp" })
  const dismissHintOpacity = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: "clamp" })

  const accountList = accounts.data?.items ?? []
  const cardList = cards.data?.items ?? []

  return (
    <Animated.View
      {...responder.panHandlers}
      style={{ transform: [{ translateX: pan.x }, { rotate }] }}
      className="rounded-3xl border border-gray-200 bg-white p-5 shadow-lg"
    >
      {/* Swipe hints */}
      <Animated.View style={{ opacity: saveHintOpacity }} className="absolute left-4 top-4 z-10 rounded-lg border-2 border-green-500 px-2 py-0.5">
        <Text className="text-xs font-bold text-green-600">SAVE</Text>
      </Animated.View>
      <Animated.View style={{ opacity: dismissHintOpacity }} className="absolute right-4 top-4 z-10 rounded-lg border-2 border-red-400 px-2 py-0.5">
        <Text className="text-xs font-bold text-red-500">DISMISS</Text>
      </Animated.View>

      {/* Header: amount + direction */}
      <View className="mb-1 flex-row items-center justify-between">
        <Text className={`text-3xl font-bold ${isCredit ? "text-green-600" : "text-gray-900"}`}>
          {message.parsedAmount != null ? formatINR(message.parsedAmount) : "—"}
        </Text>
        <View className={`rounded-full px-2.5 py-1 ${isCredit ? "bg-green-100" : "bg-red-100"}`}>
          <Text className={`text-xs font-semibold ${isCredit ? "text-green-700" : "text-red-600"}`}>
            {isCredit ? "Credit" : "Debit"}
          </Text>
        </View>
      </View>
      <Text className="text-base font-medium text-gray-800" numberOfLines={1}>
        {message.parsedMerchant ?? "Unknown merchant"}
      </Text>
      <Text className="mb-3 text-xs text-gray-500">
        {formatDate(message.parsedDate ?? message.receivedAt)}
        {message.parsedAccountHint ? ` · ${message.parsedAccountHint}` : ""}
        {message.sender ? ` · ${message.sender}` : ""}
      </Text>

      {/* Raw message for context */}
      <View className="mb-4 rounded-xl bg-gray-50 p-3">
        <Text className="text-xs leading-4 text-gray-500" numberOfLines={3}>{message.rawText}</Text>
      </View>

      {isCredit && (
        <Text className="mb-3 text-xs text-amber-600">
          This looks like money received. Saving will log it as an expense — dismiss it if that&apos;s wrong (income capture is on the web app).
        </Text>
      )}

      {/* Category (pre-filled from what you taught the app for this merchant) */}
      <Text className="mb-1 text-sm font-medium text-gray-700">Category</Text>
      <TextInput
        className="mb-3 rounded-lg border border-gray-300 px-4 py-2.5 text-base text-gray-900"
        placeholder="e.g. Food, Groceries"
        value={category}
        onChangeText={setCategory}
      />

      <Text className="mb-1 text-sm font-medium text-gray-700">Payment method</Text>
      <Chips
        options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
        value={paymentMethod}
        onChange={(m) => { setPaymentMethod(m as PaymentMethod); setBankAccountId(null); setCreditCardId(null) }}
      />

      {paymentMethod === "BANK_TRANSFER" && accountList.length > 0 && (
        <>
          <Text className="mb-1 mt-2 text-sm font-medium text-gray-700">Account</Text>
          <Chips
            options={accountList.map((a) => ({ value: a.id, label: `${a.bankName} ${a.maskedNumber}` }))}
            value={bankAccountId}
            onChange={setBankAccountId}
          />
        </>
      )}
      {paymentMethod === "CREDIT_CARD" && cardList.length > 0 && (
        <>
          <Text className="mb-1 mt-2 text-sm font-medium text-gray-700">Card</Text>
          <Chips
            options={cardList.map((c) => ({ value: c.id, label: `${c.cardName} ····${c.lastFourDigits}` }))}
            value={creditCardId}
            onChange={setCreditCardId}
          />
        </>
      )}

      {/* Receipt prompt — hidden for merchants you've opted out of. */}
      {message.askReceipt ? (
        attachment ? (
          <View className="mt-3 flex-row items-center justify-between rounded-lg bg-indigo-50 px-3 py-2">
            <View className="flex-1 flex-row items-center gap-2 pr-2">
              <Ionicons name={attachment.isPdf ? "document-text-outline" : "image-outline"} size={18} color="#4f46e5" />
              <Text className="flex-1 text-sm text-indigo-700" numberOfLines={1}>{attachment.name}</Text>
            </View>
            <TouchableOpacity onPress={() => setAttachment(null)}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mt-3">
            <Text className="mb-1.5 text-sm font-medium text-gray-700">Add a receipt?</Text>
            <View className="flex-row gap-2">
              <ReceiptBtn icon="camera-outline" label="Camera" onPress={() => onAttach("camera")} />
              <ReceiptBtn icon="images-outline" label="Gallery" onPress={() => onAttach("gallery")} />
              <ReceiptBtn icon="document-attach-outline" label="PDF" onPress={() => onAttach("file")} />
            </View>
            <TouchableOpacity
              className="mt-2 flex-row items-center gap-1.5"
              onPress={() => setReceiptDeclined((v) => !v)}
            >
              <Ionicons name={receiptDeclined ? "checkbox" : "square-outline"} size={18} color={receiptDeclined ? "#4f46e5" : "#9ca3af"} />
              <Text className="text-xs text-gray-600">Don&apos;t ask for receipts from this merchant again</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <Text className="mt-3 text-xs text-gray-400">Receipts are off for this merchant.</Text>
      )}

      {/* Actions */}
      <View className="mt-5 flex-row gap-3">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-gray-300 py-3.5"
          disabled={busy}
          onPress={doDismiss}
        >
          <Ionicons name="close" size={18} color="#6b7280" />
          <Text className="font-semibold text-gray-600">Dismiss</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-brand py-3.5"
          disabled={busy}
          onPress={doSave}
        >
          {busy ? <ActivityIndicator color="white" /> : (
            <>
              <Ionicons name="checkmark" size={18} color="white" />
              <Text className="font-semibold text-white">Save expense</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

function ReceiptBtn({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"]
  label: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white py-2.5"
    >
      <Ionicons name={icon} size={16} color="#4f46e5" />
      <Text className="text-xs font-medium text-gray-700">{label}</Text>
    </TouchableOpacity>
  )
}
