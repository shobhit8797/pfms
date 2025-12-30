import Papa from "papaparse"
import * as XLSX from "xlsx"

// ============================================================================
// Types
// ============================================================================

export type ParsedTransaction = {
  date: Date
  description: string
  amount: number
  type: "CREDIT" | "DEBIT"
  balance?: number
  referenceNumber?: string
  category?: string
}

export type StatementParseResult = {
  success: boolean
  transactions: ParsedTransaction[]
  startDate?: Date
  endDate?: Date
  openingBalance?: number
  closingBalance?: number
  error?: string
}

export type BankFormat = {
  name: string
  dateColumns: string[]
  descriptionColumns: string[]
  debitColumns: string[]
  creditColumns: string[]
  balanceColumns: string[]
  referenceColumns: string[]
  dateFormat?: string
}

// ============================================================================
// Bank Format Definitions
// ============================================================================

const BANK_FORMATS: Record<string, BankFormat> = {
  HDFC: {
    name: "HDFC Bank",
    dateColumns: ["Date", "Transaction Date", "Value Date", "Txn Date"],
    descriptionColumns: ["Description", "Narration", "Particulars", "Transaction Remarks"],
    debitColumns: ["Debit", "Debit Amount", "Withdrawal", "Dr Amount"],
    creditColumns: ["Credit", "Credit Amount", "Deposit", "Cr Amount"],
    balanceColumns: ["Balance", "Closing Balance", "Available Balance"],
    referenceColumns: ["Reference No", "Ref No", "Chq No", "Transaction ID"],
    dateFormat: "DD/MM/YYYY",
  },
  ICICI: {
    name: "ICICI Bank",
    dateColumns: ["Transaction Date", "Value Date", "Date"],
    descriptionColumns: ["Transaction Remarks", "Particulars", "Description"],
    debitColumns: ["Withdrawal Amount", "Debit", "Dr"],
    creditColumns: ["Deposit Amount", "Credit", "Cr"],
    balanceColumns: ["Balance", "Closing Balance"],
    referenceColumns: ["Cheque No", "Reference No"],
    dateFormat: "DD-MM-YYYY",
  },
  SBI: {
    name: "State Bank of India",
    dateColumns: ["Txn Date", "Value Date", "Date"],
    descriptionColumns: ["Description", "Narration"],
    debitColumns: ["Debit", "Withdrawal"],
    creditColumns: ["Credit", "Deposit"],
    balanceColumns: ["Balance"],
    referenceColumns: ["Ref No", "Reference"],
    dateFormat: "DD MMM YYYY",
  },
  AXIS: {
    name: "Axis Bank",
    dateColumns: ["Tran Date", "Value Date", "Date"],
    descriptionColumns: ["Particulars", "Description"],
    debitColumns: ["Debit", "Dr"],
    creditColumns: ["Credit", "Cr"],
    balanceColumns: ["Balance", "Bal"],
    referenceColumns: ["Chq No", "Ref No"],
    dateFormat: "DD-MM-YYYY",
  },
  KOTAK: {
    name: "Kotak Mahindra Bank",
    dateColumns: ["Date", "Transaction Date"],
    descriptionColumns: ["Description", "Narration"],
    debitColumns: ["Debit", "Dr"],
    creditColumns: ["Credit", "Cr"],
    balanceColumns: ["Balance"],
    referenceColumns: ["Reference"],
    dateFormat: "DD/MM/YYYY",
  },
  GENERIC: {
    name: "Generic Format",
    dateColumns: ["Date", "Transaction Date", "Txn Date", "Value Date"],
    descriptionColumns: ["Description", "Narration", "Particulars", "Details", "Remarks"],
    debitColumns: ["Debit", "Withdrawal", "Dr", "Debit Amount", "Out"],
    creditColumns: ["Credit", "Deposit", "Cr", "Credit Amount", "In"],
    balanceColumns: ["Balance", "Closing Balance", "Running Balance", "Bal"],
    referenceColumns: ["Reference", "Ref", "Ref No", "Reference No", "Chq No"],
  },
}

// ============================================================================
// CSV Parser
// ============================================================================

export function parseCSV(content: string): StatementParseResult {
  try {
    const result = Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    })

    if (result.errors.length > 0 && result.data.length === 0) {
      return {
        success: false,
        transactions: [],
        error: `CSV parsing error: ${result.errors[0].message}`,
      }
    }

    const headers = result.meta.fields || []
    const bankFormat = detectBankFormat(headers)
    const transactions = extractTransactions(result.data as Record<string, string>[], bankFormat)

    if (transactions.length === 0) {
      return {
        success: false,
        transactions: [],
        error: "No transactions found in the file",
      }
    }

    // Sort by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

    return {
      success: true,
      transactions,
      startDate: transactions[0]?.date,
      endDate: transactions[transactions.length - 1]?.date,
      openingBalance: transactions[0]?.balance,
      closingBalance: transactions[transactions.length - 1]?.balance,
    }
  } catch (error) {
    return {
      success: false,
      transactions: [],
      error: `Failed to parse CSV: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// Excel Parser
// ============================================================================

export function parseExcel(buffer: ArrayBuffer): StatementParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    // Convert to JSON with headers
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      raw: false,
      dateNF: "yyyy-mm-dd",
    })

    if (data.length === 0) {
      return {
        success: false,
        transactions: [],
        error: "No data found in the Excel file",
      }
    }

    const headers = Object.keys(data[0])
    const bankFormat = detectBankFormat(headers)

    // Convert to string records for compatibility
    const stringData = data.map((row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? "")]))
    )

    const transactions = extractTransactions(stringData, bankFormat)

    if (transactions.length === 0) {
      return {
        success: false,
        transactions: [],
        error: "No transactions found in the file",
      }
    }

    transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

    return {
      success: true,
      transactions,
      startDate: transactions[0]?.date,
      endDate: transactions[transactions.length - 1]?.date,
      openingBalance: transactions[0]?.balance,
      closingBalance: transactions[transactions.length - 1]?.balance,
    }
  } catch (error) {
    return {
      success: false,
      transactions: [],
      error: `Failed to parse Excel: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

// ============================================================================
// PDF Parser (Basic - requires AI for complex statements)
// ============================================================================

export async function parsePDF(buffer: Buffer): Promise<StatementParseResult> {
  try {
    // Dynamic import for pdf-parse
    const { PDFParse } = await import("pdf-parse")
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const textResult = await parser.getText()

    const text = textResult.text

    // Try to extract transactions using regex patterns
    const transactions = extractTransactionsFromText(text)

    if (transactions.length === 0) {
      // Return raw text for AI processing
      return {
        success: false,
        transactions: [],
        error: "PDF_NEEDS_AI_PROCESSING",
      }
    }

    transactions.sort((a, b) => a.date.getTime() - b.date.getTime())

    return {
      success: true,
      transactions,
      startDate: transactions[0]?.date,
      endDate: transactions[transactions.length - 1]?.date,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    // Check if password protected
    if (errorMessage.includes("password") || errorMessage.includes("encrypted")) {
      return {
        success: false,
        transactions: [],
        error: "PDF_PASSWORD_REQUIRED",
      }
    }

    return {
      success: false,
      transactions: [],
      error: `Failed to parse PDF: ${errorMessage}`,
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function detectBankFormat(headers: string[]): BankFormat {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim())

  // Check each bank format
  for (const [, format] of Object.entries(BANK_FORMATS)) {
    const formatColumns = [
      ...format.dateColumns,
      ...format.descriptionColumns,
      ...format.debitColumns,
      ...format.creditColumns,
    ].map((c) => c.toLowerCase())

    const matchCount = normalizedHeaders.filter((h) =>
      formatColumns.some((fc) => h.includes(fc) || fc.includes(h))
    ).length

    if (matchCount >= 3) {
      return format
    }
  }

  return BANK_FORMATS.GENERIC
}

function findColumn(row: Record<string, string>, possibleNames: string[]): string | undefined {
  const keys = Object.keys(row)
  for (const name of possibleNames) {
    const found = keys.find(
      (k) => k.toLowerCase().trim() === name.toLowerCase() || k.toLowerCase().includes(name.toLowerCase())
    )
    if (found && row[found]?.trim()) {
      return row[found].trim()
    }
  }
  return undefined
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null

  const cleanStr = dateStr.trim()

  // Try ISO format first
  const isoDate = new Date(cleanStr)
  if (!isNaN(isoDate.getTime())) {
    return isoDate
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const match1 = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (match1) {
    const [, day, month, year] = match1
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  // Try DD MMM YYYY
  const match2 = cleanStr.match(/^(\d{1,2})\s+(\w{3,})\s+(\d{4})$/i)
  if (match2) {
    const [, day, monthStr, year] = match2
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    }
    const month = months[monthStr.toLowerCase().substring(0, 3)]
    if (month !== undefined) {
      return new Date(parseInt(year), month, parseInt(day))
    }
  }

  return null
}

function parseAmount(amountStr: string): number {
  if (!amountStr) return 0

  // Remove currency symbols, commas, and spaces
  const cleaned = amountStr
    .replace(/[₹$€£,\s]/g, "")
    .replace(/\(([^)]+)\)/, "-$1") // Handle (amount) as negative
    .trim()

  const amount = parseFloat(cleaned)
  return isNaN(amount) ? 0 : Math.abs(amount)
}

function extractTransactions(
  data: Record<string, string>[],
  format: BankFormat
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  for (const row of data) {
    const dateStr = findColumn(row, format.dateColumns)
    const date = dateStr ? parseDate(dateStr) : null

    if (!date) continue // Skip rows without valid date

    const description = findColumn(row, format.descriptionColumns) || ""
    const debitStr = findColumn(row, format.debitColumns)
    const creditStr = findColumn(row, format.creditColumns)
    const balanceStr = findColumn(row, format.balanceColumns)
    const reference = findColumn(row, format.referenceColumns)

    const debit = parseAmount(debitStr || "")
    const credit = parseAmount(creditStr || "")

    // Determine transaction type and amount
    let amount: number
    let type: "CREDIT" | "DEBIT"

    if (debit > 0 && credit === 0) {
      amount = debit
      type = "DEBIT"
    } else if (credit > 0 && debit === 0) {
      amount = credit
      type = "CREDIT"
    } else if (debit > 0 && credit > 0) {
      // Both columns have values - use net
      if (debit > credit) {
        amount = debit - credit
        type = "DEBIT"
      } else {
        amount = credit - debit
        type = "CREDIT"
      }
    } else {
      // Try single amount column
      const amountCol = findColumn(row, ["Amount", "Transaction Amount"])
      if (amountCol) {
        const parsedAmount = parseAmount(amountCol)
        amount = Math.abs(parsedAmount)
        type = parsedAmount < 0 || amountCol.includes("-") || amountCol.includes("(") ? "DEBIT" : "CREDIT"
      } else {
        continue // Skip if no amount found
      }
    }

    if (amount === 0) continue // Skip zero amount transactions

    transactions.push({
      date,
      description,
      amount,
      type,
      balance: balanceStr ? parseAmount(balanceStr) : undefined,
      referenceNumber: reference,
      category: suggestCategory(description),
    })
  }

  return transactions
}

function extractTransactionsFromText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []

  // Common patterns for transaction lines
  const patterns = [
    // DD/MM/YYYY Description Amount
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(DR|CR|Cr|Dr)?/gi,
    // Date Description Debit Credit Balance
    /(\d{1,2}\s+\w{3}\s+\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s*([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?/gi,
  ]

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const dateStr = match[1]
      const description = match[2]?.trim()
      const amount1 = match[3]
      const indicator = match[4]?.toUpperCase()

      const date = parseDate(dateStr)
      if (!date || !description) continue

      const amount = parseAmount(amount1)
      if (amount === 0) continue

      const type: "CREDIT" | "DEBIT" =
        indicator === "CR" || indicator === "CREDIT" ? "CREDIT" : "DEBIT"

      transactions.push({
        date,
        description,
        amount,
        type,
        category: suggestCategory(description),
      })
    }
  }

  return transactions
}

// ============================================================================
// Category Suggestion (Rule-based)
// ============================================================================

const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  "Food & Dining": [
    /swiggy|zomato|uber\s*eats|food|restaurant|cafe|coffee|pizza|burger|dining/i,
  ],
  Shopping: [
    /amazon|flipkart|myntra|ajio|shopping|mall|store|retail|purchase/i,
  ],
  Transportation: [
    /uber|ola|rapido|metro|railway|irctc|petrol|fuel|parking|toll/i,
  ],
  Utilities: [
    /electricity|water|gas|broadband|internet|wifi|mobile|recharge|bill\s*pay/i,
  ],
  Entertainment: [
    /netflix|spotify|prime|hotstar|movie|theatre|gaming|subscription/i,
  ],
  "Health & Medical": [
    /hospital|pharmacy|medical|doctor|clinic|medicine|health|apollo|medplus/i,
  ],
  "Rent & Housing": [
    /rent|housing|maintenance|society|apartment/i,
  ],
  Education: [
    /school|college|university|course|udemy|coursera|education|tuition/i,
  ],
  Insurance: [
    /insurance|lic|policy|premium|hdfc\s*life|icici\s*pru/i,
  ],
  Investment: [
    /mutual\s*fund|sip|stock|share|demat|zerodha|groww|upstox|nps|ppf/i,
  ],
  Salary: [
    /salary|payroll|wage|income|credit\s*salary/i,
  ],
  Transfer: [
    /neft|rtgs|imps|upi|transfer|fund\s*transfer/i,
  ],
  ATM: [
    /atm|cash\s*withdrawal|cash\s*deposit/i,
  ],
  EMI: [
    /emi|loan|instalment|installment/i,
  ],
}

function suggestCategory(description: string): string {
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(description))) {
      return category
    }
  }
  return "Other"
}

// ============================================================================
// AI-Powered Transaction Extraction (for complex PDFs)
// ============================================================================

export function generateExtractionPrompt(text: string): string {
  return `Extract all transactions from this bank statement. Return a JSON array with the following structure for each transaction:
{
  "date": "YYYY-MM-DD",
  "description": "transaction description",
  "amount": number (positive value),
  "type": "CREDIT" or "DEBIT",
  "balance": number or null,
  "referenceNumber": "string or null"
}

Important:
- Parse all dates correctly to YYYY-MM-DD format
- Amount should always be positive
- Use DEBIT for money going out, CREDIT for money coming in
- Extract reference/cheque numbers if present
- Include running balance if available

Bank Statement Text:
${text.substring(0, 15000)}

Return ONLY the JSON array, no other text.`
}

export function parseAIResponse(response: string): ParsedTransaction[] {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])

    return parsed.map((t: Record<string, unknown>) => ({
      date: new Date(t.date as string),
      description: t.description as string,
      amount: Number(t.amount),
      type: (t.type as string).toUpperCase() === "CREDIT" ? "CREDIT" : "DEBIT",
      balance: t.balance ? Number(t.balance) : undefined,
      referenceNumber: t.referenceNumber as string | undefined,
      category: suggestCategory(t.description as string),
    }))
  } catch {
    return []
  }
}

// ============================================================================
// Duplicate Detection
// ============================================================================

export type DuplicateMatch = {
  transaction: ParsedTransaction
  existingId: string
  existingType: "income" | "expense"
  confidence: number // 0-100
}

export function detectDuplicates(
  newTransactions: ParsedTransaction[],
  existingTransactions: {
    id: string
    date: Date
    amount: number
    description: string
    type: "income" | "expense"
  }[]
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = []

  for (const newTx of newTransactions) {
    for (const existingTx of existingTransactions) {
      // Check if amounts match
      if (Math.abs(newTx.amount - existingTx.amount) > 0.01) continue

      // Check if dates are within 2 days
      const dateDiff = Math.abs(newTx.date.getTime() - existingTx.date.getTime())
      const daysDiff = dateDiff / (1000 * 60 * 60 * 24)
      if (daysDiff > 2) continue

      // Check description similarity
      const similarity = calculateStringSimilarity(
        newTx.description.toLowerCase(),
        existingTx.description.toLowerCase()
      )

      // Calculate confidence
      let confidence = 0
      if (daysDiff === 0) confidence += 40
      else if (daysDiff <= 1) confidence += 30
      else confidence += 20

      confidence += similarity * 60

      if (confidence >= 60) {
        duplicates.push({
          transaction: newTx,
          existingId: existingTx.id,
          existingType: existingTx.type,
          confidence: Math.round(confidence),
        })
      }
    }
  }

  return duplicates
}

function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1

  const words1 = new Set(str1.split(/\s+/))
  const words2 = new Set(str2.split(/\s+/))

  const intersection = new Set([...words1].filter((w) => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

