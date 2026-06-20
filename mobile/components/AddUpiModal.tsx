import { useState } from "react"
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native"
import { ApiError, upiHandleCreateSchema } from "@pfms/shared"
import { useCreateUpiHandle } from "../lib/hooks"
import { useThemeColors } from "../lib/theme"

export function AddUpiModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const create = useCreateUpiHandle()
  const c = useThemeColors()

  const [name, setName] = useState("")
  const [handle, setHandle] = useState("")
  const [error, setError] = useState<string | null>(null)

  const reset = () => { setName(""); setHandle(""); setError(null) }

  const onSubmit = async () => {
    setError(null)
    const parsed = upiHandleCreateSchema.safeParse({ name, handle })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input")
      return
    }
    try {
      await create.mutateAsync(parsed.data)
      reset()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save UPI handle")
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView className="flex-1 bg-background px-6 pt-6" keyboardShouldPersistTaps="handled">
        <Text className="mb-5 text-2xl font-bold text-foreground">Add UPI</Text>

        <View className="mb-5 rounded-xl border border-primary/30 bg-secondary p-4">
          <Text className="text-sm text-secondary-foreground">
            Save your UPI handles (e.g. GPay, PhonePe) here for quick reference when logging expenses.
          </Text>
        </View>

        <Field label="Display name">
          <TextInput
            className={inputCls}
            placeholderTextColor={c.mutedForeground}
            placeholder="e.g. GPay, PhonePe"
            value={name}
            onChangeText={setName}
          />
        </Field>
        <Field label="UPI handle (VPA)">
          <TextInput
            className={inputCls}
            placeholderTextColor={c.mutedForeground}
            placeholder="e.g. user@ybl"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={handle}
            onChangeText={setHandle}
          />
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
              : <Text className="font-semibold text-primary-foreground">Save UPI</Text>
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
