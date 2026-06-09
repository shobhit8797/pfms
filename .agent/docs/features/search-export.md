# Search & CSV Export

## Global search (`/dashboard/search`)
- Server-rendered page reading `searchParams.q` (GET form, no client JS needed).
- `app/actions/search.ts` → `searchAll(query)`: `userId`-scoped, case-insensitive
  `contains` across Expenses (description/category/notes), Income (source/category/notes),
  Subscriptions (serviceName/category/notes), Investments (assetName/notes). Min 2 chars,
  25 per group. Returns grouped, Decimal-serialized results.
- Nav: "Search" (`Search` icon) after Overview in `sidebar.tsx` + `mobile-nav.tsx`.

## CSV export (legacy income/expenses)
- `app/api/export/expenses/route.ts` and `app/api/export/income/route.ts` — GET route
  handlers, **session-authenticated** via `auth()` (browser download; 401 if unauthenticated),
  `userId`-scoped, `Papa.unparse` → `text/csv` with `Content-Disposition: attachment`.
- "Export CSV" buttons (plain `<a download>`) in the income/expenses page headers, shown only
  when there are rows.
- The 50:30:20 ledger already has its own export at `app/api/v1/export/transactions`
  (bearer-or-session auth, for iOS) — these legacy routes are the web-only counterpart.

## Notes
- Search is read-only; results link to the owning feature page (no inline edit).
- Export streams the full set (no date filter yet) — fine at personal-finance scale.
