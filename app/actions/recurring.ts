"use server"

import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import type { Frequency } from "@pfms/shared"
import { detectRecurringSuggestions, markRecurring } from "@/lib/services/recurring.service"

/** Detected month-on-month repeats not yet marked recurring (for the suggest banner). */
export async function getRecurringSuggestions() {
  const session = await auth()
  if (!session?.user?.id) return []
  return detectRecurringSuggestions(session.user.id)
}

export async function confirmRecurring(
  kind: "expense" | "income",
  ids: string[],
  frequency: Frequency = "MONTHLY"
): Promise<{ error?: string; success?: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  try {
    const { count } = await markRecurring(session.user.id, kind, ids, frequency)
    revalidatePath("/dashboard/expenses")
    revalidatePath("/dashboard/income")
    return { success: `Marked ${count} ${kind === "expense" ? "expenses" : "income entries"} as recurring` }
  } catch {
    return { error: "Failed to mark recurring" }
  }
}
