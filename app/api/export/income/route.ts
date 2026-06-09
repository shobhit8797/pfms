import Papa from "papaparse"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { format } from "date-fns"

export const runtime = "nodejs"

/** CSV export of the user's income (browser download, session-authenticated). */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const incomes = await prisma.income.findMany({
    where: { userId: session.user.id },
    orderBy: { incomeDate: "desc" },
    include: { bankAccount: { select: { accountName: true, bankName: true } } },
  })

  const rows = incomes.map((i) => ({
    Date: format(new Date(i.incomeDate), "yyyy-MM-dd"),
    Source: i.source,
    Category: i.category,
    Type: i.type,
    Amount: Number(i.amount),
    Account: i.bankAccount ? `${i.bankAccount.accountName} (${i.bankAccount.bankName})` : "",
    Recurring: i.isRecurring ? "Yes" : "No",
    Frequency: i.frequency ?? "",
    Taxable: i.isTaxable ? "Yes" : "No",
    Notes: i.notes ?? "",
  }))

  const csv = Papa.unparse(rows)
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="income-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  })
}
