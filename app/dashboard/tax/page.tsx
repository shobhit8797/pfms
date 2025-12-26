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

export default async function TaxPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const taxData = await calculateTax()

  if (!taxData) return <div>Loading...</div>

  const betterRegime = taxData.newRegime.totalTax < taxData.oldRegime.totalTax ? "New Regime" : "Old Regime"
  const savings = Math.abs(taxData.newRegime.totalTax - taxData.oldRegime.totalTax)

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Tax Planning (FY 2024-25)</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-900 border-blue-200">
          <CardHeader>
            <CardTitle>Recommended: {betterRegime}</CardTitle>
            <CardDescription>Based on your current data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
              Save ₹{savings.toFixed(0)}
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
              by choosing the {betterRegime}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle>Gross Income</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-3xl font-bold">₹{taxData.grossIncome.toFixed(0)}</div>
             <p className="text-sm text-gray-500 mt-2">Total taxable income calculated</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comparison">Regime Comparison</TabsTrigger>
          <TabsTrigger value="deductions">Deductions (Old Regime)</TabsTrigger>
        </TabsList>
        <TabsContent value="comparison">
          <div className="grid gap-4 md:grid-cols-2 mt-4">
             <Card>
               <CardHeader>
                 <CardTitle>Old Regime</CardTitle>
                 <CardDescription>With Exemptions & Deductions</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex justify-between">
                   <span>Taxable Income</span>
                   <span className="font-bold">₹{taxData.oldRegime.taxableIncome.toFixed(0)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Tax Payable</span>
                   <span>₹{taxData.oldRegime.taxPayable.toFixed(0)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Cess (4%)</span>
                   <span>₹{taxData.oldRegime.cess.toFixed(0)}</span>
                 </div>
                 <div className="border-t pt-2 flex justify-between text-lg font-bold">
                   <span>Total Tax</span>
                   <span>₹{taxData.oldRegime.totalTax.toFixed(0)}</span>
                 </div>
               </CardContent>
             </Card>

             <Card>
               <CardHeader>
                 <CardTitle>New Regime</CardTitle>
                 <CardDescription>Lower Rates, No Deductions</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex justify-between">
                   <span>Taxable Income</span>
                   <span className="font-bold">₹{taxData.newRegime.taxableIncome.toFixed(0)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Tax Payable</span>
                   <span>₹{taxData.newRegime.taxPayable.toFixed(0)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Cess (4%)</span>
                   <span>₹{taxData.newRegime.cess.toFixed(0)}</span>
                 </div>
                 <div className="border-t pt-2 flex justify-between text-lg font-bold">
                   <span>Total Tax</span>
                   <span>₹{taxData.newRegime.totalTax.toFixed(0)}</span>
                 </div>
               </CardContent>
             </Card>
          </div>
        </TabsContent>
        <TabsContent value="deductions">
          <Card className="mt-4">
             <CardHeader>
                <CardTitle>Deduction Utilization</CardTitle>
                <CardDescription>Tracking for Old Regime optimization</CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">80C (Limit: 1.5L)</span>
                    <span>₹{taxData.oldRegime.deductions.section80C.toFixed(0)} / 1,50,000</span>
                  </div>
                  <Progress value={(taxData.oldRegime.deductions.section80C / 150000) * 100} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">80D (Health Insurance)</span>
                    <span>₹{taxData.oldRegime.deductions.section80D.toFixed(0)} / 25,000</span>
                  </div>
                  <Progress value={(taxData.oldRegime.deductions.section80D / 25000) * 100} />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">80CCD(1B) (NPS)</span>
                    <span>₹{taxData.oldRegime.deductions.section80CCD.toFixed(0)} / 50,000</span>
                  </div>
                  <Progress value={(taxData.oldRegime.deductions.section80CCD / 50000) * 100} />
                </div>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
