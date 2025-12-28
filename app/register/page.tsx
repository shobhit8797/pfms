"use client"

import { useActionState } from "react"
import { registerAction } from "@/app/actions/register"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Mail, Lock, User, Sparkles } from "lucide-react"

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, undefined)

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-50" />
      <div className="absolute top-1/3 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -left-20 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      
      {/* Header */}
      <header className="relative z-10 p-6 flex items-center justify-between">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to home</span>
        </Link>
        <ThemeToggle />
      </header>
      
      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 pb-16">
        <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm shadow-xl opacity-0 animate-scale-in">
          <CardHeader className="space-y-1 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm text-primary font-medium">Free to get started</span>
            </div>
            <CardTitle className="font-heading text-3xl font-semibold tracking-tight">
              Create Account
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Start your journey to financial mastery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="John Doe" 
                    required 
                    className="pl-10 h-11 bg-background border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="name@example.com" 
                    required 
                    className="pl-10 h-11 bg-background border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    name="password" 
                    type="password" 
                    placeholder="••••••••"
                    required 
                    className="pl-10 h-11 bg-background border-border focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>
              
              {state?.error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                  {state.error}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium" 
                disabled={isPending}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                By creating an account, you agree to our{" "}
                <span className="text-foreground">Terms of Service</span> and{" "}
                <span className="text-foreground">Privacy Policy</span>
              </p>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-border/50 pt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link 
                href="/login" 
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
      
      {/* Decorative footer line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  )
}
