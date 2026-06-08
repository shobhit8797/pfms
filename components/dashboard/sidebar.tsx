"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  PieChart, 
  ReceiptIndianRupee, 
  Sparkles,
  LogOut,
  Landmark,
  PiggyBank
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
  } | undefined
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/accounts", label: "Accounts", icon: Landmark },
  { href: "/dashboard/income", label: "Income", icon: Wallet },
  { href: "/dashboard/expenses", label: "Expenses", icon: CreditCard },
  { href: "/dashboard/budget", label: "50:30:20", icon: PiggyBank },
  { href: "/dashboard/investments", label: "Investments", icon: TrendingUp },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: Sparkles },
  { href: "/dashboard/budgets", label: "Budgets", icon: PieChart },
  { href: "/dashboard/tax", label: "Tax Planning", icon: ReceiptIndianRupee },
]

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 hidden md:flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-heading font-bold text-xl">P</span>
          </div>
          <div>
            <h1 className="font-heading text-xl font-semibold tracking-tight">PFMS</h1>
            <p className="text-xs text-sidebar-foreground/60">Personal Finance</p>
          </div>
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/50"
              )} />
              <span>{item.label}</span>
            </Link>
          )
        })}
        
        {/* AI Advisor - Special styling */}
        <Link
          href="/dashboard/ai"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 mt-4 border",
            pathname === "/dashboard/ai"
              ? "bg-primary/10 text-primary border-primary/30"
              : "text-primary/80 border-primary/20 hover:bg-primary/5 hover:border-primary/30"
          )}
        >
          <Sparkles className="w-5 h-5" />
          <span>AI Advisor</span>
          <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/20 text-primary">
            NEW
          </span>
        </Link>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-heading font-semibold text-lg ring-1 ring-primary/20">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
          <ThemeToggle />
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}









