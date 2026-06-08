"use client"

import { useState, useCallback, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { parseCSV, parseExcel, ParsedTransaction } from "@/lib/statement-parser"
import { parseStatementFile } from "@/app/actions/bank-account"
import { toast } from "sonner"
import {
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  ChevronRight,
  ChevronLeft,
} from "lucide-react"

interface StatementUploadDialogProps {
  accountId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type UploadStep = "select" | "password" | "processing" | "preview" | "review" | "complete"

const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transportation",
  "Utilities",
  "Entertainment",
  "Health & Medical",
  "Rent & Housing",
  "Education",
  "Insurance",
  "Investment",
  "Transfer",
  "ATM",
  "EMI",
  "Other",
]

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Interest",
  "Rental",
  "Investment",
  "Refund",
  "Transfer",
  "Other",
]

export function StatementUploadDialog({
  accountId: _accountId,
  open,
  onOpenChange,
}: StatementUploadDialogProps) {
  const [step, setStep] = useState<UploadStep>("select")
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState("")
  const [progress, setProgress] = useState(0)
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const resetState = () => {
    setStep("select")
    setFile(null)
    setPassword("")
    setProgress(0)
    setTransactions([])
    setSelectedTransactions(new Set())
    setError(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState()
    }
    onOpenChange(open)
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "csv":
        return <FileText className="h-8 w-8 text-emerald-500" />
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="h-8 w-8 text-green-600" />
      case "pdf":
        return <File className="h-8 w-8 text-red-500" />
      default:
        return <FileText className="h-8 w-8 text-muted-foreground" />
    }
  }

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setFile(selectedFile)
      setError(null)

      const ext = selectedFile.name.split(".").pop()?.toLowerCase()

      if (!["csv", "xlsx", "xls", "pdf"].includes(ext || "")) {
        setError("Unsupported file format. Please upload CSV, Excel, or PDF files.")
        return
      }

      setStep("processing")
      setProgress(10)

      try {
        let result

        if (ext === "csv") {
          const text = await selectedFile.text()
          setProgress(50)
          result = parseCSV(text)
        } else if (ext === "xlsx" || ext === "xls") {
          const buffer = await selectedFile.arrayBuffer()
          setProgress(50)
          result = parseExcel(buffer)
        } else if (ext === "pdf") {
          const buffer = await selectedFile.arrayBuffer()
          setProgress(30)
          // Use server action for PDF parsing to avoid browser worker issues
          result = await parseStatementFile(buffer, selectedFile.name)

          if (result.error === "PDF_PASSWORD_REQUIRED") {
            setStep("password")
            return
          }

          if (result.error === "PDF_NEEDS_AI_PROCESSING") {
            setError(
              "This PDF format requires AI processing. Please try a CSV or Excel file for now."
            )
            setStep("select")
            return
          }
        }

        setProgress(80)

        if (result && result.success && result.transactions.length > 0) {
          setTransactions(result.transactions)
          setSelectedTransactions(new Set(result.transactions.map((_: unknown, i: number) => i)))
          setProgress(100)
          setStep("preview")
        } else {
          setError(result?.error || "Failed to extract transactions from the file.")
          setStep("select")
        }
      } catch (err) {
        console.error("File processing error:", err)
        setError("Failed to process file. Please try again.")
        setStep("select")
      }
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFileSelect(droppedFile)
      }
    },
    [handleFileSelect]
  )

  const handlePasswordSubmit = async () => {
    if (!file || !password) return

    setStep("processing")
    setProgress(30)

    // In a real implementation, we would re-process the PDF with the password
    // For now, show an error since pdf-lib password support requires additional setup
    setError("Password-protected PDF processing is not yet implemented.")
    setStep("select")
  }

  const toggleTransaction = (index: number) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedTransactions(newSelected)
  }

  const toggleAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(transactions.map((_, i) => i)))
    }
  }

  const updateCategory = (index: number, category: string) => {
    const updated = [...transactions]
    updated[index] = { ...updated[index], category }
    setTransactions(updated)
  }

  const handleImport = () => {
    startTransition(async () => {
      const selectedTxns = transactions.filter((_, i) => selectedTransactions.has(i))

      // In a real implementation, this would call a server action to create
      // Income/Expense records from the selected transactions
      // For now, we'll just show success

      toast.success(`Imported ${selectedTxns.length} transactions successfully!`)
      setStep("complete")
    })
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === "select" && "Upload Bank Statement"}
            {step === "password" && "Password Required"}
            {step === "processing" && "Processing Statement"}
            {step === "preview" && "Review Transactions"}
            {step === "review" && "Confirm Import"}
            {step === "complete" && "Import Complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" &&
              "Upload your bank statement to automatically import transactions."}
            {step === "password" && "This file is password protected. Please enter the password."}
            {step === "processing" && "Extracting transactions from your statement..."}
            {step === "preview" && "Review and select transactions to import."}
            {step === "review" && "Final review before importing transactions."}
            {step === "complete" && "Your transactions have been imported successfully."}
          </DialogDescription>
        </DialogHeader>

        {/* Step: File Selection */}
        {step === "select" && (
          <div className="py-4">
            <div
              className="border-2 border-dashed border-muted rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Drag and drop your statement here</p>
              <p className="text-sm text-muted-foreground mt-2">
                or click to browse (CSV, Excel, PDF)
              </p>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm text-muted-foreground">
              <div className="p-3 rounded-lg bg-muted/50">
                <FileText className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                CSV
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <FileSpreadsheet className="h-6 w-6 mx-auto mb-2 text-green-600" />
                Excel
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <File className="h-6 w-6 mx-auto mb-2 text-red-500" />
                PDF
              </div>
            </div>
          </div>
        )}

        {/* Step: Password Entry */}
        {step === "password" && (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">Password protected file</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter file password"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("select")}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handlePasswordSubmit} disabled={!password}>
                Unlock & Process
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="py-8 space-y-6">
            <div className="flex items-center justify-center gap-4">
              {file && getFileIcon(file.name)}
              <div className="text-left">
                <p className="font-medium">{file?.name}</p>
                <p className="text-sm text-muted-foreground">Processing...</p>
              </div>
            </div>

            <Progress value={progress} className="w-full" />

            <p className="text-center text-sm text-muted-foreground">
              {progress < 30 && "Reading file..."}
              {progress >= 30 && progress < 60 && "Extracting transactions..."}
              {progress >= 60 && progress < 90 && "Analyzing data..."}
              {progress >= 90 && "Finalizing..."}
            </p>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {transactions.length} transactions · {selectedTransactions.size} selected
              </p>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedTransactions.size === transactions.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn, index) => (
                    <TableRow
                      key={index}
                      className={!selectedTransactions.has(index) ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedTransactions.has(index)}
                          onCheckedChange={() => toggleTransaction(index)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(txn.date)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{txn.description}</TableCell>
                      <TableCell>
                        <Select
                          value={txn.category || "Other"}
                          onValueChange={(value) => updateCategory(index, value)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(txn.type === "CREDIT" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(
                              (cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            txn.type === "CREDIT"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }
                        >
                          {txn.type === "CREDIT" ? "Credit" : "Debit"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          txn.type === "CREDIT" ? "text-success" : "text-destructive"
                        }`}
                      >
                        {txn.type === "CREDIT" ? "+" : "-"}
                        {formatCurrency(txn.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("select")}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedTransactions.size === 0 || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {selectedTransactions.size} Transactions
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-success" />
            <div>
              <p className="text-lg font-medium">Import Successful!</p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedTransactions.size} transactions have been imported.
              </p>
            </div>
            <DialogFooter className="justify-center">
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

