import Papa from "papaparse"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { format } from "date-fns"

export const runtime = "nodejs"

/** CSV export of the user's expenses (browser download, session-authenticated). */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const expenses = await prisma.expense.findMany({
    where: { userId: session.user.id },
    orderBy: { expenseDate: "desc" },
    include: {
      bankAccount: { select: { accountName: true, bankName: true } },
      creditCard: { select: { cardName: true, lastFourDigits: true } },
    },
  })

  const rows = expenses.map((e) => ({
    Date: format(new Date(e.expenseDate), "yyyy-MM-dd"),
    Description: e.description,
    Category: e.category,
    Subcategory: e.subcategory ?? "",
    Amount: Number(e.amount),
    "Payment Method": e.paymentMethod,
    Account: e.bankAccount ? `${e.bankAccount.accountName} (${e.bankAccount.bankName})` : "",
    Card: e.creditCard ? `${e.creditCard.cardName} ····${e.creditCard.lastFourDigits}` : "",
    Recurring: e.isRecurring ? "Yes" : "No",
    "Tax Deductible": e.isTaxDeductible ? "Yes" : "No",
    "Tax Section": e.taxSection ?? "",
    Notes: e.notes ?? "",
  }))

  const csv = Papa.unparse(rows)
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  })
}
