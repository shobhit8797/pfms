# Mobile app (Expo · iOS + Android)

Native client that reuses this backend over the REST API. One Postgres DB backs
web + mobile, so a user sees the same data on both. Lives in `mobile/` as a
sibling of the web app; shared code is in `packages/shared` (`@pfms/shared`).

## Monorepo layout
- Root = the existing Next.js web app (unchanged location).
- Bun workspaces: `["." , "packages/*"]`. **`mobile/` is intentionally NOT a
  workspace** — React Native pins its own React/RN versions and must not share
  the web app's hoisted install. It consumes `@pfms/shared` via a `file:` dep +
  Metro config (`mobile/metro.config.js` watches the repo root).
- `@pfms/shared` ships **TypeScript source** (isomorphic Zod schemas, enum
  mirrors, typed API client, DTO types). The web app transpiles it via
  `transpilePackages: ["@pfms/shared"]` in `next.config.ts`; Metro reads the
  source directly.

## What's shared (`packages/shared/src`)
- `enums.ts` — `PAYMENT_METHODS`, `INCOME_TYPES`, `FREQUENCIES` (+ label maps),
  mirroring the Prisma enums (kept in sync manually; no `@prisma/client` import).
- `validation/{expense,income}.ts` — the **same** Zod schemas used by the web
  Server Actions, the REST routes, and the mobile forms. `z.coerce` lets one
  schema accept both FormData strings and typed JSON.
- `api-client.ts` — `PfmsClient` typed fetch wrapper; attaches the bearer token,
  unwraps the `{ error, code }` envelope into a thrown `ApiError`.
- `types.ts` — response DTOs (money as **numbers** — the REST layer runs
  Prisma `Decimal`s through `serializeDecimals()` before sending; dates are ISO).

## Backend additions (REST surface for legacy features)
The legacy Expense/Income logic was extracted into a service layer mirroring the
budget subsystem, then exposed over REST. Web Server Actions now call the same
services (single source of truth).

| Route | Methods | Service |
|---|---|---|
| `app/api/v1/expenses/route.ts` | GET (list, `search`/`from`/`to`/`limit`/`offset`), POST | `lib/services/expense.service.ts` |
| `app/api/v1/expenses/[id]/route.ts` | GET, PATCH, DELETE | ″ |
| `app/api/v1/expenses/scan/route.ts` | POST (`{ image }` base64 data URL → extracted expense fields; persists nothing) | `lib/llm/receipt.ts` |
| `app/api/v1/blob/receipt/route.ts` | POST (raw binary body + `x-file-name` → stores receipt in Vercel Blob, returns `{ url, name }`) | `lib/blob.ts` `putReceipt` |
| `app/api/v1/income/route.ts` | GET (list), POST | `lib/services/income.service.ts` |
| `app/api/v1/income/[id]/route.ts` | GET, PATCH, DELETE | ″ |
| `app/api/v1/accounts/route.ts` | GET (read-only picker, masked numbers) | `lib/services/picker.service.ts` |
| `app/api/v1/cards/route.ts` | GET (read-only picker) | ″ |
| `app/api/v1/auth/login/route.ts` | POST (email+password → mints `ApiToken`) | `lib/services/token.service.ts` |

All except `auth/login` are wrapped in `withApiUser` (bearer token **or** web
session). Errors use the shared `ServiceError` → HTTP mapping (`lib/errors.ts`).
The services preserve the original balance side effects inside `prisma.$transaction`
(bank-transfer decrements account balance; credit-card charge raises outstanding
and lowers available credit; income increments the linked account).

**`auth/login`** is unauthenticated by design — it bcrypt-checks the password
(same logic as `auth.ts`) and returns a long-lived token. TODO: add rate-limiting
before public exposure.

## Mobile app (`mobile/`)
- Expo SDK 54 (React 19, RN 0.81), expo-router, NativeWind, TanStack Query, expo-secure-store.
- Auth: `lib/auth.tsx` holds the token in secure storage + a single `PfmsClient`.
  App boot → token present ? tabs : `/login`.
- Tab bar uses `@expo/vector-icons` (Ionicons) for Home/Expenses/Income.
- Screens: Home (totals + a "_N transactions to review_" banner + quick **Add
  expense** + sign-out), **Review** (the message-capture queue — see below),
  Expenses (list/add/delete), Income (list/add/delete), Payments. `components/Add{Expense,Income}Modal.tsx`
  validate with the shared schema before calling the API; React Query keys are
  invalidated on write.
- **Message capture / Review**: transaction **emails** (connected Gmail, background
  sync) and bank/UPI **SMS** (iOS Shortcut) are parsed by the LLM and reviewed via a
  swipeable `ReviewCard`; the app learns each merchant's category and receipt
  preference, and SMS+email for one payment dedupe to a single expense. Connect
  Gmail / set up the SMS shortcut from `app/setup-capture.tsx`. Full design in
  `features/message-capture.md`. Screens: `app/(tabs)/review.tsx`,
  `app/setup-capture.tsx`; component `components/ReviewCard.tsx`.
- **AI receipt scan**: `AddExpenseModal` lets the user attach a receipt via camera,
  photo library, or a PDF/image file (`lib/receipt.ts`, using `expo-image-picker` +
  `expo-document-picker` + `expo-file-system/legacy`). The base64 data URL is POSTed
  to `/api/v1/expenses/scan`, which runs it through the provider configured in
  `lib/llm/config.ts` (`llmConfig.receiptScan` — OpenRouter or the direct Gemini
  SDK) and returns amount/description/category/date/paymentMethod to pre-fill the
  form. iOS camera/photo permission strings are set via the `expo-image-picker`
  config plugin in `app.json`.
- **Receipt storage** (`lib/receipt-store.ts`): keeping the receipt is **voluntary**
  (a "Save receipt with this expense" toggle, default on). On save, the raw file is
  uploaded (binary, `expo-file-system.uploadAsync`) to `/api/v1/blob/receipt`, which
  stores it in Vercel Blob under `receipts/<userId>/…`; the returned URL is saved on
  the expense (`Expense.receiptUrl` / `receiptName`). A copy is also cached on-device
  under `cacheDirectory/receipts/<expenseId>.<ext>` for offline viewing. The expenses
  list shows a thumbnail (local copy first, else remote) and opens the receipt on tap.
  This is the foundation for the planned **warranty** feature (search expenses that
  have receipts). The service deletes the Blob on expense delete / receipt replace.
  ⚠️ The upload goes through a Function body (Vercel ~4.5MB limit); images are
  compressed (quality 0.6) to stay under it. Large PDFs → direct client→Blob upload
  is a future hardening.
- Setup/run: see `mobile/README.md`. Backend URL via `expo.extra.apiBaseUrl` /
  `EXPO_PUBLIC_API_BASE_URL` (use the LAN IP on a physical device).

## Out of scope (future)
Full account/card/investment/tax CRUD over REST; offline-first delta-sync for
legacy entities (the `/api/v1/sync` endpoint currently covers only the budget
subsystem); the **warranty** feature (search/track receipts that carry a warranty —
builds on `Expense.receiptUrl`); web UI for attaching receipts (currently mobile-only);
multiple receipts per expense; signed/private Blob reads; push notifications;
EAS Build release pipeline.

## Gotcha: keep enum mirrors in sync
`packages/shared/src/enums.ts` duplicates the Prisma `PaymentMethod`/`IncomeType`/
`Frequency` enums **plus** the message-capture enums (`MESSAGE_SOURCES`,
`INBOUND_MESSAGE_STATUSES`, `TXN_DIRECTIONS`) — the shared package can't import
`@prisma/client`. If you change those enums in `prisma/schema.prisma`, update the
mirrors too.
