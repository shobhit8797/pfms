"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

type TaxRegimeResult = {
  taxableIncome: number
  taxPayable: number
  cess: number
  totalTax: number
  regime: "OLD" | "NEW"
}

const deductionSchema = z.object({
  section: z.string().min(1, "Section is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  description: z.string().optional(),
})

export type DeductionState = {
  error?: string
  success?: string
}

function getCurrentFinancialYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12
  
  // Financial year runs from April to March
  // If month >= 4, it's the current year to next year
  // Otherwise, it's previous year to current year
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`
  }
}

export async function addDeduction(formData: FormData): Promise<DeductionState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "Unauthorized" }
  }

  const userId = session.user.id

  const rawData = {
    section: formData.get("section"),
    amount: formData.get("amount"),
    description: formData.get("description") || undefined,
  }

  const validated = deductionSchema.safeParse(rawData)

  if (!validated.success) {
    return { error: "Invalid input data" }
  }

  const data = validated.data
  const financialYear = getCurrentFinancialYear()

  try {
    await prisma.taxDeduction.create({
      data: {
        userId,
        financialYear,
        section: data.section,
        amount: data.amount,
        description: data.description,
      },
    })

    revalidatePath("/dashboard/tax")
    return { success: "Deduction added successfully" }
  } catch (error) {
    console.error("Add deduction error:", error)
    return { error: "Failed to add deduction" }
  }
}

export async function calculateTax() {
  const session = await auth()
  if (!session?.user?.id) return null

  // Fetch Incomes
  const incomes = await prisma.income.findMany({
    where: { 
        userId: session.user.id,
        isTaxable: true
        // In a real app, filter by Financial Year
    }
  })

  // Fetch Deductions (Investments tagged with tax deductions + Expenses tagged as deductible)
  // Simplified: Fetch investments with AssetClass PPF, EPF, NPS, etc. and Expenses with isTaxDeductible
  const investments = await prisma.investment.findMany({
    where: { userId: session.user.id }
  })

  const expenses = await prisma.expense.findMany({
    where: { userId: session.user.id, isTaxDeductible: true }
  })

  // Manually-recorded deductions (the "Add Deduction" dialog writes here)
  const taxDeductions = await prisma.taxDeduction.findMany({
    where: { userId: session.user.id, financialYear: getCurrentFinancialYear() },
  })

  // Calculate Total Gross Income
  const grossIncome = incomes.reduce((acc, inc) => acc + Number(inc.amount), 0)

  // --- Calculate Deductions for Old Regime ---
  let deduction80C = 0
  let deduction80D = 0
  let deductionNPS = 0
  
  // Investments — PPF/EPF qualify under 80C (ELSS/LIC users tag via notes "80C" or the
  // Add-Deduction dialog, since AssetClass has no ELSS/LIC member); NPS under 80CCD(1B).
  investments.forEach(inv => {
      const amount = Number(inv.currentValue) || (Number(inv.purchasePrice) * Number(inv.quantity))
      if (["PPF", "EPF"].includes(inv.assetClass) || inv.notes?.includes("80C")) {
          deduction80C += amount
      }
      if (inv.assetClass === "NPS") {
          deductionNPS += amount // 80CCD(1B) up to 50k extra
      }
  })

  // Expenses
  expenses.forEach(exp => {
      const amount = Number(exp.amount)
      if (exp.taxSection === "80C") deduction80C += amount
      if (exp.taxSection === "80D") deduction80D += amount
  })

  // Manually-recorded deductions, folded in by section
  taxDeductions.forEach(d => {
      const amount = Number(d.amount)
      const section = (d.section || "").toUpperCase().replace(/\s/g, "")
      if (section.includes("80CCD") || section.includes("NPS")) {
          deductionNPS += amount
      } else if (section.startsWith("80D")) {
          deduction80D += amount
      } else if (section.startsWith("80C")) {
          deduction80C += amount
      }
      // Other sections (80E, 80G, etc.) are recorded but not yet modeled in the slab math.
  })

  // Caps
  const capped80C = Math.min(deduction80C, 150000)
  const capped80D = Math.min(deduction80D, 25000) // Assuming < 60 yrs
  const cappedNPS = Math.min(deductionNPS, 50000)
  
  const stdDeductionOld = 50000
  const stdDeductionNew = 75000 // FY 24-25 proposal

  const totalDeductionsOld = capped80C + capped80D + cappedNPS + stdDeductionOld
  
  // --- New Regime Calculation ---
  // No deductions except Std Deduction and NPS employer contribution (ignoring NPS employer for simplicity here)
  const taxableIncomeNew = Math.max(0, grossIncome - stdDeductionNew)
  
  // Tax Slabs New Regime (FY 24-25)
  // 0-3L: 0
  // 3-7L: 5%
  // 7-10L: 10%
  // 10-12L: 15%
  // 12-15L: 20%
  // >15L: 30%
  
  let taxNew = 0
  if (taxableIncomeNew > 300000) {
      if (taxableIncomeNew <= 700000) {
           // Rebate u/s 87A makes it 0 if income <= 7L. 
           // But calculation-wise:
           taxNew += (taxableIncomeNew - 300000) * 0.05
      } else {
           taxNew += 400000 * 0.05 // 3-7L
           if (taxableIncomeNew <= 1000000) {
               taxNew += (taxableIncomeNew - 700000) * 0.10
           } else {
               taxNew += 300000 * 0.10 // 7-10L
               if (taxableIncomeNew <= 1200000) {
                   taxNew += (taxableIncomeNew - 1000000) * 0.15
               } else {
                   taxNew += 200000 * 0.15 // 10-12L
                   if (taxableIncomeNew <= 1500000) {
                        taxNew += (taxableIncomeNew - 1200000) * 0.20
                   } else {
                        taxNew += 300000 * 0.20 // 12-15L
                        taxNew += (taxableIncomeNew - 1500000) * 0.30
                   }
               }
           }
      }
  }
  
  // Rebate 87A for New Regime (up to 25k tax if income <= 7L)
  if (taxableIncomeNew <= 700000) taxNew = 0

  const cessNew = taxNew * 0.04
  
  // --- Old Regime Calculation ---
  const taxableIncomeOld = Math.max(0, grossIncome - totalDeductionsOld)
  
  // Tax Slabs Old Regime
  // 0-2.5L: 0
  // 2.5-5L: 5%
  // 5-10L: 20%
  // >10L: 30%
  
  let taxOld = 0
  if (taxableIncomeOld > 250000) {
      if (taxableIncomeOld <= 500000) {
          taxOld += (taxableIncomeOld - 250000) * 0.05
      } else {
          taxOld += 250000 * 0.05 // 2.5-5L
          if (taxableIncomeOld <= 1000000) {
               taxOld += (taxableIncomeOld - 500000) * 0.20
          } else {
               taxOld += 500000 * 0.20 // 5-10L
               taxOld += (taxableIncomeOld - 1000000) * 0.30
          }
      }
  }

  // Rebate 87A for Old Regime (up to 12.5k tax if income <= 5L)
  if (taxableIncomeOld <= 500000) taxOld = 0
  
  const cessOld = taxOld * 0.04

  return {
      grossIncome,
      oldRegime: {
          taxableIncome: taxableIncomeOld,
          taxPayable: taxOld,
          cess: cessOld,
          totalTax: taxOld + cessOld,
          deductions: {
              section80C: capped80C,
              section80D: capped80D,
              section80CCD: cappedNPS,
              standardDeduction: stdDeductionOld,
              total: totalDeductionsOld
          }
      },
      newRegime: {
          taxableIncome: taxableIncomeNew,
          taxPayable: taxNew,
          cess: cessNew,
          totalTax: taxNew + cessNew,
          deductions: {
              standardDeduction: stdDeductionNew
          }
      }
  }
}
