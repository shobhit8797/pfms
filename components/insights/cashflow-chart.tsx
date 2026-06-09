"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { MonthlyFlow } from "@/app/actions/insights"

const fmt = (v: number) => `₹${v.toLocaleString("en-IN")}`
const compact = (v: number) =>
  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`

export function CashflowChart({ data }: { data: MonthlyFlow[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tickFormatter={compact} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={48} />
          <Tooltip
            formatter={(value) => fmt(Number(value))}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
