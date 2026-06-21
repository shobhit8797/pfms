import { useState } from "react"
import { ActivityIndicator, Alert, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import {
  ApiError,
  INCOME_TYPES,
  INCOME_TYPE_LABELS,
  FREQUENCIES,
  FREQUENCY_LABELS,
  incomeCreateSchema,
  type Frequency,
  type IncomeDTO,
  type IncomeType,
} from "@pfms/shared"
import { useAccounts, useCreateIncome, useUpdateIncome } from "../lib/hooks"
import { useAuth } from "../lib/auth"
import { useThemeColors } from "../lib/theme"
import { todayISO } from "../lib/format"
import { captureReceiptPhoto, pickReceiptDocument, pickReceiptImage, type PickedReceipt } from "../lib/receipt"
import { cacheReceiptLocally, uploadReceipt } from "../lib/receipt-store"
import { Chips } from "./Chips"

/** Add or edit an income entry. Pass `income` to edit; omit to create. */
export function AddIncomeModal({
  visible,
  onClose,
  income,
}: {
  visible: boolean
  onClose: () => void
  income?: IncomeDTO
}) {
  const create = useCreateIncome()
  const update = useUpdateIncome()
  const accounts = useAccounts()
  const c = useThemeColors()
  const { getToken } = useAuth()
  const editing = !!income

  const [source, setSource] = useState(income?.source ?? "")
  const [amount, setAmount] = useState(income ? String(income.amount) : "")
  const [category, setCategory] = useState(income?.category ?? "")
  const [incomeDate, setIncomeDate] = useState(income ? income.incomeDate.slice(0, 10) : todayISO())
  const [type, setType] = useState<IncomeType>(income?.type ?? "SALARY")
  const [bankAccountId, setBankAccountId] = useState<string | null>(income?.bankAccountId ?? null)
  const [isRecurring, setIsRecurring] = useState(income?.isRecurring ?? false)
  const [frequency, setFrequency] = useState<Frequency>(income?.frequency ?? "MONTHLY")
  // Existing receipt (edit) shown as already-attached; a freshly picked one replaces it.
  const [existingReceipt, setExistingReceipt] = useState<{ url: string; name: string } | null>(
    income?.receiptUrl ? { url: income.receiptUrl, name: income.receiptName ?? "Attachment" } : null
  )
  const [attachment, setAttachment] = useState<PickedReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const reset = () => {
    setSource(""); setAmount(""); setCategory(""); setIncomeDate(todayISO())
    setType("SALARY"); setBankAccountId(null); setIsRecurring(false); setFrequency("MONTHLY")
    setExistingReceipt(null); setAttachment(null); setError(null); setUploading(false)
  }

  const onAttach = async (kind: "camera" | "gallery" | "file") => {
    try {
      const picked =
        kind === "camera" ? await captureReceiptPhoto()
        : kind === "gallery" ? await pickReceiptImage()
        : await pickReceiptDocument()
      if (picked) { setAttachment(picked); setExistingReceipt(null) }
    } catch (e) {
      Alert.alert("Couldn't attach file", e instanceof Error ? e.message : "Please try again")
    }
  }

  const onSubmit = async () => {
    setError(null)

    // Upload a freshly picked file first so the row stores its URL.
    let receiptUrl: string | undefined = existingReceipt?.url
    let receiptName: string | undefined = existingReceipt?.name
    if (attachment) {
      const token = getToken()
      if (!token) { setError("Your session expired — sign in again"); return }
      try {
        setUploading(true)
        const up = await uploadReceipt({ uri: attachment.uri, mime: attachment.mime, name: attachment.name, token })
        receiptUrl = up.url
        receiptName = up.name
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not upload the file")
        return
      } finally {
        setUploading(false)
      }
    }

    const parsed = incomeCreateSchema.safeParse({
      source, amount, category, incomeDate, type,
      bankAccountId: bankAccountId ?? undefined,
      isRecurring,
      frequency: isRecurring ? frequency : undefined,
      receiptUrl, receiptName,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input")
      return
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: income!.id, input: parsed.data })
      } else {
        const created = await create.mutateAsync(parsed.data)
        if (attachment && created?.id) {
          await cacheReceiptLocally(created.id, attachment.uri, attachment.name, attachment.isPdf).catch(() => {})
        }
      }
      reset()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save income")
    }
  }

  const pending = create.isPending || update.isPending || uploading

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView className="flex-1 bg-background px-6 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-6 text-2xl font-bold text-foreground">{editing ? "Edit income" : "Add income"}</Text>

        <Field label="Source">
          <TextInput className={inputCls} placeholderTextColor={c.mutedForeground} placeholder="e.g. Acme Corp" value={source} onChangeText={setSource} />
        </Field>
        <Field label="Amount">
          <TextInput className={inputCls} placeholderTextColor={c.mutedForeground} keyboardType="decimal-pad" placeholder="0" value={amount} onChangeText={setAmount} />
        </Field>
        <Field label="Category">
          <TextInput className={inputCls} placeholderTextColor={c.mutedForeground} placeholder="e.g. Salary" value={category} onChangeText={setCategory} />
        </Field>
        <Field label="Date">
          <TextInput className={inputCls} placeholderTextColor={c.mutedForeground} placeholder="YYYY-MM-DD" autoCapitalize="none" value={incomeDate} onChangeText={setIncomeDate} />
        </Field>

        <Text className={labelCls}>Type</Text>
        <Chips
          options={INCOME_TYPES.map((t) => ({ value: t, label: INCOME_TYPE_LABELS[t] }))}
          value={type}
          onChange={setType}
        />

        <Text className={labelCls}>Deposit to account (optional)</Text>
        <Chips
          options={(accounts.data?.items ?? []).map((a) => ({ value: a.id, label: `${a.bankName} ${a.maskedNumber}` }))}
          value={bankAccountId}
          onChange={(id) => setBankAccountId((prev) => (prev === id ? null : id))}
        />

        {/* Recurring toggle — for income that arrives month on month. */}
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="flex-1 pr-3 text-sm font-medium text-foreground">Recurring income</Text>
          <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ true: c.primary, false: c.border }} thumbColor={c.card} />
        </View>
        {isRecurring && (
          <>
            <Text className={labelCls}>Frequency</Text>
            <Chips
              options={FREQUENCIES.map((f) => ({ value: f, label: FREQUENCY_LABELS[f] }))}
              value={frequency}
              onChange={setFrequency}
            />
          </>
        )}

        {/* Attach an invoice / pay slip (image or PDF). */}
        <Text className={labelCls}>Invoice / pay slip (optional)</Text>
        {attachment || existingReceipt ? (
          <View className="flex-row items-center justify-between rounded-lg bg-muted px-3 py-2">
            <View className="flex-1 flex-row items-center gap-2 pr-2">
              <Ionicons name="document-attach-outline" size={18} color={c.primary} />
              <Text className="flex-1 text-sm text-foreground" numberOfLines={1}>
                {attachment?.name ?? existingReceipt?.name}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setAttachment(null); setExistingReceipt(null) }}>
              <Ionicons name="close-circle" size={20} color={c.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-row gap-2">
            <AttachButton icon="camera-outline" label="Camera" onPress={() => onAttach("camera")} />
            <AttachButton icon="images-outline" label="Gallery" onPress={() => onAttach("gallery")} />
            <AttachButton icon="document-attach-outline" label="PDF" onPress={() => onAttach("file")} />
          </View>
        )}

        {error ? <Text className="mt-2 text-sm text-destructive">{error}</Text> : null}

        <View className="mb-10 mt-6 flex-row gap-3">
          <TouchableOpacity className="flex-1 items-center rounded-lg border border-border py-4" onPress={() => { reset(); onClose() }}>
            <Text className="font-semibold text-foreground">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 items-center rounded-lg bg-primary py-4" disabled={pending} onPress={onSubmit}>
            {pending ? <ActivityIndicator color={c.primaryForeground} /> : <Text className="font-semibold text-primary-foreground">Save</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  )
}

const inputCls = "rounded-lg border border-input bg-card px-4 py-3 text-base text-foreground"
const labelCls = "mb-1 mt-3 text-sm font-medium text-foreground"

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
  const c = useThemeColors()
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border border-border bg-muted py-3"
    >
      <Ionicons name={icon} size={18} color={c.primary} />
      <Text className="text-sm font-medium text-foreground">{label}</Text>
    </TouchableOpacity>
  )
}
