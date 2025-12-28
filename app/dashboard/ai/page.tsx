"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { askFinancialAdvisor, processAndAnalyzeStatement } from "@/app/actions/ai"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Upload, FileText, Sparkles, Bot, User } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function AIPage() {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<{role: "user" | "ai", content: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [transactions, setTransactions] = useState<{date: string, description: string, amount: number, category: string}[]>([])

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    const userMsg = query
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    setQuery("")

    const contextData = { netWorth: 500000, monthlyExpense: 20000 } 
    
    const result = await askFinancialAdvisor(userMsg, contextData)
    
    if (result.success) {
      setMessages(prev => [...prev, { role: "ai", content: result.success! }])
    } else {
      toast.error(result.error)
    }
    setLoading(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return
    
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append("file", file)

    setAnalyzing(true)
    const result = await processAndAnalyzeStatement(formData)
    
    if (result.success) {
      setTransactions(result.success)
      toast.success(`Found ${result.success.length} transactions`)
    } else {
      toast.error(result.error)
    }
    setAnalyzing(false)
  }

  const suggestedQuestions = [
    "How can I save more tax?",
    "Analyze my spending habits",
    "What investments should I consider?",
    "How to build an emergency fund?"
  ]

  return (
    <div className="p-6 md:p-8 h-[calc(100vh-4rem)] flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold tracking-tight">
              AI Financial Advisor
            </h1>
            <p className="text-muted-foreground text-sm">
              Get personalized financial insights and analysis
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Chat Section */}
        <Card className="flex flex-col bg-card border-border overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/30 py-4">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <CardTitle className="font-heading text-lg font-semibold">Financial Chat</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground mb-4">Ask me anything about your finances!</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {suggestedQuestions.map((q) => (
                        <Button
                          key={q}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => setQuery(q)}
                        >
                          {q}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div 
                    key={i} 
                    className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      m.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    }`}>
                      {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                      m.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted"
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-muted p-3 rounded-xl flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <form onSubmit={handleAsk} className="p-4 border-t border-border bg-muted/20">
              <div className="flex gap-2">
                <Input 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about your finances..."
                  className="bg-background"
                />
                <Button type="submit" disabled={loading} size="icon" className="shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Statement Analyzer */}
        <Card className="flex flex-col bg-card border-border overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/30 py-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle className="font-heading text-lg font-semibold">Statement Analyzer</CardTitle>
            </div>
            <CardDescription>Upload bank statements for automatic categorization</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
            {/* Upload Area */}
            <div className="mb-4">
              <Button asChild variant="outline" className="w-full h-24 border-dashed border-2 hover:bg-muted/50">
                <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
                  {analyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-sm">Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Upload PDF or CSV Statement
                      </span>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.csv" 
                    onChange={handleFileUpload} 
                    disabled={analyzing} 
                  />
                </label>
              </Button>
            </div>

            {/* Transactions Table */}
            {transactions.length > 0 ? (
              <div className="flex-1 overflow-auto border border-border rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Description</TableHead>
                      <TableHead className="text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-muted-foreground">Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t, i) => (
                      <TableRow key={i} className="border-border hover:bg-muted/30">
                        <TableCell className="font-mono text-sm">{t.date}</TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">{t.description}</TableCell>
                        <TableCell className={`font-mono font-medium ${t.amount < 0 ? "text-destructive" : "text-success"}`}>
                          {t.amount < 0 ? "-" : "+"}₹{Math.abs(t.amount).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {t.category}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-xl bg-muted/20">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No transactions analyzed yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Upload a statement to get started</p>
                </div>
              </div>
            )}
            
            {transactions.length > 0 && (
              <div className="mt-4">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Import {transactions.length} Transactions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
