import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getInvestments } from "@/app/actions/investment"
import { AddInvestmentDialog } from "@/components/investments/add-investment-dialog"
import { PortfolioChart } from "@/components/investments/portfolio-chart"
import {
  Card,
  CardContent,
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
import { TrendingUp, TrendingDown, Wallet, PieChart } from "lucide-react"

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

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`
    }
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
            Investments
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your portfolio and asset allocation
          </p>
        </div>
        <AddInvestmentDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invested
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Wallet className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-semibold">{formatCurrency(totalInvested)}</p>
            <p className="text-xs text-muted-foreground mt-1">{investments.length} investments</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Value
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <PieChart className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-2xl font-semibold text-gold-gradient">{formatCurrency(currentTotalValue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Portfolio value</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Returns
            </CardTitle>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${totalGain >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
              {totalGain >= 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <p className={`font-heading text-2xl font-semibold ${totalGain >= 0 ? "text-success" : "text-destructive"}`}>
                {totalGain >= 0 ? "+" : ""}{formatCurrency(Math.abs(totalGain))}
              </p>
              <Badge 
                variant="secondary" 
                className={`${totalGain >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"} border-0`}
              >
                {totalGain >= 0 ? "+" : ""}{totalGainPercent.toFixed(2)}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overall returns</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Table and Chart */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card border-border overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="font-heading text-lg font-semibold">Your Portfolio</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Asset</TableHead>
                  <TableHead className="text-muted-foreground">Class</TableHead>
                  <TableHead className="text-right text-muted-foreground">Qty</TableHead>
                  <TableHead className="text-right text-muted-foreground">Avg. Price</TableHead>
                  <TableHead className="text-right text-muted-foreground">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-muted-foreground/50" />
                        <p>No investments found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  investments.map((inv) => {
                    const value = Number(inv.currentValue) || Number(inv.purchasePrice) * Number(inv.quantity)
                    const invested = Number(inv.purchasePrice) * Number(inv.quantity)
                    const gain = value - invested
                    
                    return (
                      <TableRow key={inv.id} className="border-border hover:bg-muted/30">
                        <TableCell className="font-medium">{inv.assetName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {inv.assetClass.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{Number(inv.quantity)}</TableCell>
                        <TableCell className="text-right font-mono">₹{Number(inv.purchasePrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-semibold">₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            <span className={`text-xs ${gain >= 0 ? "text-success" : "text-destructive"}`}>
                              {gain >= 0 ? "+" : ""}{gain.toFixed(0)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 bg-card border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg font-semibold">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <PortfolioChart data={chartData} />
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <p>No data to display</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
