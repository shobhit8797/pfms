"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TransactionHistoryItem } from "@/app/actions/bank-account"
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react"

interface TransactionHistoryTableProps {
  transactions: TransactionHistoryItem[]
  total?: number
  pages?: number
  showPagination?: boolean
  limit?: number
}

export function TransactionHistoryTable({
  transactions,
  total = 0,
  pages = 1,
  showPagination = false,
  limit,
}: TransactionHistoryTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const displayTransactions = limit ? transactions.slice(0, limit) : transactions

  const filteredTransactions =
    typeFilter === "all"
      ? displayTransactions
      : displayTransactions.filter((t) => t.type === typeFilter)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <TrendingUp className="h-4 w-4 text-success" />
      case "expense":
        return <TrendingDown className="h-4 w-4 text-destructive" />
      case "transfer":
        return <ArrowRightLeft className="h-4 w-4 text-primary" />
      default:
        return null
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "income":
        return (
          <Badge variant="secondary" className="bg-success/10 text-success border-0">
            Income
          </Badge>
        )
      case "expense":
        return (
          <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0">
            Expense
          </Badge>
        )
      case "transfer":
        return (
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
            Transfer
          </Badge>
        )
      default:
        return null
    }
  }

  const formatCurrency = (amount: number) => {
    const prefix = amount >= 0 ? "+" : "-"
    return `${prefix}₹${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions found.</p>
            <p className="text-sm mt-2">
              Transactions will appear here once you add income or expenses.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Recent Transactions</CardTitle>
          {showPagination && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right pr-6">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="pl-6 text-muted-foreground text-sm">
                  {formatDate(transaction.date)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(transaction.type)}
                    <span className="font-medium truncate max-w-[200px]">
                      {transaction.description}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {transaction.category}
                  </Badge>
                </TableCell>
                <TableCell>{getTypeBadge(transaction.type)}</TableCell>
                <TableCell
                  className={`text-right pr-6 font-medium ${
                    transaction.amount >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatCurrency(transaction.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {showPagination && pages > 1 && (
          <div className="flex items-center justify-between px-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, total)} of{" "}
              {total} transactions
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pages}
                onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

