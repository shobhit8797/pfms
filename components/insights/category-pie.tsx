"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type { CategorySlice } from "@/app/actions/insights"

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6",
  "#06b6d4", "#84cc16", "#ec4899", "#64748b", "#eab308",
]

export function CategoryPie({ data }: { data: CategorySlice[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-sm text-muted-foreground">
        No expenses this month yet.
      </div>
    )
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`₹${Number(value).toLocaleString("en-IN")}`, name]}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
