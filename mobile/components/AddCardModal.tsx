import { useState } from "react"
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { ApiError, cardCreateSchema } from "@pfms/shared"
import { useCreateCard } from "../lib/hooks"
import { useThemeColors } from "../lib/theme"

export function AddCardModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const create = useCreateCard()
  const c = useThemeColors()

  const [cardName, setCardName] = useState("")
  const [bankName, setBankName] = useState("")
  const [lastFourDigits, setLastFourDigits] = useState("")
  const [creditLimit, setCreditLimit] = useState("")
  const [currentOutstanding, setCurrentOutstanding] = useState("0")
  const [billingDate, setBillingDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setCardName(""); setBankName(""); setLastFourDigits(""); setCreditLimit("")
    setCurrentOutstanding("0"); setBillingDate(""); setDueDate(""); setError(null)
  }

  const onSubmit = async () => {
    setError(null)
    const parsed = cardCreateSchema.safeParse({
      cardName, bankName, lastFourDigits, creditLimit, currentOutstanding, billingDate, dueDate,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input")
      return
    }
    try {
      await create.mutateAsync(parsed.data)
      reset()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save card")
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView className="flex-1 bg-background px-6 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-5 text-2xl font-bold text-foreground">Add card</Text>

        <Field label="Card name">
          <TextInput className={inputCls} placeholderTextColor={c.mutedForeground} placeholder="e.g. HDFC Regalia" value={cardName} onChangeText={setCardName} />
        </Field>
        <Field label="Bank name">
          <TextInput className={inputCls} placeholderTextColor={c.mutedForeground} placeholder="e.g. HDFC Bank" value={bankName} onChangeText={setBankName} />
        </Field>
        <Field label="Last 4 digits">
          <TextInput
            className={inputCls}
            placeholderTextColor={c.mutedForeground}
            placeholder="1234"
            keyboardType="number-pad"
            maxLength={4}
            value={lastFourDigits}
            onChangeText={setLastFourDigits}
          />
        </Field>
        <Field label="Credit limit (₹)">
          <TextInput className={inputCls} placeholderTextColor={c.mutedForeground} keyboardType="decimal-pad" placeholder="100000" value={creditLimit} onChangeText={setCreditLimit} />
        </Field>
        <Field label="Current outstanding (₹)">
          <TextInput className={inputCls} placeholderTextColor={c.mutedForeground} keyboardType="decimal-pad" placeholder="0" value={currentOutstanding} onChangeText={setCurrentOutstanding} />
        </Field>
        <Field label="Billing date (day of month)">
          <TextInput className={inputCls} placeholderTextColor={c.mutedForeground} keyboardType="number-pad" placeholder="1–31" maxLength={2} value={billingDate} onChangeText={setBillingDate} />
        </Field>
        <Field label="Due date (day of month)">
          <TextInput className={inputCls} placeholderTextColor={c.mutedForeground} keyboardType="number-pad" placeholder="1–31" maxLength={2} value={dueDate} onChangeText={setDueDate} />
        </Field>

        {error ? <Text className="mt-2 text-sm text-destructive">{error}</Text> : null}

        <View className="mb-10 mt-6 flex-row gap-3">
          <TouchableOpacity
            className="flex-1 items-center rounded-lg border border-border py-4"
            onPress={() => { reset(); onClose() }}
          >
            <Text className="font-semibold text-foreground">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 items-center rounded-lg bg-primary py-4"
            disabled={create.isPending}
            onPress={onSubmit}
          >
            {create.isPending
              ? <ActivityIndicator color={c.primaryForeground} />
              : <Text className="font-semibold text-primary-foreground">Save card</Text>
            }
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
