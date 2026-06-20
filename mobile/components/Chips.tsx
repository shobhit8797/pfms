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
              active ? "border-primary bg-primary" : "border-border bg-card"
            }`}
          >
            <Text className={active ? "text-sm font-medium text-primary-foreground" : "text-sm text-foreground"}>{o.label}</Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}
