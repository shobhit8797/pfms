/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(${v}) / <alpha-value>)`

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Semantic tokens, mirrored from the web app (values live in global.css).
        background: c("--background"),
        foreground: c("--foreground"),
        card: { DEFAULT: c("--card"), foreground: c("--card-foreground") },
        popover: { DEFAULT: c("--popover"), foreground: c("--popover-foreground") },
        primary: { DEFAULT: c("--primary"), foreground: c("--primary-foreground") },
        secondary: { DEFAULT: c("--secondary"), foreground: c("--secondary-foreground") },
        muted: { DEFAULT: c("--muted"), foreground: c("--muted-foreground") },
        accent: { DEFAULT: c("--accent"), foreground: c("--accent-foreground") },
        destructive: { DEFAULT: c("--destructive"), foreground: c("--destructive-foreground") },
        success: { DEFAULT: c("--success"), foreground: c("--success-foreground") },
        gold: { DEFAULT: c("--gold"), muted: c("--gold-muted") },
        border: c("--border"),
        input: c("--input"),
        ring: c("--ring"),
        // Back-compat: existing `bg-brand`/`text-brand` now resolve to the gold primary.
        brand: c("--primary"),
      },
    },
  },
  plugins: [],
}
