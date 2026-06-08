import Papa from "papaparse"
import { requireApiUser } from "@/lib/api-auth"
import { ServiceError, statusForCode } from "@/lib/errors"
import { listTransactions } from "@/lib/services/transaction.service"
import { format } from "date-fns"

export const runtime = "nodejs"

/**
 * CSV export of the ledger in the spreadsheet's column order
 * (Date, Description, Category, Amount, Payment Mode, Type, Notes).
 * Authenticated via session cookie (browser download) or bearer token (iOS).
 */
export async function GET(request: Request) {
  try {
    const userId = await requireApiUser(request)
    const { items } = await listTransactions(userId, {}, 10000, 0)

    const rows = items.map((t) => ({
      Date: format(new Date(t.date), "yyyy-MM-dd"),
      Description: t.description,
      Category: t.category?.name ?? "",
      Amount: Number(t.amount),
      "Payment Mode": t.paymentMode?.name ?? "",
      Type: t.type,
      Notes: t.notes ?? "",
    }))

    const csv = Papa.unparse(rows)
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions-${format(new Date(), "yyyy-MM-dd")}.csv"`,
      },
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: statusForCode(error.code),
        headers: { "Content-Type": "application/json" },
      })
    }
    return new Response(JSON.stringify({ error: "Export failed" }), { status: 500 })
  }
}
