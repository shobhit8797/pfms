import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getInvestments } from "@/app/actions/investment"
import { AddInvestmentDialog } from "@/components/investments/add-investment-dialog"
import { PortfolioChart } from "@/components/investments/portfolio-chart"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default async function InvestmentsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const investments = await getInvestments()

  // Calculate totals
  const totalInvested = investments.reduce((acc, inv) => acc + (Number(inv.purchasePrice) * Number(inv.quantity)), 0)
  const currentTotalValue = investments.reduce((acc, inv) => acc + (Number(inv.currentValue) || (Number(inv.purchasePrice) * Number(inv.quantity))), 0)
  const totalGain = currentTotalValue - totalInvested
  const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  // Prepare chart data (Group by Asset Class)
  const allocationMap = new Map<string, number>()
  investments.forEach(inv => {
    const value = Number(inv.currentValue) || (Number(inv.purchasePrice) * Number(inv.quantity))
    allocationMap.set(inv.assetClass, (allocationMap.get(inv.assetClass) || 0) + value)
  })
  
  const chartData = Array.from(allocationMap.entries()).map(([name, value]) => ({
    name: name.replace("_", " "),
    value
  }))

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Investments</h1>
        <AddInvestmentDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalInvested.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{currentTotalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalGain >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalGain >= 0 ? "+" : ""}₹{totalGain.toFixed(2)}
              <span className="text-xs text-gray-500 ml-2">
                ({totalGainPercent.toFixed(2)}%)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Your Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Avg. Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {investments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                      No investments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  investments.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.assetName}</TableCell>
                      <TableCell><Badge variant="outline">{inv.assetClass.replace("_", " ")}</Badge></TableCell>
                      <TableCell className="text-right">{Number(inv.quantity)}</TableCell>
                      <TableCell className="text-right">₹{Number(inv.purchasePrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{(Number(inv.currentValue) || Number(inv.purchasePrice) * Number(inv.quantity)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <PortfolioChart data={chartData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
