"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Income, IncomeType, Frequency } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const incomeSchema = z.object({
  source: z.string().min(1, "Source is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  incomeDate: z.date(),
  type: z.nativeEnum(IncomeType),
  isRecurring: z.boolean().optional(),
  frequency: z.nativeEnum(Frequency).optional(),
  isTaxable: z.boolean().optional(),
  bankAccountId: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  notes: z.string().optional(),
})

export type IncomeState = {
  error?: string
  success?: string
}

export async function createIncome(prevState: IncomeState | undefined, formData: FormData): Promise<IncomeState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/330bc31a-43db-4108-82f1-804b7395875f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'income.ts:33',message:'Raw formData extraction',data:{notesRaw:formData.get("notes"),notesType:typeof formData.get("notes"),notesIsNull:formData.get("notes")===null,hasNotesKey:formData.has("notes")},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const rawData = {
    source: formData.get("source"),
    amount: formData.get("amount"),
    incomeDate: new Date(formData.get("incomeDate") as string),
    type: formData.get("type"),
    isRecurring: formData.get("isRecurring") === "on",
    frequency: formData.get("frequency") || undefined, // Handle empty string
    isTaxable: formData.get("isTaxable") === "on",
    bankAccountId: formData.get("bankAccountId") || undefined,
    category: formData.get("category"),
    notes: formData.get("notes"),
  }
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/330bc31a-43db-4108-82f1-804b7395875f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'income.ts:44',message:'rawData before validation',data:{notes:rawData.notes,notesType:typeof rawData.notes,notesIsNull:rawData.notes===null,notesIsUndefined:rawData.notes===undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  const validated = incomeSchema.safeParse(rawData)
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/330bc31a-43db-4108-82f1-804b7395875f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'income.ts:46',message:'Validation result',data:{success:validated.success,errors:validated.success?null:validated.error.flatten()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (!validated.success) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/330bc31a-43db-4108-82f1-804b7395875f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'income.ts:48',message:'Validation failed - returning error',data:{flattenedErrors:validated.error.flatten()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log(validated.error.flatten())
    return { error: "Invalid input data" }
  }

  const data = validated.data

  // If recurring, frequency is required
  if (data.isRecurring && !data.frequency) {
    return { error: "Frequency is required for recurring income" }
  }

  try {
    const income = await prisma.income.create({
      data: {
        userId: session.user.id,
        source: data.source,
        amount: data.amount,
        incomeDate: data.incomeDate,
        type: data.type,
        isRecurring: data.isRecurring || false,
        frequency: data.isRecurring ? data.frequency : null,
        isTaxable: data.isTaxable || false,
        bankAccountId: data.bankAccountId,
        category: data.category,
        notes: data.notes,
      },
    })

    // Update bank balance if linked
    if (data.bankAccountId) {
      await prisma.bankAccount.update({
        where: { id: data.bankAccountId },
        data: {
          currentBalance: {
            increment: data.amount
          }
        }
      })
    }

    revalidatePath("/dashboard/income")
    revalidatePath("/dashboard") // For net worth update
    return { success: "Income added successfully" }
  } catch (error) {
    console.error("Create income error:", error)
    return { error: "Failed to create income" }
  }
}

export async function getIncomes() {
  const session = await auth()
  if (!session?.user?.id) return []

  return await prisma.income.findMany({
    where: { userId: session.user.id },
    include: {
      bankAccount: {
        select: {
          accountName: true,
          bankName: true
        }
      }
    },
    orderBy: { incomeDate: "desc" },
  })
}


