import { prisma } from "@/lib/db"
import { CategoryType } from "@prisma/client"

/**
 * Default seed data for a new user's 50:30:20 tracker, ported from the
 * spreadsheet `Setup` sheet (Category List -> Type mapping + Payment Modes).
 */
export const DEFAULT_CATEGORIES: {
  name: string
  type: CategoryType
  colorHex: string
  icon: string
}[] = [
  { name: "Life Infrastructure", type: "NEED", colorHex: "#2563eb", icon: "Home" },
  { name: "Performance & Growth", type: "NEED", colorHex: "#0891b2", icon: "TrendingUp" },
  { name: "Future Me", type: "SAVING", colorHex: "#16a34a", icon: "PiggyBank" },
  { name: "Relationships & Generosity", type: "WANT", colorHex: "#db2777", icon: "Heart" },
  { name: "Lifestyle Enjoyment", type: "WANT", colorHex: "#f59e0b", icon: "Sparkles" },
]

export const DEFAULT_PAYMENT_MODES: string[] = [
  "Credit Card",
  "Debit Card",
  "UPI",
  "Cash",
  "Bank Transfer",
]

/**
 * Seeds the default categories and payment modes for a user if they have none.
 * Idempotent: skips seeding any set that already has rows.
 */
export async function seedBudgetDefaults(userId: string): Promise<void> {
  const [categoryCount, paymentModeCount] = await Promise.all([
    prisma.category.count({ where: { userId, deletedAt: null } }),
    prisma.paymentMode.count({ where: { userId, deletedAt: null } }),
  ])

  const ops = []

  if (categoryCount === 0) {
    ops.push(
      prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
      })
    )
  }

  if (paymentModeCount === 0) {
    ops.push(
      prisma.paymentMode.createMany({
        data: DEFAULT_PAYMENT_MODES.map((name) => ({ name, userId })),
      })
    )
  }

  if (ops.length > 0) {
    await prisma.$transaction(ops)
  }
}
