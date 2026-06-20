import { useState } from "react"
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import {
  ApiError,
  INCOME_TYPES,
  INCOME_TYPE_LABELS,
  incomeCreateSchema,
  type IncomeType,
} from "@pfms/shared"
import { useAccounts, useCreateIncome } from "../lib/hooks"
import { todayISO } from "../lib/format"
import { Chips } from "./Chips"

export function AddIncomeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const create = useCreateIncome()
  const accounts = useAccounts()

  const [source, setSource] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [incomeDate, setIncomeDate] = useState(todayISO())
  const [type, setType] = useState<IncomeType>("SALARY")
  const [bankAccountId, setBankAccountId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setSource(""); setAmount(""); setCategory(""); setIncomeDate(todayISO())
    setType("SALARY"); setBankAccountId(null); setError(null)
  }

  const onSubmit = async () => {
    setError(null)
    const parsed = incomeCreateSchema.safeParse({
      source, amount, category, incomeDate, type,
      bankAccountId: bankAccountId ?? undefined,
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
      setError(e instanceof ApiError ? e.message : "Could not save income")
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView className="flex-1 bg-white px-6 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-6 text-2xl font-bold text-gray-900">Add income</Text>

        <Field label="Source">
          <TextInput className={inputCls} placeholder="e.g. Acme Corp" value={source} onChangeText={setSource} />
        </Field>
        <Field label="Amount">
          <TextInput className={inputCls} keyboardType="decimal-pad" placeholder="0" value={amount} onChangeText={setAmount} />
        </Field>
        <Field label="Category">
          <TextInput className={inputCls} placeholder="e.g. Salary" value={category} onChangeText={setCategory} />
        </Field>
        <Field label="Date">
          <TextInput className={inputCls} placeholder="YYYY-MM-DD" autoCapitalize="none" value={incomeDate} onChangeText={setIncomeDate} />
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

        {error ? <Text className="mt-2 text-sm text-red-600">{error}</Text> : null}

        <View className="mb-10 mt-6 flex-row gap-3">
          <TouchableOpacity className="flex-1 items-center rounded-lg border border-gray-300 py-4" onPress={() => { reset(); onClose() }}>
            <Text className="font-semibold text-gray-700">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 items-center rounded-lg bg-brand py-4" disabled={create.isPending} onPress={onSubmit}>
            {create.isPending ? <ActivityIndicator color="white" /> : <Text className="font-semibold text-white">Save</Text>}
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
