import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  PieChart, 
  ReceiptIndianRupee, 
  Sparkles,
  LogOut,
  Landmark
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/accounts", label: "Accounts", icon: Landmark },
    { href: "/dashboard/income", label: "Income", icon: Wallet },
    { href: "/dashboard/expenses", label: "Expenses", icon: CreditCard },
    { href: "/dashboard/investments", label: "Investments", icon: TrendingUp },
    { href: "/dashboard/subscriptions", label: "Subscriptions", icon: Sparkles },
    { href: "/dashboard/budgets", label: "Budgets", icon: PieChart },
    { href: "/dashboard/tax", label: "Tax Planning", icon: ReceiptIndianRupee },
  ]

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">PFMS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Personal Finance</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-3">
              {session.user?.name?.[0] || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{session.user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
            </div>
          </div>
          <form action={async () => {
            "use server"
            // We'll need a proper signout action or use the next-auth helper if available client-side
            // For now, redirect to login which handles signout flow usually or use a server action
             await import("@/auth").then(m => m.signOut())
          }}>
            <Button variant="outline" className="w-full justify-start" type="submit">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
