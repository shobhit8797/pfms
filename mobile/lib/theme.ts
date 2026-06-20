import { useColorScheme } from "react-native"
import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native"

/**
 * JS-side mirror of the theme tokens in global.css, for props that take a raw
 * color string instead of a className (Ionicons `color`, ActivityIndicator,
 * Switch trackColor, React Navigation header/tab bar). Keep these hex values in
 * sync with the "R G B" channels in global.css. Both follow the device color
 * scheme, matching the web's next-themes "system" default.
 */
const light = {
  background: "#faf8f5",
  foreground: "#0e0a07",
  card: "#ffffff",
  cardForeground: "#0e0a07",
  primary: "#b9832c",
  primaryForeground: "#faf8f5",
  secondary: "#efebe4",
  secondaryForeground: "#25211d",
  muted: "#eeebe5",
  mutedForeground: "#68625e",
  accent: "#efebe4",
  accentForeground: "#25211d",
  destructive: "#b84455",
  destructiveForeground: "#faf8f5",
  success: "#118659",
  successForeground: "#faf8f5",
  gold: "#d79628",
  goldMuted: "#c29e6b",
  border: "#e1ddd7",
  input: "#e1ddd7",
  ring: "#b9832c",
}

const dark: ThemeColors = {
  background: "#070504",
  foreground: "#f0eeeb",
  card: "#0f0d0b",
  cardForeground: "#f0eeeb",
  primary: "#eba941",
  primaryForeground: "#070504",
  secondary: "#1c1a18",
  secondaryForeground: "#f0eeeb",
  muted: "#1c1a18",
  mutedForeground: "#83807a",
  accent: "#1e1a16",
  accentForeground: "#f0eeeb",
  destructive: "#c95463",
  destructiveForeground: "#f0eeeb",
  success: "#2b9667",
  successForeground: "#070504",
  gold: "#eba941",
  goldMuted: "#ac8856",
  border: "#25211d",
  input: "#25211d",
  ring: "#eba941",
}

export type ThemeColors = typeof light

export const palette = { light, dark }

/** Current palette for the device color scheme (system-driven). */
export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme()
  return scheme === "dark" ? dark : light
}

/** React Navigation theme (headers, tab bars, screen backgrounds). */
export function useNavTheme(): Theme {
  const scheme = useColorScheme()
  const isDark = scheme === "dark"
  const c = isDark ? dark : light
  const base = isDark ? DarkTheme : DefaultTheme
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.card,
      text: c.foreground,
      border: c.border,
      notification: c.destructive,
    },
  }
}
