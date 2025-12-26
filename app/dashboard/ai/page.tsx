"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { askFinancialAdvisor, processAndAnalyzeStatement } from "@/app/actions/ai"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Send, Upload, FileText } from "lucide-react"
import { toast } from "sonner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function AIPage() {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<{role: "user" | "ai", content: string}[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    const userMsg = query
    setMessages(prev => [...prev, { role: "user", content: userMsg }])
    setQuery("")

    // In a real app, pass real context data here
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

  return (
    <div className="p-8 h-[calc(100vh-64px)] grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="flex flex-col h-full space-y-4">
         <Card className="flex-1 flex flex-col">
             <CardHeader>
                 <CardTitle>Financial Advisor</CardTitle>
             </CardHeader>
             <CardContent className="flex-1 flex flex-col overflow-hidden">
                 <ScrollArea className="flex-1 pr-4">
                     <div className="space-y-4">
                         {messages.length === 0 && (
                             <div className="text-center text-gray-500 mt-20">
                                 <p>Ask me anything about your finances!</p>
                                 <p className="text-sm">"How can I save tax?"</p>
                                 <p className="text-sm">"Analyze my spending habits"</p>
                             </div>
                         )}
                         {messages.map((m, i) => (
                             <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                 <div className={`max-w-[80%] p-3 rounded-lg ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                     {m.content}
                                 </div>
                             </div>
                         ))}
                         {loading && (
                             <div className="flex justify-start">
                                 <div className="bg-muted p-3 rounded-lg flex items-center">
                                     <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                     Thinking...
                                 </div>
                             </div>
                         )}
                     </div>
                 </ScrollArea>
                 <form onSubmit={handleAsk} className="mt-4 flex gap-2">
                     <Input 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type your question..."
                     />
                     <Button type="submit" disabled={loading}>
                         <Send className="w-4 h-4" />
                     </Button>
                 </form>
             </CardContent>
         </Card>
      </div>

      <div className="flex flex-col h-full space-y-4">
          <Card className="flex-1 flex flex-col">
              <CardHeader>
                  <CardTitle>Analyze Statement</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col overflow-hidden">
                  <div className="mb-4">
                      <div className="flex items-center gap-4">
                          <Button asChild variant="outline" className="w-full h-20 border-dashed">
                              <label className="cursor-pointer flex flex-col items-center justify-center">
                                  <Upload className="w-6 h-6 mb-2" />
                                  <span>{analyzing ? "Analyzing..." : "Upload PDF/CSV Statement"}</span>
                                  <input type="file" className="hidden" accept=".pdf,.csv" onChange={handleFileUpload} disabled={analyzing} />
                              </label>
                          </Button>
                      </div>
                  </div>

                  {transactions.length > 0 && (
                      <div className="flex-1 overflow-auto border rounded-md">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Description</TableHead>
                                      <TableHead>Amount</TableHead>
                                      <TableHead>Category</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {transactions.map((t, i) => (
                                      <TableRow key={i}>
                                          <TableCell>{t.date}</TableCell>
                                          <TableCell>{t.description}</TableCell>
                                          <TableCell className={t.amount < 0 ? "text-red-600" : "text-green-600"}>
                                              {t.amount}
                                          </TableCell>
                                          <TableCell>{t.category}</TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </div>
                  )}
                  
                   {transactions.length > 0 && (
                      <div className="mt-4">
                          <Button className="w-full">Import {transactions.length} Transactions</Button>
                      </div>
                   )}
              </CardContent>
          </Card>
      </div>
    </div>
  )
}
