"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import {
  AccountType,
  BankAccount,
  AlertType,
  TransferStatus,
  BalanceSnapshot,
  BalanceAlert,
  TransferTransaction,
} from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// ============================================================================
// Schemas
// ============================================================================

const bankAccountSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountType: z.nativeEnum(AccountType),
  accountNumber: z.string().min(4, "Account number must be at least 4 digits"),
  ifscCode: z.string().min(1, "IFSC code is required"),
  currentBalance: z.coerce.number().min(0, "Balance cannot be negative"),
  isPrimary: z.boolean().optional(),
})

const updateBankAccountSchema = z.object({
  accountName: z.string().min(1, "Account name is required").optional(),
  bankName: z.string().min(1, "Bank name is required").optional(),
  accountType: z.nativeEnum(AccountType).optional(),
  currentBalance: z.coerce.number().min(0, "Balance cannot be negative").optional(),
  isPrimary: z.boolean().optional(),
  minimumBalance: z.coerce.number().min(0).optional(),
  interestRate: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Source account is required"),
  toAccountId: z.string().min(1, "Destination account is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  transferDate: z.coerce.date(),
  description: z.string().optional(),
  notes: z.string().optional(),
})

const balanceAlertSchema = z.object({
  bankAccountId: z.string().min(1, "Account is required"),
  alertType: z.nativeEnum(AlertType),
  threshold: z.coerce.number().min(0),
  message: z.string().optional(),
})

// ============================================================================
// Types
// ============================================================================

export type BankAccountState = {
  error?: string
  success?: string
}

export type AccountFilter = "ALL" | "ACTIVE" | "INACTIVE"

export type AnalyticsPeriod = "MONTH" | "QUARTER" | "YEAR" | "CUSTOM"

export type AccountAnalytics = {
  totalIncome: number
  totalExpense: number
  netFlow: number
  categoryBreakdown: { category: string; amount: number; type: "income" | "expense" }[]
  dailyBalance: { date: string; balance: number }[]
  averageDailyBalance: number
  highestBalance: { amount: number; date: string }
  lowestBalance: { amount: number; date: string }
  previousPeriodComparison: {
    incomeChange: number
    expenseChange: number
  }
}

export type TransactionHistoryItem = {
  id: string
  date: Date
  description: string
  amount: number
  type: "income" | "expense" | "transfer"
  category: string
  balance?: number
}

export type BankAccountWithStats = BankAccount & {
  monthlyIncome: number
  monthlyExpense: number
  balanceTrend: number // percentage change
}

// ============================================================================
// Phase 1: Core Account Management
// ============================================================================

export async function createBankAccount(
  prevState: BankAccountState | undefined,
  formData: FormData
): Promise<BankAccountState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }
  const userId = session.user.id

  const rawData = {
    accountName: formData.get("accountName"),
    bankName: formData.get("bankName"),
    accountType: formData.get("accountType"),
    accountNumber: formData.get("accountNumber"),
    ifscCode: formData.get("ifscCode"),
    currentBalance: formData.get("currentBalance"),
    isPrimary: formData.get("isPrimary") === "on",
  }

  const validated = bankAccountSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: "Invalid input data" }
  }

  const data = validated.data

  try {
    // If setting as primary, unset other primary accounts
    if (data.isPrimary) {
      await prisma.bankAccount.updateMany({
        where: { userId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const account = await prisma.bankAccount.create({
      data: {
        userId,
        ...data,
      },
    })

    // Create initial balance snapshot
    await prisma.balanceSnapshot.create({
      data: {
        bankAccountId: account.id,
        balance: data.currentBalance,
        snapshotDate: new Date(),
        source: "MANUAL",
      },
    })

    revalidatePath("/dashboard/accounts")
    return { success: "Bank account added successfully" }
  } catch (error) {
    console.error("Create bank account error:", error)
    return { error: "Failed to create bank account" }
  }
}

export async function updateBankAccount(
  accountId: string,
  formData: FormData
): Promise<BankAccountState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }
  const userId = session.user.id

  // Verify ownership
  const existingAccount = await prisma.bankAccount.findUnique({
    where: { id: accountId, userId },
  })

  if (!existingAccount) {
    return { error: "Account not found" }
  }

  const rawData: Record<string, unknown> = {}
  const formFields = [
    "accountName",
    "bankName",
    "accountType",
    "currentBalance",
    "minimumBalance",
    "interestRate",
    "notes",
    "color",
  ]

  formFields.forEach((field) => {
    const value = formData.get(field)
    if (value !== null && value !== "") {
      rawData[field] = value
    }
  })

  // Handle isPrimary checkbox
  if (formData.has("isPrimary")) {
    rawData.isPrimary = formData.get("isPrimary") === "on" || formData.get("isPrimary") === "true"
  }

  // Handle tags as JSON array
  const tagsValue = formData.get("tags")
  if (tagsValue) {
    try {
      rawData.tags = JSON.parse(tagsValue as string)
    } catch {
      rawData.tags = (tagsValue as string).split(",").map((t) => t.trim())
    }
  }

  const validated = updateBankAccountSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: "Invalid input data" }
  }

  const data = validated.data

  try {
    // If setting as primary, unset other primary accounts
    if (data.isPrimary) {
      await prisma.bankAccount.updateMany({
        where: { userId, isPrimary: true, id: { not: accountId } },
        data: { isPrimary: false },
      })
    }

    // Track balance change for snapshot
    const balanceChanged =
      data.currentBalance !== undefined &&
      Number(existingAccount.currentBalance) !== data.currentBalance

    await prisma.bankAccount.update({
      where: { id: accountId, userId },
      data: {
        ...data,
        tags: data.tags ?? undefined,
      },
    })

    // Create balance snapshot if balance changed
    if (balanceChanged && data.currentBalance !== undefined) {
      await prisma.balanceSnapshot.create({
        data: {
          bankAccountId: accountId,
          balance: data.currentBalance,
          snapshotDate: new Date(),
          source: "MANUAL",
        },
      })

      // Check balance alerts
      await checkAndTriggerAlerts(accountId, data.currentBalance)
    }

    revalidatePath("/dashboard/accounts")
    revalidatePath(`/dashboard/accounts/${accountId}`)
    return { success: "Bank account updated successfully" }
  } catch (error) {
    console.error("Update bank account error:", error)
    return { error: "Failed to update bank account" }
  }
}

export async function getBankAccounts(
  filter: AccountFilter = "ACTIVE"
): Promise<BankAccountWithStats[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const whereClause: { userId: string; isActive?: boolean } = {
    userId: session.user.id,
  }

  if (filter === "ACTIVE") {
    whereClause.isActive = true
  } else if (filter === "INACTIVE") {
    whereClause.isActive = false
  }

  const accounts = await prisma.bankAccount.findMany({
    where: whereClause,
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    include: {
      incomes: {
        where: {
          incomeDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        select: { amount: true },
      },
      expenses: {
        where: {
          expenseDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        select: { amount: true },
      },
      balanceHistory: {
        orderBy: { snapshotDate: "desc" },
        take: 2,
        select: { balance: true, snapshotDate: true },
      },
    },
  })

  return accounts.map((account) => {
    const monthlyIncome = account.incomes.reduce((sum, i) => sum + Number(i.amount), 0)
    const monthlyExpense = account.expenses.reduce((sum, e) => sum + Number(e.amount), 0)

    // Calculate balance trend (percentage change from last snapshot)
    let balanceTrend = 0
    if (account.balanceHistory.length >= 2) {
      const current = Number(account.balanceHistory[0].balance)
      const previous = Number(account.balanceHistory[1].balance)
      if (previous !== 0) {
        balanceTrend = ((current - previous) / Math.abs(previous)) * 100
      }
    }

    // Remove included relations from the result
    const { incomes: _incomes, expenses: _expenses, balanceHistory: _history, ...accountData } = account

    return {
      ...accountData,
      monthlyIncome,
      monthlyExpense,
      balanceTrend,
    }
  })
}

export async function getBankAccountById(accountId: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  return await prisma.bankAccount.findUnique({
    where: { id: accountId, userId: session.user.id },
    include: {
      group: true,
      alerts: {
        where: { isRead: false },
        orderBy: { triggeredAt: "desc" },
      },
    },
  })
}

export async function toggleAccountStatus(
  accountId: string,
  isActive: boolean
): Promise<BankAccountState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const userId = session.user.id

  try {
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId, userId },
    })

    if (!account) {
      return { error: "Account not found" }
    }

    await prisma.bankAccount.update({
      where: { id: accountId, userId },
      data: { isActive },
    })

    // If deactivating the primary account, assign primary to another active account
    if (!isActive && account.isPrimary) {
      const anotherActiveAccount = await prisma.bankAccount.findFirst({
        where: { userId, isActive: true, id: { not: accountId } },
        orderBy: { createdAt: "asc" },
      })

      if (anotherActiveAccount) {
        await prisma.bankAccount.update({
          where: { id: anotherActiveAccount.id },
          data: { isPrimary: true },
        })
      }

      // Also remove primary from deactivated account
      await prisma.bankAccount.update({
        where: { id: accountId },
        data: { isPrimary: false },
      })
    }

    revalidatePath("/dashboard/accounts")
    return { success: "Account status updated" }
  } catch (error) {
    console.error("Toggle account status error:", error)
    return { error: "Failed to update account status" }
  }
}

export async function setPrimaryAccount(accountId: string): Promise<BankAccountState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const userId = session.user.id

  try {
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId, userId },
    })

    if (!account) {
      return { error: "Account not found" }
    }

    if (!account.isActive) {
      return { error: "Cannot set inactive account as primary" }
    }

    // Remove primary from all accounts
    await prisma.bankAccount.updateMany({
      where: { userId, isPrimary: true },
      data: { isPrimary: false },
    })

    // Set this account as primary
    await prisma.bankAccount.update({
      where: { id: accountId },
      data: { isPrimary: true },
    })

    revalidatePath("/dashboard/accounts")
    return { success: "Primary account updated" }
  } catch (error) {
    console.error("Set primary account error:", error)
    return { error: "Failed to set primary account" }
  }
}

export async function deleteAccount(accountId: string): Promise<BankAccountState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const userId = session.user.id

  try {
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId, userId },
      include: {
        _count: {
          select: {
            incomes: true,
            expenses: true,
            transfersFrom: true,
            transfersTo: true,
          },
        },
      },
    })

    if (!account) {
      return { error: "Account not found" }
    }

    const hasTransactions =
      account._count.incomes > 0 ||
      account._count.expenses > 0 ||
      account._count.transfersFrom > 0 ||
      account._count.transfersTo > 0

    if (hasTransactions) {
      // Soft delete - mark as inactive and archived
      await prisma.bankAccount.update({
        where: { id: accountId },
        data: { isActive: false },
      })

      // Reassign primary if needed
      if (account.isPrimary) {
        const anotherAccount = await prisma.bankAccount.findFirst({
          where: { userId, isActive: true, id: { not: accountId } },
        })

        if (anotherAccount) {
          await prisma.bankAccount.update({
            where: { id: anotherAccount.id },
            data: { isPrimary: true },
          })
        }

        await prisma.bankAccount.update({
          where: { id: accountId },
          data: { isPrimary: false },
        })
      }

      revalidatePath("/dashboard/accounts")
      return { success: "Account archived (has linked transactions)" }
    }

    // Hard delete if no transactions
    await prisma.bankAccount.delete({
      where: { id: accountId },
    })

    revalidatePath("/dashboard/accounts")
    return { success: "Account deleted successfully" }
  } catch (error) {
    console.error("Delete account error:", error)
    return { error: "Failed to delete account" }
  }
}

// ============================================================================
// Phase 2: Analytics & Tracking
// ============================================================================

export async function getAccountAnalytics(
  accountId: string,
  period: AnalyticsPeriod = "MONTH",
  startDate?: Date,
  endDate?: Date
): Promise<AccountAnalytics | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const userId = session.user.id

  // Verify ownership
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId, userId },
  })

  if (!account) return null

  // Calculate date range based on period
  const now = new Date()
  let periodStart: Date
  const periodEnd: Date = endDate || now

  switch (period) {
    case "MONTH":
      periodStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case "QUARTER":
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3
      periodStart = startDate || new Date(now.getFullYear(), quarterMonth, 1)
      break
    case "YEAR":
      periodStart = startDate || new Date(now.getFullYear(), 0, 1)
      break
    case "CUSTOM":
      periodStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1)
      break
    default:
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  // Fetch income for period
  const incomes = await prisma.income.findMany({
    where: {
      userId,
      bankAccountId: accountId,
      incomeDate: { gte: periodStart, lte: periodEnd },
    },
  })

  // Fetch expenses for period
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      bankAccountId: accountId,
      expenseDate: { gte: periodStart, lte: periodEnd },
    },
  })

  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  // Category breakdown
  const incomeByCategory = incomes.reduce(
    (acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + Number(i.amount)
      return acc
    },
    {} as Record<string, number>
  )

  const expenseByCategory = expenses.reduce(
    (acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
      return acc
    },
    {} as Record<string, number>
  )

  const categoryBreakdown = [
    ...Object.entries(incomeByCategory).map(([category, amount]) => ({
      category,
      amount,
      type: "income" as const,
    })),
    ...Object.entries(expenseByCategory).map(([category, amount]) => ({
      category,
      amount,
      type: "expense" as const,
    })),
  ]

  // Balance history
  const balanceSnapshots = await prisma.balanceSnapshot.findMany({
    where: {
      bankAccountId: accountId,
      snapshotDate: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { snapshotDate: "asc" },
  })

  const dailyBalance = balanceSnapshots.map((s) => ({
    date: s.snapshotDate.toISOString().split("T")[0],
    balance: Number(s.balance),
  }))

  const balances = balanceSnapshots.map((s) => Number(s.balance))
  const averageDailyBalance =
    balances.length > 0 ? balances.reduce((a, b) => a + b, 0) / balances.length : Number(account.currentBalance)

  const highestBalanceSnapshot = balanceSnapshots.reduce(
    (max, s) => (Number(s.balance) > max.amount ? { amount: Number(s.balance), date: s.snapshotDate.toISOString() } : max),
    { amount: Number(account.currentBalance), date: now.toISOString() }
  )

  const lowestBalanceSnapshot = balanceSnapshots.reduce(
    (min, s) => (Number(s.balance) < min.amount ? { amount: Number(s.balance), date: s.snapshotDate.toISOString() } : min),
    { amount: Number(account.currentBalance), date: now.toISOString() }
  )

  // Previous period comparison
  const periodLength = periodEnd.getTime() - periodStart.getTime()
  const prevPeriodStart = new Date(periodStart.getTime() - periodLength)
  const prevPeriodEnd = new Date(periodStart.getTime() - 1)

  const prevIncomes = await prisma.income.findMany({
    where: {
      userId,
      bankAccountId: accountId,
      incomeDate: { gte: prevPeriodStart, lte: prevPeriodEnd },
    },
  })

  const prevExpenses = await prisma.expense.findMany({
    where: {
      userId,
      bankAccountId: accountId,
      expenseDate: { gte: prevPeriodStart, lte: prevPeriodEnd },
    },
  })

  const prevTotalIncome = prevIncomes.reduce((sum, i) => sum + Number(i.amount), 0)
  const prevTotalExpense = prevExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const incomeChange = prevTotalIncome !== 0 ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100 : 0
  const expenseChange = prevTotalExpense !== 0 ? ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100 : 0

  return {
    totalIncome,
    totalExpense,
    netFlow: totalIncome - totalExpense,
    categoryBreakdown,
    dailyBalance,
    averageDailyBalance,
    highestBalance: highestBalanceSnapshot,
    lowestBalance: lowestBalanceSnapshot,
    previousPeriodComparison: {
      incomeChange,
      expenseChange,
    },
  }
}

export async function getAccountTransactionHistory(
  accountId: string,
  page: number = 1,
  limit: number = 50,
  filters?: {
    startDate?: Date
    endDate?: Date
    type?: "income" | "expense" | "transfer" | "all"
    category?: string
  }
): Promise<{ transactions: TransactionHistoryItem[]; total: number; pages: number }> {
  const session = await auth()
  if (!session?.user?.id) return { transactions: [], total: 0, pages: 0 }

  const userId = session.user.id

  // Verify ownership
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId, userId },
  })

  if (!account) return { transactions: [], total: 0, pages: 0 }

  const transactions: TransactionHistoryItem[] = []

  const dateFilter = {
    ...(filters?.startDate && { gte: filters.startDate }),
    ...(filters?.endDate && { lte: filters.endDate }),
  }

  // Fetch incomes
  if (!filters?.type || filters.type === "all" || filters.type === "income") {
    const incomes = await prisma.income.findMany({
      where: {
        userId,
        bankAccountId: accountId,
        ...(Object.keys(dateFilter).length > 0 && { incomeDate: dateFilter }),
        ...(filters?.category && { category: filters.category }),
      },
    })

    incomes.forEach((income) => {
      transactions.push({
        id: income.id,
        date: income.incomeDate,
        description: income.source,
        amount: Number(income.amount),
        type: "income",
        category: income.category,
      })
    })
  }

  // Fetch expenses
  if (!filters?.type || filters.type === "all" || filters.type === "expense") {
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        bankAccountId: accountId,
        ...(Object.keys(dateFilter).length > 0 && { expenseDate: dateFilter }),
        ...(filters?.category && { category: filters.category }),
      },
    })

    expenses.forEach((expense) => {
      transactions.push({
        id: expense.id,
        date: expense.expenseDate,
        description: expense.description,
        amount: Number(expense.amount),
        type: "expense",
        category: expense.category,
      })
    })
  }

  // Fetch transfers
  if (!filters?.type || filters.type === "all" || filters.type === "transfer") {
    const transfersFrom = await prisma.transferTransaction.findMany({
      where: {
        userId,
        fromAccountId: accountId,
        ...(Object.keys(dateFilter).length > 0 && { transferDate: dateFilter }),
      },
      include: { toAccount: { select: { accountName: true } } },
    })

    const transfersTo = await prisma.transferTransaction.findMany({
      where: {
        userId,
        toAccountId: accountId,
        ...(Object.keys(dateFilter).length > 0 && { transferDate: dateFilter }),
      },
      include: { fromAccount: { select: { accountName: true } } },
    })

    transfersFrom.forEach((t) => {
      transactions.push({
        id: t.id,
        date: t.transferDate,
        description: `Transfer to ${t.toAccount.accountName}`,
        amount: -Number(t.amount),
        type: "transfer",
        category: "Transfer",
      })
    })

    transfersTo.forEach((t) => {
      transactions.push({
        id: t.id,
        date: t.transferDate,
        description: `Transfer from ${t.fromAccount.accountName}`,
        amount: Number(t.amount),
        type: "transfer",
        category: "Transfer",
      })
    })
  }

  // Sort by date descending
  transactions.sort((a, b) => b.date.getTime() - a.date.getTime())

  const total = transactions.length
  const pages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const paginatedTransactions = transactions.slice(startIndex, startIndex + limit)

  return { transactions: paginatedTransactions, total, pages }
}

export async function getBalanceHistory(
  accountId: string,
  startDate?: Date,
  endDate?: Date
): Promise<BalanceSnapshot[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const userId = session.user.id

  // Verify ownership
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId, userId },
  })

  if (!account) return []

  return await prisma.balanceSnapshot.findMany({
    where: {
      bankAccountId: accountId,
      ...(startDate && { snapshotDate: { gte: startDate } }),
      ...(endDate && { snapshotDate: { lte: endDate } }),
    },
    orderBy: { snapshotDate: "asc" },
  })
}

export async function createBalanceSnapshot(
  accountId: string,
  balance: number,
  source: string = "MANUAL"
): Promise<BalanceSnapshot | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const userId = session.user.id

  // Verify ownership
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId, userId },
  })

  if (!account) return null

  return await prisma.balanceSnapshot.create({
    data: {
      bankAccountId: accountId,
      balance,
      snapshotDate: new Date(),
      source,
    },
  })
}

// ============================================================================
// Phase 2: Balance Alerts
// ============================================================================

export async function createBalanceAlert(formData: FormData): Promise<BankAccountState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const userId = session.user.id

  const rawData = {
    bankAccountId: formData.get("bankAccountId"),
    alertType: formData.get("alertType"),
    threshold: formData.get("threshold"),
    message: formData.get("message") || `Balance alert triggered`,
  }

  const validated = balanceAlertSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: "Invalid input data" }
  }

  const { bankAccountId, alertType, threshold, message } = validated.data

  // Verify ownership
  const account = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId, userId },
  })

  if (!account) {
    return { error: "Account not found" }
  }

  try {
    await prisma.balanceAlert.create({
      data: {
        userId,
        bankAccountId,
        alertType,
        threshold,
        message: message || `Balance alert: ${alertType}`,
      },
    })

    revalidatePath(`/dashboard/accounts/${bankAccountId}`)
    return { success: "Balance alert created" }
  } catch (error) {
    console.error("Create balance alert error:", error)
    return { error: "Failed to create balance alert" }
  }
}

export async function getBalanceAlerts(
  accountId?: string,
  unreadOnly: boolean = true
): Promise<BalanceAlert[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  return await prisma.balanceAlert.findMany({
    where: {
      userId: session.user.id,
      ...(accountId && { bankAccountId: accountId }),
      ...(unreadOnly && { isRead: false }),
    },
    orderBy: { triggeredAt: "desc" },
  })
}

export async function markAlertAsRead(alertId: string): Promise<BankAccountState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  try {
    await prisma.balanceAlert.update({
      where: { id: alertId, userId: session.user.id },
      data: { isRead: true },
    })

    return { success: "Alert marked as read" }
  } catch {
    return { error: "Failed to update alert" }
  }
}

async function checkAndTriggerAlerts(accountId: string, newBalance: number): Promise<void> {
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId },
  })

  if (!account) return

  const userId = account.userId

  // Check minimum balance alert
  if (account.minimumBalance && newBalance < Number(account.minimumBalance)) {
    await prisma.balanceAlert.create({
      data: {
        userId,
        bankAccountId: accountId,
        alertType: "MINIMUM_BALANCE",
        threshold: Number(account.minimumBalance),
        message: `Balance (₹${newBalance.toLocaleString()}) is below minimum balance (₹${Number(account.minimumBalance).toLocaleString()})`,
      },
    })
  }

  // Check for low balance (below 10% of average or ₹1000)
  const recentSnapshots = await prisma.balanceSnapshot.findMany({
    where: { bankAccountId: accountId },
    orderBy: { snapshotDate: "desc" },
    take: 30,
  })

  if (recentSnapshots.length > 5) {
    const avgBalance =
      recentSnapshots.reduce((sum, s) => sum + Number(s.balance), 0) / recentSnapshots.length
    const threshold = Math.max(avgBalance * 0.1, 1000)

    if (newBalance < threshold) {
      await prisma.balanceAlert.create({
        data: {
          userId,
          bankAccountId: accountId,
          alertType: "LOW_BALANCE",
          threshold,
          message: `Balance (₹${newBalance.toLocaleString()}) is unusually low`,
        },
      })
    }
  }
}

// ============================================================================
// Phase 3: Inter-Account Transfers
// ============================================================================

export async function createTransfer(formData: FormData): Promise<BankAccountState> {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }

  const userId = session.user.id

  const rawData = {
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    amount: formData.get("amount"),
    transferDate: formData.get("transferDate") || new Date().toISOString(),
    description: formData.get("description"),
    notes: formData.get("notes"),
  }

  const validated = transferSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: "Invalid input data" }
  }

  const { fromAccountId, toAccountId, amount, transferDate, description, notes } = validated.data

  if (fromAccountId === toAccountId) {
    return { error: "Cannot transfer to the same account" }
  }

  // Verify ownership of both accounts
  const [fromAccount, toAccount] = await Promise.all([
    prisma.bankAccount.findUnique({ where: { id: fromAccountId, userId } }),
    prisma.bankAccount.findUnique({ where: { id: toAccountId, userId } }),
  ])

  if (!fromAccount || !toAccount) {
    return { error: "One or both accounts not found" }
  }

  // Check sufficient balance
  if (Number(fromAccount.currentBalance) < amount) {
    return { error: "Insufficient balance in source account" }
  }

  try {
    // Use transaction for atomic operation
    await prisma.$transaction(async (tx) => {
      // Create transfer record
      await tx.transferTransaction.create({
        data: {
          userId,
          fromAccountId,
          toAccountId,
          amount,
          transferDate,
          description,
          notes,
          status: TransferStatus.COMPLETED,
        },
      })

      // Update source account balance
      const newFromBalance = Number(fromAccount.currentBalance) - amount
      await tx.bankAccount.update({
        where: { id: fromAccountId },
        data: { currentBalance: newFromBalance },
      })

      // Update destination account balance
      const newToBalance = Number(toAccount.currentBalance) + amount
      await tx.bankAccount.update({
        where: { id: toAccountId },
        data: { currentBalance: newToBalance },
      })

      // Create balance snapshots
      await tx.balanceSnapshot.createMany({
        data: [
          {
            bankAccountId: fromAccountId,
            balance: newFromBalance,
            snapshotDate: transferDate,
            source: "TRANSACTION",
          },
          {
            bankAccountId: toAccountId,
            balance: newToBalance,
            snapshotDate: transferDate,
            source: "TRANSACTION",
          },
        ],
      })
    })

    // Check alerts for source account
    await checkAndTriggerAlerts(fromAccountId, Number(fromAccount.currentBalance) - amount)

    revalidatePath("/dashboard/accounts")
    revalidatePath(`/dashboard/accounts/${fromAccountId}`)
    revalidatePath(`/dashboard/accounts/${toAccountId}`)
    revalidatePath("/dashboard/accounts/transfers")

    return { success: "Transfer completed successfully" }
  } catch (error) {
    console.error("Transfer error:", error)
    return { error: "Failed to complete transfer" }
  }
}

export type TransferWithAccounts = TransferTransaction & {
  fromAccount: { accountName: string; bankName: string }
  toAccount: { accountName: string; bankName: string }
}

export async function getTransfers(
  accountId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<TransferWithAccounts[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const userId = session.user.id

  return await prisma.transferTransaction.findMany({
    where: {
      userId,
      ...(accountId && {
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      }),
      ...(startDate && { transferDate: { gte: startDate } }),
      ...(endDate && { transferDate: { lte: endDate } }),
    },
    include: {
      fromAccount: { select: { accountName: true, bankName: true } },
      toAccount: { select: { accountName: true, bankName: true } },
    },
    orderBy: { transferDate: "desc" },
  })
}
