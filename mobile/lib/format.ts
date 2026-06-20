export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

/** Today as YYYY-MM-DD for date inputs. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
