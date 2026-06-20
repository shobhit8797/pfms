# CLAUDE.md

This file is the **canonical agent context** for this repository. It guides Claude Code
(claude.ai/code) and — via the `AGENTS.md` symlink — Cursor, Codex, Copilot, and any other
coding agent that reads `AGENTS.md`. Keep it accurate: it is the single source of truth.

> **Agents: read this first, then the doc map below. If you change behavior that contradicts
> anything here, update this file in the same change.** See "Keeping context current".

## Doc map (where authoritative detail lives)

| You need… | Read |
|---|---|
| This file | Conventions, stack, gotchas, the rules you MUST follow |
| Docs index | `.agent/docs/README.md` |
| System architecture & data flow | `.agent/docs/architecture.md` |
| UI/UX + design system | `.agent/docs/frontend-design.md` |
| A specific feature's schema/actions | `.agent/docs/features/<feature>.md` |
| Exact dependency versions | `package.json` (do not hardcode versions in prose) |
| Current branch / recent work | `git status`, `git log` (not documented here — it rots) |

## Project Overview

Personal Finance Management System (PFMS) — a financial management web app: bank accounts,
credit cards, expense/income tracking, investments, budgets, subscriptions, Indian tax planning,
a 50:30:20 budgeting tracker, and AI assistance. Built with Next.js (App Router), TypeScript,
PostgreSQL + Prisma, and NextAuth v5. It also exposes a REST + delta-sync API (`app/api/v1/**`)
intended for a future native iOS client.

## Essential Commands

```bash
bun run dev              # Next.js dev server (port 3000)
bun run build            # Production build (runs prisma generate)
bun run start            # Production server
bun run lint             # ESLint

prisma generate          # Generate Prisma Client (auto on postinstall)
prisma migrate dev       # Create + apply migration (development)
prisma migrate deploy    # Apply migrations (production)
prisma studio            # DB browser GUI
prisma db push           # Push schema without a migration (dev only)
```

> Migrations use `DIRECT_URL` (see `prisma.config.ts`); the app uses the pooled `DATABASE_URL`.

## Architecture

### Stack
- **Runtime / package manager**: Bun
- **Framework**: Next.js (App Router, Turbopack in dev) — see `package.json` for the exact version
- **Language**: TypeScript (strict)
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Auth**: NextAuth v5 (Auth.js), JWT sessions, Prisma Adapter
- **UI**: Tailwind CSS v4 + Shadcn UI (Radix primitives), `next-themes` dark mode
- **AI**: **dual-stack** — Google Gemini for the legacy AI assistant + bank-statement parsing
  (`app/actions/ai.ts`); **OpenRouter** for the 50:30:20 statement-import extraction (`lib/llm/*`)
- **File storage**: **Vercel Blob** (`lib/blob.ts`, client-upload via `app/api/v1/blob/upload`)
- **Forms**: React Hook Form + Zod

### Two coexisting subsystems
1. **Legacy features** (accounts, credit cards, investments, budgets, subscriptions, tax): logic
   lives directly in **Server Actions** (`app/actions/*.ts`). **Exception: Expense and Income** were
   migrated to the service-layer pattern (below) so the mobile app can reuse them — their actions
   now wrap `lib/services/{expense,income}.service.ts`.
2. **Service-layer features** — the **50:30:20 budgeting tracker** (`/dashboard/budget`) **plus
   Expense/Income**: a **shared service layer** (`lib/services/*` — plain `(userId, input)`
   functions throwing typed `ServiceError`s from `lib/errors.ts`) consumed by **two adapters**:
   Server Actions (`app/actions/budget/*`, `app/actions/{expense,income}.ts`) for the web UI and
   **REST handlers** (`app/api/v1/**`, auth via `lib/api-auth.ts`) for native clients.
   Details: `.agent/docs/features/budget-5030-20.md`, `.agent/docs/features/mobile.md`.
3. **Mobile app** (`mobile/`, Expo iOS+Android) + **`packages/shared`** (`@pfms/shared`): a Bun
   workspace holding isomorphic Zod schemas, enum mirrors, DTO types, and the typed REST client,
   shared by the web routes and the app. `mobile/` is intentionally outside the workspace install.
   Details: `.agent/docs/features/mobile.md`.

### Core patterns

#### Server Actions
Mutations are Server Actions (`"use server"`) in `app/actions/`, invoked directly from client
components. Response shape: `{ error?: string } | { success?: string }`.

```typescript
"use server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function createResource(prevState: State | undefined, formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Unauthorized" }
  // Zod-validate → prisma op (scoped by userId) → revalidatePath → return {success}|{error}
}
```

#### Data isolation (CRITICAL)
**Every** DB query MUST filter by the authenticated `userId`. Never fetch unscoped.
```typescript
prisma.bankAccount.findMany({ where: { userId: session.user.id } })  // CORRECT
prisma.bankAccount.findMany()                                        // WRONG — leaks all users
```
The shared service layer enforces this by taking `userId` as its first argument.

#### Prisma client singleton
Always `import { prisma } from "@/lib/db"` (avoids connection exhaustion).

#### Decimal serialization
Money is `Decimal` in Prisma. Before passing rows to Client Components, convert with
`serializeDecimals()` from `lib/utils.ts` (Server Components do this at the page boundary).

### Project structure
```
app/
├── actions/            # Server Actions (business logic)
│   ├── bank-account.ts  credit-card.ts  expense.ts  income.ts
│   ├── investment.ts  budget.ts  subscription.ts  tax.ts  ai.ts
│   ├── login.ts  register.ts
│   └── budget/          # 50:30:20 action adapters (wrap lib/services/*)
├── api/
│   ├── auth/[...nextauth]   # NextAuth
│   └── v1/**               # REST + delta-sync API for iOS (budget subsystem)
├── dashboard/          # Protected app routes (one dir per feature, incl. credit-cards/, budget/, insights/, search/)
├── login/  register/  layout.tsx

components/
├── ui/                 # Shadcn primitives
├── <feature>/          # Feature components (bank-accounts/, credit-cards/, budget/, …)
└── dashboard/          # sidebar.tsx, mobile-nav.tsx (nav lives here)

lib/
├── db.ts  utils.ts  statement-parser.ts
├── errors.ts  api-auth.ts  blob.ts
├── services/  validation/  analytics/  llm/   # 50:30:20 subsystem
prisma/
├── schema.prisma  migrations/
.agent/docs/            # READ BEFORE CODING (see doc map above)
```

## Documentation-First Workflow

Before implementing a feature or architectural change:
1. **Read** the relevant `.agent/docs/features/<feature>.md` and `architecture.md`.
2. **Verify** your approach matches documented patterns.
3. **Update** the docs (and this file) in the same change if you make them obsolete.

## Key technical details

### Authentication
- JWT sessions via NextAuth v5; Credentials provider (email + bcrypt).
- `import { auth } from "@/auth"` in Server Components/Actions; `session.user.id` is available.
- REST (`app/api/v1`) accepts the session cookie OR a bearer `ApiToken` via `requireApiUser`.

### Schema highlights
- **User** is central; all financial entities relate to it and are `userId`-scoped.
- Legacy: **BankAccount, CreditCard, Expense, Income, Investment, Budget, Subscription,
  TaxProfile, TaxDeduction**.
- 50:30:20: **BudgetProfile, Category, PaymentMode, Transaction, Receipt, StatementImport,
  StagedTransaction, ApiToken** (see budget doc).
- Message capture: **InboundMessage, MerchantPreference, GmailConnection** (mobile
  SMS+email→expense pipeline; see `.agent/docs/features/message-capture.md`).

### Enums
`AccountType`(SAVINGS|CURRENT|SALARY|OVERDRAFT) · `IncomeType` · `PaymentMethod`(CASH|
BANK_TRANSFER|CREDIT_CARD|UPI|OTHER) · `Frequency`(DAILY|WEEKLY|MONTHLY|QUARTERLY|YEARLY) ·
`BudgetPeriod` · `TaxRegime`(OLD|NEW) · plus 50:30:20 enums (`CategoryType`, `ImportStatus`, …) ·
message-capture enums (`MessageSource`, `InboundMessageStatus`, `TxnDirection`).

### Form validation
React Hook Form + `zodResolver`; shared budget schemas in `lib/validation/budget.ts`.

### UI conventions
- Import primitives from `@/components/ui/*`; compose with `cn()` from `lib/utils.ts`.
- All components support dark mode (CSS variables: `bg-primary`, `text-foreground`, …).
- Lucide icons; `animate-fade-in-up` with staggered delays for lists.

### AI integration (dual-stack)
- **Gemini** (`@google/generative-ai`, model `gemini-1.5-flash`) in `app/actions/ai.ts`:
  the financial-advisor assistant and legacy PDF/CSV statement extraction.
  ⚠️ The code reads `process.env.GEMINI_API_KEY` (NOT `GOOGLE_GEMINI_API_KEY`) — see gotchas.
- **OpenRouter** (`lib/llm/openrouter.ts` + `extraction.ts`) for the 50:30:20 statement import:
  structured JSON output, validate-retry-once-then-FAIL. Env: `OPENROUTER_API_KEY`,
  `OPENROUTER_MODEL`, `OPENROUTER_VISION_MODEL`.
- **Transaction message parsing** (`lib/llm/message.ts`) for the **mobile message-capture**
  feature: text-only extraction of amount/merchant/date/method/direction from a bank/UPI
  **SMS or transaction email**. Config-driven via `llmConfig.messageParse` (OpenRouter
  default; Gemini supported), strict-JSON/retry-once. Feeds `POST /api/v1/messages` → review
  queue. Emails come from a **connected Gmail account** (OAuth, background cron sync —
  `lib/google/*`, `lib/services/gmail.service.ts`); SMS comes via an iOS Shortcut. SMS+email
  for the same payment are deduped to a single expense (transaction fingerprint). See
  `.agent/docs/features/message-capture.md`.
- **Receipt scanning** (`lib/llm/receipt.ts`) for **mobile**: `POST /api/v1/expenses/scan`
  takes a base64 image/PDF data URL and returns expense fields to pre-fill the form
  (persists nothing). **Provider + model are config-driven** — edit `lib/llm/config.ts`
  (`llmConfig.receiptScan`) to switch between `openrouter` (default; PDFs via the
  `file-parser` plugin) and the direct `gemini` SDK. Same strict-JSON/retry-once pattern
  either way. Env overrides: `RECEIPT_SCAN_PROVIDER`, `RECEIPT_SCAN_OPENROUTER_MODEL`
  (or legacy `OPENROUTER_RECEIPT_MODEL`), `RECEIPT_SCAN_GEMINI_MODEL`.
- All AI keys are **server-side only**. Never expose them to the client.

### File upload & statement parsing
- Formats: CSV/XLSX (Papaparse/SheetJS, deterministic) and PDF (`pdf-parse` → text → AI).
- Receipts/imports upload **client-side to Vercel Blob** via `app/api/v1/blob/upload` (files
  never traverse a Server Action body); 10MB limit; process in-memory; never store passwords.
- **Mobile** has no browser upload primitive, so it streams receipts as raw binary through
  `app/api/v1/blob/receipt` (`lib/blob.ts` `putReceipt`); the URL is saved on
  `Expense.receiptUrl`/`receiptName` and the service cleans up the Blob on delete/replace.
- `pdf-parse`/`pdfjs-dist` are in `serverExternalPackages` (next.config.ts) — see gotchas.

## Common patterns

### Server Action response
```typescript
const session = await auth(); if (!session?.user?.id) return { error: "Unauthorized" }
const v = schema.safeParse(raw); if (!v.success) return { error: v.error.issues[0].message }
await prisma.model.create({ data: { ...v.data, userId: session.user.id } })
revalidatePath("/dashboard/feature"); return { success: true }
```

### Atomic balance updates
Use `prisma.$transaction([...])` for any multi-row balance change (transfers, etc.).

### Primary account/exactly-one invariants
When setting a new primary, clear the flag on the user's other rows first (`updateMany`).

## Keeping context current (anti-drift protocol)

This file rotted once (claimed Gemini-only/S3/`feat/bank-account` while the code used
OpenRouter/Vercel Blob/`main`). To prevent recurrence:
- **Do not** record volatile facts here (current branch, exact versions, "as of last status").
  Point at `git` / `package.json` instead.
- When you add a feature dir under `app/dashboard/`, add a nav entry in **both**
  `components/dashboard/sidebar.tsx` and `mobile-nav.tsx`, and a `.agent/docs/features/*.md`.
- When you change the AI provider, storage backend, or API surface, update the Stack section.
- `AGENTS.md` is a symlink to this file — edit this file, never a copy.

## Known gotchas (recurring bug classes — check before reintroducing)

1. **Zod `.optional()` rejects `null` from `FormData`.** `formData.get(x)` returns `null` when a
   field is absent; `.optional()` only allows `undefined`. Coerce on read: `formData.get(x) || undefined`.
   (Bit us in `expense.ts` for `subcategory`/`taxSection`/`notes`.)
2. **Radix `<Select.Item>` forbids `value=""`.** Use a sentinel like `"default"` and normalize
   to `""` on read/write (see `bank-accounts/edit-account-dialog.tsx`).
3. **pdf-parse/pdfjs worker bundling.** "Cannot find module './pdf.worker.mjs'" → these must be
   in `serverExternalPackages` (next.config.ts) so they're required from `node_modules` at runtime.
4. **Supabase pooler is region-specific.** Host is `aws-1-<region>.pooler.supabase.com`, user is
   `postgres.<project-ref>`; `tenant/user not found` means wrong region, not bad credentials.
   The direct `db.<ref>.supabase.co` host is IPv6-only. URL-encode `@` in passwords as `%40`.
5. **Gemini env var name mismatch.** `app/actions/ai.ts` reads `GEMINI_API_KEY`; `.env`/older docs
   use `GOOGLE_GEMINI_API_KEY`. Set both, or fix the code, before expecting the assistant to work.
6. **`next.config.ts` changes need a dev-server restart** (not hot-reloaded).

## Path aliases
`@/*` → project root: `@/components/...`, `@/lib/db`, `@/auth`.

## Environment variables (`.env`, gitignored — never commit)
- `DATABASE_URL` — pooled Postgres (pgbouncer, port 6543)
- `DIRECT_URL` — direct Postgres for migrations (port 5432)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GEMINI_API_KEY` (read by code) / `GOOGLE_GEMINI_API_KEY` (legacy name) — Gemini
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_VISION_MODEL` — OpenRouter
- Receipt scan (config: `lib/llm/config.ts`) — `RECEIPT_SCAN_PROVIDER` (`openrouter`|`gemini`),
  `RECEIPT_SCAN_OPENROUTER_MODEL` (legacy: `OPENROUTER_RECEIPT_MODEL`),
  `RECEIPT_SCAN_GEMINI_MODEL` (uses `GEMINI_API_KEY`)
- Message parse (config: `lib/llm/config.ts`) — `MESSAGE_PARSE_PROVIDER` (`openrouter`|`gemini`),
  `MESSAGE_PARSE_OPENROUTER_MODEL`, `MESSAGE_PARSE_GEMINI_MODEL`
- ⚠️ The direct **Gemini** SDK default is `gemini-flash-latest` — `gemini-1.5-flash` is retired
  and returns HTTP 404 from the API. Use a current model id if overriding.
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob
- `EXTRACT_WORKER_SECRET`, `CRON_SECRET` — async extraction worker + cron sweeps (incl. Gmail sync)
- `ENCRYPTION_KEY` — encrypts sensitive fields at rest (e.g. Gmail OAuth tokens, `lib/crypto.ts`)
- **Gmail auto-capture** (mobile email→expense; see message-capture doc) — `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` (must equal an Authorized redirect URI on the
  OAuth client, e.g. `https://<host>/api/v1/google/callback`), `APP_OAUTH_RETURN_URL`
  (deep link back to the app, default `pfms://gmail-connected`), optional `GMAIL_SYNC_QUERY`.
  ⚠️ `gmail.readonly` is a Google **restricted scope** — Testing mode works for a few users
  (refresh tokens expire ~weekly); public launch needs Google's CASA security assessment.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase client/REST

## Security
- Scope every query by `userId`. Mask account/card numbers (`····1234`). Encrypt PAN/Aadhaar/
  account numbers. Validate all input with Zod. Keep AI keys server-side. Soft-deleted reads
  filter `deletedAt: null`; sync reads include deleted rows.

## Common tasks

### Add a feature
1. Read `.agent/docs/features/<feature>.md` (create it if new).
2. Update `prisma/schema.prisma` (+ `prisma migrate dev`) if needed.
3. Server actions in `app/actions/<feature>.ts` (or a `lib/services/*` fn + adapter for budget).
4. Page in `app/dashboard/<feature>/page.tsx`; components in `components/<feature>/`.
5. Nav entries in `sidebar.tsx` **and** `mobile-nav.tsx`.
6. Update docs + this file if conventions changed.

### Debug DB
`prisma studio` · `prisma db push` (dev sync) · `prisma migrate reset` (⚠️ deletes data).
