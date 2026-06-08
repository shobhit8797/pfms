import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { calculateTax } from "@/app/actions/tax"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ReceiptIndianRupee, TrendingUp, CheckCircle, AlertCircle } from "lucide-react"
import { serializeDecimals } from "@/lib/utils"

export default async function TaxPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const taxDataRaw = await calculateTax()

  // Serialize Decimal fields for Client Components
  const taxData = serializeDecimals(taxDataRaw)

  if (!taxData) {
    return (
      <div className="p-6 md:p-8">
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <ReceiptIndianRupee className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Loading tax data...</p>
          </div>
        </div>
      </div>
    )
  }

  const betterRegime = taxData.newRegime.totalTax < taxData.oldRegime.totalTax ? "New Regime" : "Old Regime"
  const savings = Math.abs(taxData.newRegime.totalTax - taxData.oldRegime.totalTax)

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`
    }
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">
          Tax Planning
        </h1>
        <p className="text-muted-foreground mt-1">
          FY 2024-25 | Optimize your tax liability
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                Recommended
              </Badge>
            </div>
            <CardTitle className="font-heading text-xl">{betterRegime}</CardTitle>
            <CardDescription>Based on your current income and deductions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-4xl font-semibold text-gold-gradient">
              Save {formatCurrency(savings)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              by choosing the {betterRegime}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <ReceiptIndianRupee className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            <CardTitle className="font-heading text-xl">Gross Income</CardTitle>
            <CardDescription>Total taxable income calculated</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-4xl font-semibold">
              {formatCurrency(taxData.grossIncome)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              For the financial year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Regime Comparison */}
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1">
          <TabsTrigger value="comparison" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Regime Comparison
          </TabsTrigger>
          <TabsTrigger value="deductions" className="data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Deductions (Old Regime)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="comparison" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className={`bg-card border-border ${betterRegime === "Old Regime" ? "ring-2 ring-primary/30" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-heading text-xl">Old Regime</CardTitle>
                    <CardDescription>With Exemptions & Deductions</CardDescription>
                  </div>
                  {betterRegime === "Old Regime" && (
                    <Badge className="bg-primary/10 text-primary border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Better
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Taxable Income</span>
                  <span className="font-mono font-semibold">{formatCurrency(taxData.oldRegime.taxableIncome)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Tax Payable</span>
                  <span className="font-mono">{formatCurrency(taxData.oldRegime.taxPayable)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Cess (4%)</span>
                  <span className="font-mono">{formatCurrency(taxData.oldRegime.cess)}</span>
                </div>
                <div className="flex justify-between py-3 bg-muted/30 rounded-lg px-3 -mx-3">
                  <span className="font-semibold">Total Tax</span>
                  <span className="font-heading text-xl font-semibold">{formatCurrency(taxData.oldRegime.totalTax)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-card border-border ${betterRegime === "New Regime" ? "ring-2 ring-primary/30" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-heading text-xl">New Regime</CardTitle>
                    <CardDescription>Lower Rates, No Deductions</CardDescription>
                  </div>
                  {betterRegime === "New Regime" && (
                    <Badge className="bg-primary/10 text-primary border-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Better
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Taxable Income</span>
                  <span className="font-mono font-semibold">{formatCurrency(taxData.newRegime.taxableIncome)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Tax Payable</span>
                  <span className="font-mono">{formatCurrency(taxData.newRegime.taxPayable)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Cess (4%)</span>
                  <span className="font-mono">{formatCurrency(taxData.newRegime.cess)}</span>
                </div>
                <div className="flex justify-between py-3 bg-muted/30 rounded-lg px-3 -mx-3">
                  <span className="font-semibold">Total Tax</span>
                  <span className="font-heading text-xl font-semibold">{formatCurrency(taxData.newRegime.totalTax)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="deductions" className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Deduction Utilization</CardTitle>
              <CardDescription>Tracking for Old Regime tax optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Section 80C</span>
                    <Badge variant="outline" className="text-xs">Limit: ₹1.5L</Badge>
                  </div>
                  <span className="font-mono text-sm">
                    {formatCurrency(taxData.oldRegime.deductions.section80C)} / ₹1,50,000
                  </span>
                </div>
                <Progress value={(taxData.oldRegime.deductions.section80C / 150000) * 100} className="h-3" />
                {taxData.oldRegime.deductions.section80C < 150000 && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Unused: {formatCurrency(150000 - taxData.oldRegime.deductions.section80C)}
                  </p>
                )}
              </div>
              
              <div>
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Section 80D</span>
                    <Badge variant="outline" className="text-xs">Health Insurance</Badge>
                  </div>
                  <span className="font-mono text-sm">
                    {formatCurrency(taxData.oldRegime.deductions.section80D)} / ₹25,000
                  </span>
                </div>
                <Progress value={(taxData.oldRegime.deductions.section80D / 25000) * 100} className="h-3" />
                {taxData.oldRegime.deductions.section80D < 25000 && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Unused: {formatCurrency(25000 - taxData.oldRegime.deductions.section80D)}
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Section 80CCD(1B)</span>
                    <Badge variant="outline" className="text-xs">NPS</Badge>
                  </div>
                  <span className="font-mono text-sm">
                    {formatCurrency(taxData.oldRegime.deductions.section80CCD)} / ₹50,000
                  </span>
                </div>
                <Progress value={(taxData.oldRegime.deductions.section80CCD / 50000) * 100} className="h-3" />
                {taxData.oldRegime.deductions.section80CCD < 50000 && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Unused: {formatCurrency(50000 - taxData.oldRegime.deductions.section80CCD)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
