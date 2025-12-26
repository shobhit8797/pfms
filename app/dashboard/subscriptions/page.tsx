import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getSubscriptions, cancelSubscription } from "@/app/actions/subscription"
import { AddSubscriptionDialog } from "@/components/subscriptions/add-subscription-dialog"
import { format, differenceInDays } from "date-fns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"

export default async function SubscriptionsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const subscriptions = await getSubscriptions()

  // Calculate monthly burn
  const monthlyBurn = subscriptions.reduce((acc, sub) => {
    let monthlyAmount = Number(sub.amount)
    if (sub.billingCycle === "YEARLY") monthlyAmount /= 12
    if (sub.billingCycle === "QUARTERLY") monthlyAmount /= 3
    return acc + monthlyAmount
  }, 0)

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <AddSubscriptionDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Burn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{monthlyBurn.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Renewals</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">
                {subscriptions.filter(s => differenceInDays(s.nextBillingDate, new Date()) <= 7).length}
             </div>
             <p className="text-xs text-muted-foreground">in next 7 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subscriptions.map((sub) => (
          <Card key={sub.id} className="relative">
             <CardHeader className="pb-2">
               <div className="flex justify-between items-start">
                 <CardTitle className="text-lg">{sub.serviceName}</CardTitle>
                 <Badge variant="secondary">{sub.category}</Badge>
               </div>
             </CardHeader>
             <CardContent>
               <div className="text-3xl font-bold mb-4">
                 ₹{Number(sub.amount).toFixed(2)}
                 <span className="text-sm font-normal text-gray-500 ml-1">/{sub.billingCycle.toLowerCase()}</span>
               </div>
               
               <div className="space-y-2 text-sm">
                 <div className="flex justify-between">
                   <span className="text-gray-500">Next billing</span>
                   <span className="font-medium">{format(sub.nextBillingDate, "MMM d, yyyy")}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-500">Payment</span>
                   <span className="font-medium">{sub.paymentMethod}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-500">Status</span>
                   <Badge variant={sub.isActive ? "default" : "destructive"} className="h-5">
                     {sub.isActive ? "Active" : "Inactive"}
                   </Badge>
                 </div>
               </div>
               
               <form action={async () => {
                 "use server"
                 await cancelSubscription(sub.id)
               }}>
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Subscription
                 </Button>
               </form>
             </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
