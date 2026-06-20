# PFMS docs — index for agents & humans

This directory is the authoritative project documentation. Agents must consult it before
implementing features or architectural changes (see `/AGENTS.md` → "Documentation-First Workflow").

## Map

| File | Owns the truth about |
|---|---|
| `/AGENTS.md` (→ `/CLAUDE.md`) | Stack, conventions, data-isolation rule, known gotchas, env vars |
| `architecture.md` | System architecture, data flow, layering |
| `features/insights.md` | Insights dashboard: cross-feature analytics aggregation |
| `features/recurring-billing.md` | Cron-driven auto-posting of due subscription charges |
| `features/search-export.md` | Global search + CSV export for income/expenses |
| `frontend-design.md` | UI/UX guidelines, design system, component conventions |
| `features/bank-accounts.md` | Bank accounts: schema, actions, transfers, statements, analytics |
| `features/credit-cards.md` | Credit cards: schema, actions, UI |
| `features/income.md` | Income tracking |
| `features/expenses.md` | Expense tracking |
| `features/investments.md` | Investments (multi-asset) |
| `features/budgets.md` | Legacy period-based budgets |
| `features/budget-5030-20.md` | 50:30:20 tracker: service layer, REST/sync API, AI import, analytics |
| `features/subscriptions.md` | Subscriptions / recurring billing |
| `features/tax-planning.md` | Indian tax planning (Old/New regime) |
| `features/authentication.md` | Auth (NextAuth v5, JWT, credentials) |
| `features/ai-assistant.md` | Gemini-powered assistant + statement parsing |
| `features/mobile.md` | Expo iOS/Android app, `@pfms/shared`, expense/income REST surface |
| `features/message-capture.md` | SMS/UPI message → parse → review queue → learned auto-classification |

## Two subsystems (read this before assuming a pattern)

- **Legacy features** keep business logic directly inside Server Actions (`app/actions/*.ts`).
  *Exception:* **Expense and Income** were migrated to the service-layer pattern below (so the
  mobile app can reuse them) — see `features/mobile.md`. Other legacy features still hold logic
  in their actions.
- **50:30:20 tracker** uses a shared service layer (`lib/services/*`) consumed by both Server
  Actions (`app/actions/budget/*`) and REST handlers (`app/api/v1/**`). Mirror the subsystem the
  feature you are touching belongs to.
- **Mobile** (`mobile/`, Expo) consumes the REST API via `@pfms/shared` (`packages/shared`). See
  `features/mobile.md`.

## Keeping docs current

When you add a `app/dashboard/<feature>/` route, add a matching `features/<feature>.md`, a row in
the table above, and nav entries in both `components/dashboard/sidebar.tsx` and `mobile-nav.tsx`.
If a change makes a doc wrong, fix the doc in the same change. Don't record volatile facts
(branch, exact versions) — those live in `git` and `package.json`.
