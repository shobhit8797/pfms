# Insights Dashboard

A read-only analytics surface (`/dashboard/insights`) that aggregates across the legacy
features (accounts, income, expenses, investments, credit cards, budgets) into one view.
Legacy-subsystem feature: a single aggregation Server Action, no `lib/services` layer.

## Data (`app/actions/insights.ts` → `getInsights()`)
Returns `InsightsData` (all amounts pre-rounded numbers — no Decimal crosses to the client):
- `monthlyFlow[]` — income vs expense vs net, bucketed by month for the last 6 months.
- `categoryBreakdown[]` / `topCategories[]` — this month's expenses grouped by category.
- `kpis` — `netWorth` (bank + investments − credit outstanding), `thisMonthIncome`,
  `thisMonthExpense`, `expenseChangePct` (vs last month), `savingsRate` (0–100),
  and the net-worth components.
- `budgetAlerts[]` — legacy budgets whose spend is ≥80% of limit (within their date window).

All six source queries are `userId`-scoped and run in one `Promise.all`. Buckets/aggregations
are computed in JS (Prisma can't group by month directly). Decimals converted with `Number()`
at the aggregation boundary, then `Math.round`-ed.

## UI
- Page: `app/dashboard/insights/page.tsx` (server component) — KPI cards, two charts, top
  categories, budget alerts. Has an empty state when there's no data.
- Charts (`components/insights/`, client, recharts v3):
  `cashflow-chart.tsx` (grouped BarChart income/expense), `category-pie.tsx` (donut PieChart).
- Nav: "Insights" (`LineChart` icon) after Overview in `sidebar.tsx` + `mobile-nav.tsx`.

## Notes / follow-ups
- `netWorth` excludes liabilities beyond credit-card outstanding (no loans model yet).
- A budget is treated as "active" if `endDate >= now` (the Budget model has no isActive flag).
- Future: date-range picker, drill-down from a category slice to its transactions,
  CSV export of the breakdown.
