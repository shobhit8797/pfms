"use client"

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

type Point = { date: string; amount: number }

export function DailySpendChart({ data }: { data: Point[] }) {
  const chartData = data.map((d) => ({ day: Number(d.date.slice(8, 10)), amount: d.amount }))
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} className="fill-muted-foreground" />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            className="fill-muted-foreground"
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
          />
          <Tooltip
            cursor={{ fill: "rgba(120,120,120,0.08)" }}
            formatter={(value) => [`₹${Math.round(Number(value)).toLocaleString("en-IN")}`, "Spend"]}
            labelFormatter={(label) => `Day ${label}`}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
