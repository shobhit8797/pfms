import { ScrollView, Text, TouchableOpacity } from "react-native"

type Option<T> = { value: T; label: string }

/** Horizontal single-select chip row used by the forms' pickers. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 -mx-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`mx-1 rounded-full border px-4 py-2 ${
              active ? "border-brand bg-brand" : "border-gray-300 bg-white"
            }`}
          >
            <Text className={active ? "text-sm font-medium text-white" : "text-sm text-gray-700"}>{o.label}</Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}
