import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  Wallet, 
  TrendingUp, 
  PieChart, 
  Shield, 
  Sparkles,
  ArrowRight,
  ReceiptIndianRupee
} from "lucide-react"

export default function Home() {
  const features = [
    {
      icon: Wallet,
      title: "Track Every Rupee",
      description: "Monitor income, expenses, and cash flow with precision and clarity."
    },
    {
      icon: TrendingUp,
      title: "Investment Portfolio",
      description: "Track stocks, mutual funds, and other investments in one unified view."
    },
    {
      icon: PieChart,
      title: "Smart Budgeting",
      description: "Set budgets by category and receive insights on your spending patterns."
    },
    {
      icon: ReceiptIndianRupee,
      title: "Tax Planning",
      description: "Optimize deductions under 80C, 80D and more with intelligent suggestions."
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your financial data stays private with bank-grade encryption."
    },
    {
      icon: Sparkles,
      title: "AI Advisor",
      description: "Get personalized financial advice powered by advanced AI."
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold text-lg">P</span>
            </div>
            <span className="font-heading text-xl font-semibold tracking-tight">PFMS</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        {/* Background mesh gradient */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-60" />
        
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
        
        <div className="container relative mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-8 opacity-0 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">India-focused financial management</span>
          </div>
          
          {/* Main heading */}
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-6 opacity-0 animate-fade-in-up delay-100">
            Personal Finance
            <br />
            <span className="text-gold-gradient">Mastered</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 opacity-0 animate-fade-in-up delay-200">
            Track your income, expenses, investments, and taxes in one elegant platform. 
            Built for the discerning individual who values clarity and control.
          </p>
          
          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up delay-300">
            <Link href="/register">
              <Button size="lg" className="text-base px-8 py-6 bg-primary hover:bg-primary/90 group">
                Start Your Journey
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-base px-8 py-6 border-border hover:bg-accent">
                Sign In
              </Button>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-border/50 opacity-0 animate-fade-in-up delay-400">
            <p className="text-sm text-muted-foreground mb-4">Trusted by individuals managing</p>
            <div className="flex items-center justify-center gap-8 md:gap-16">
              <div className="text-center">
                <p className="font-heading text-3xl font-semibold text-foreground">₹10L+</p>
                <p className="text-xs text-muted-foreground">Assets Tracked</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="font-heading text-3xl font-semibold text-foreground">100%</p>
                <p className="text-xs text-muted-foreground">Data Privacy</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="font-heading text-3xl font-semibold text-foreground">24/7</p>
                <p className="text-xs text-muted-foreground">AI Assistance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32 bg-card/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 opacity-0 animate-fade-in-up">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A comprehensive suite of tools designed to give you complete control over your financial life.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl border border-border bg-card hover:border-primary/30 transition-all duration-300 card-hover opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-gradient opacity-40" />
        
        <div className="container relative mx-auto px-6 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mb-4 opacity-0 animate-fade-in-up">
            Ready to Take Control?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8 opacity-0 animate-fade-in-up delay-100">
            Join thousands of Indians who have transformed their financial lives with PFMS.
          </p>
          <Link href="/register" className="opacity-0 animate-fade-in-up delay-200 inline-block">
            <Button size="lg" className="text-base px-10 py-6 bg-primary hover:bg-primary/90 group">
              Create Free Account
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-heading font-bold text-sm">P</span>
              </div>
              <span className="font-heading text-sm font-medium">PFMS</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with Next.js, Prisma & Tailwind CSS
            </p>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Personal Finance Management System
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
