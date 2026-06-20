import { useState } from "react"
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  ApiError,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  expenseCreateSchema,
  type PaymentMethod,
} from "@pfms/shared"
import { useAccounts, useCards, useCreateExpense, useScanReceipt } from "../lib/hooks"
import { useAuth } from "../lib/auth"
import { todayISO } from "../lib/format"
import { captureReceiptPhoto, pickReceiptDocument, pickReceiptImage, type PickedReceipt } from "../lib/receipt"
import { cacheReceiptLocally, uploadReceipt } from "../lib/receipt-store"
import { Chips } from "./Chips"

export function AddExpenseModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const create = useCreateExpense()
  const scan = useScanReceipt()
  const accounts = useAccounts()
  const cards = useCards()
  const { getToken } = useAuth()

  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [expenseDate, setExpenseDate] = useState(todayISO())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")
  const [bankAccountId, setBankAccountId] = useState<string | null>(null)
  const [creditCardId, setCreditCardId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<PickedReceipt | null>(null)
  const [scannedNotice, setScannedNotice] = useState(false)
  const [keepReceipt, setKeepReceipt] = useState(true)
  const [uploading, setUploading] = useState(false)

  const reset = () => {
    setAmount(""); setDescription(""); setCategory(""); setExpenseDate(todayISO())
    setPaymentMethod("CASH"); setBankAccountId(null); setCreditCardId(null); setError(null)
    setAttachment(null); setScannedNotice(false); setKeepReceipt(true); setUploading(false)
  }

  // Pick a receipt, send it to the AI scan endpoint, and pre-fill the form.
  const runScan = async (picked: PickedReceipt | null) => {
    if (!picked) return
    setError(null)
    setScannedNotice(false)
    setAttachment(picked)
    setKeepReceipt(true)
    try {
      const f = await scan.mutateAsync(picked.dataUrl)
      if (f.amount != null) setAmount(String(f.amount))
      if (f.description) setDescription(f.description)
      else if (f.merchant) setDescription(f.merchant)
      if (f.category) setCategory(f.category)
      if (f.paymentMethod) {
        setPaymentMethod(f.paymentMethod)
        // Auto-select the only card/account when the scan detects the method.
        if (f.paymentMethod === "CREDIT_CARD") {
          const cardList = cards.data?.items ?? []
          setCreditCardId(cardList.length === 1 ? cardList[0].id : null)
          setBankAccountId(null)
        } else if (f.paymentMethod === "BANK_TRANSFER") {
          const accountList = accounts.data?.items ?? []
          setBankAccountId(accountList.length === 1 ? accountList[0].id : null)
          setCreditCardId(null)
        } else {
          setBankAccountId(null)
          setCreditCardId(null)
        }
      }
      if (f.expenseDate) setExpenseDate(f.expenseDate)
      setScannedNotice(true)
    } catch (e) {
      setAttachment(null)
      setError(e instanceof ApiError ? e.message : "Could not read the receipt. Enter the details manually.")
    }
  }

  const onAttach = async (kind: "camera" | "gallery" | "file") => {
    try {
      const picked =
        kind === "camera" ? await captureReceiptPhoto()
        : kind === "gallery" ? await pickReceiptImage()
        : await pickReceiptDocument()
      await runScan(picked)
    } catch (e) {
      Alert.alert("Couldn't attach receipt", e instanceof Error ? e.message : "Please try again")
    }
  }

  const onSubmit = async () => {
    setError(null)
    const willKeep = attachment != null && keepReceipt

    // Upload the receipt first (if the user chose to keep it) so the expense row
    // is created with its stored URL.
    let receiptUrl: string | undefined
    let receiptName: string | undefined
    if (willKeep) {
      const token = getToken()
      if (!token) { setError("Your session expired — sign in again"); return }
      try {
        setUploading(true)
        const up = await uploadReceipt({ uri: attachment!.uri, mime: attachment!.mime, name: attachment!.name, token })
        receiptUrl = up.url
        receiptName = up.name
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not upload the receipt")
        return
      } finally {
        setUploading(false)
      }
    }

    const parsed = expenseCreateSchema.safeParse({
      amount, description, category, expenseDate, paymentMethod,
      bankAccountId: bankAccountId ?? undefined,
      creditCardId: creditCardId ?? undefined,
      receiptUrl, receiptName,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input")
      return
    }
    try {
      const created = await create.mutateAsync(parsed.data)
      // Keep a local copy keyed by expense id for offline viewing (best-effort).
      if (willKeep && created?.id) {
        await cacheReceiptLocally(created.id, attachment!.uri, attachment!.name, attachment!.isPdf).catch(() => {})
      }
      reset()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save expense")
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView className="flex-1 bg-white px-6 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-4 text-2xl font-bold text-gray-900">Add expense</Text>

        {/* AI receipt scan — attach a photo/PDF and auto-fill the fields below. */}
        <View className="mb-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <View className="mb-3 flex-row items-center gap-2">
            <Ionicons name="sparkles" size={16} color="#4f46e5" />
            <Text className="text-sm font-semibold text-gray-800">Scan a receipt</Text>
          </View>

          {scan.isPending ? (
            <View className="flex-row items-center gap-2 py-1">
              <ActivityIndicator color="#4f46e5" />
              <Text className="text-sm text-gray-600">Reading receipt…</Text>
            </View>
          ) : attachment ? (
            <>
              <View className="flex-row items-center justify-between rounded-lg bg-white px-3 py-2">
                <View className="flex-1 flex-row items-center gap-2 pr-2">
                  <Ionicons name={attachment.isPdf ? "document-text-outline" : "image-outline"} size={18} color="#4f46e5" />
                  <Text className="flex-1 text-sm text-gray-700" numberOfLines={1}>{attachment.name}</Text>
                </View>
                <TouchableOpacity onPress={() => { setAttachment(null); setScannedNotice(false) }}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              {/* Voluntary: keep the file attached to the expense (else it's scan-only). */}
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="flex-1 pr-3 text-sm text-gray-700">Save receipt with this expense</Text>
                <Switch value={keepReceipt} onValueChange={setKeepReceipt} trackColor={{ true: "#4f46e5" }} />
              </View>
            </>
          ) : (
            <View className="flex-row gap-2">
              <AttachButton icon="camera-outline" label="Camera" onPress={() => onAttach("camera")} />
              <AttachButton icon="images-outline" label="Gallery" onPress={() => onAttach("gallery")} />
              <AttachButton icon="document-attach-outline" label="PDF" onPress={() => onAttach("file")} />
            </View>
          )}

          {scannedNotice ? (
            <Text className="mt-2 text-xs text-indigo-600">Filled from your receipt — please review before saving.</Text>
          ) : (
            !attachment && !scan.isPending && (
              <Text className="mt-2 text-xs text-gray-400">AI reads the amount, description, category, date & payment method.</Text>
            )
          )}
        </View>

        <Field label="Amount">
          <TextInput className={inputCls} keyboardType="decimal-pad" placeholder="0" value={amount} onChangeText={setAmount} />
        </Field>
        <Field label="Description">
          <TextInput className={inputCls} placeholder="e.g. Groceries" value={description} onChangeText={setDescription} />
        </Field>
        <Field label="Category">
          <TextInput className={inputCls} placeholder="e.g. Food" value={category} onChangeText={setCategory} />
        </Field>
        <Field label="Date">
          <TextInput className={inputCls} placeholder="YYYY-MM-DD" autoCapitalize="none" value={expenseDate} onChangeText={setExpenseDate} />
        </Field>

        <Text className={labelCls}>Payment method</Text>
        <Chips
          options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
          value={paymentMethod}
          onChange={(m) => { setPaymentMethod(m); setBankAccountId(null); setCreditCardId(null) }}
        />

        {paymentMethod === "BANK_TRANSFER" && (
          <>
            <Text className={labelCls}>Account</Text>
            <Chips
              options={(accounts.data?.items ?? []).map((a) => ({ value: a.id, label: `${a.bankName} ${a.maskedNumber}` }))}
              value={bankAccountId}
              onChange={setBankAccountId}
            />
          </>
        )}
        {paymentMethod === "CREDIT_CARD" && (
          <>
            <Text className={labelCls}>Card</Text>
            <Chips
              options={(cards.data?.items ?? []).map((c) => ({ value: c.id, label: `${c.cardName} ····${c.lastFourDigits}` }))}
              value={creditCardId}
              onChange={setCreditCardId}
            />
          </>
        )}

        {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}

        <View className="mb-10 mt-6 flex-row gap-3">
          <TouchableOpacity className="flex-1 items-center rounded-lg border border-gray-300 py-4" onPress={() => { reset(); onClose() }}>
            <Text className="font-semibold text-gray-700">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 items-center rounded-lg bg-brand py-4" disabled={create.isPending || uploading} onPress={onSubmit}>
            {create.isPending || uploading ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">Save</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  )
}

const inputCls = "rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900"
const labelCls = "mb-1 mt-3 text-sm font-medium text-gray-700"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-3">
      <Text className={labelCls}>{label}</Text>
      {children}
    </View>
  )
}

function AttachButton({
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
      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white py-3"
    >
      <Ionicons name={icon} size={18} color="#4f46e5" />
      <Text className="text-sm font-medium text-gray-700">{label}</Text>
    </TouchableOpacity>
  )
}
