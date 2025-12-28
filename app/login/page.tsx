"use client"

import { useActionState, Suspense } from "react"
import { loginAction } from "@/app/actions/login"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Mail, Lock, Sparkles } from "lucide-react"

function LoginForm() {
  const [errorMessage, formAction, isPending] = useActionState(loginAction, undefined)
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm shadow-xl opacity-0 animate-scale-in">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="font-heading text-3xl font-semibold tracking-tight">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {registered && (
            <div className="flex items-center gap-2 p-3 text-sm text-success bg-success/10 border border-success/20 rounded-lg">
              <Sparkles className="w-4 h-4" />
              Account created successfully. Please sign in.
            </div>
          )}
          
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
          </div>
          
          {errorMessage && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
              {errorMessage}
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
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border/50 pt-6">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link 
            href="/register" 
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

function LoginFormSkeleton() {
  return (
    <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="space-y-1 pb-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-11 w-full" />
      </CardContent>
      <CardFooter className="justify-center border-t border-border/50 pt-6">
        <Skeleton className="h-5 w-48" />
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-50" />
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      
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
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </main>
      
      {/* Decorative footer line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  )
}
