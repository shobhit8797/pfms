# Message capture (SMS/UPI → review queue → learned expenses)

Turns bank & UPI transaction messages into reviewed expenses on mobile. A raw
message is captured, parsed by an LLM into a candidate transaction, queued for a
quick swipe-to-review, and saved as an `Expense`. The app **learns per merchant**:
the category you assign is auto-applied next time, and if you decline a receipt
for a merchant it stops asking.

Belongs to the **service-layer subsystem** (`lib/services/*` consumed by REST
handlers), like Expense/Income and the 50:30:20 tracker.

## Why ingestion is source-agnostic (and the iOS reality)

iOS apps **cannot read the Messages inbox** — there is no public API. So capture
is **push-based**: a single authenticated endpoint accepts a raw message from any
source, and everything downstream is identical regardless of where it came from.

| Source (`MessageSource`) | How the message arrives |
|---|---|
| `EMAIL` | **Primary email path.** The user connects their Google account once; a background cron polls Gmail for transaction emails and feeds them in. See "Gmail auto-capture" below. |
| `IOS_SHORTCUT` | An iOS Shortcuts **"Message" personal automation** POSTs the SMS to `POST /api/v1/messages` (bearer token in the header). The primary iOS path for **SMS** — see the in-app **Auto-capture** setup screen. |
| `MANUAL` | (reserved) The ingest endpoint still accepts typed/pasted text, but the in-app manual paste UI was removed in favour of Gmail auto-read. Useful for tests. |
| `SHARE` | (reserved) iOS share sheet from Messages. |
| `ANDROID_SMS` | (future) Android `READ_SMS` auto-reader. |

## Data model (`prisma/schema.prisma`)

- **`InboundMessage`** — one captured message. `source`, `rawText`, `sender`,
  `receivedAt`, a unique `dedupeHash` (same text + same day + same user = one row,
  so a re-fired shortcut is idempotent), `status`, the parsed candidate fields
  (`parsedAmount/Merchant/Date/PaymentMethod/Direction/AccountHint`, `confidence`),
  `suggestedCategory`, `askReceipt` (seeded from the merchant pref), the linked
  `expenseId`/`incomeId`, and `metadata` JSON (keeps the original message info —
  sender, model used, token usage).
  - `status` (`InboundMessageStatus`): `PENDING_REVIEW` (in the queue) →
    `DONE` (saved) / `DISMISSED` (swiped away) / `IGNORED` (not a transaction —
    OTP/promo, auto-hidden) / `FAILED` (parse error, hidden but retained) /
    `DUPLICATE` (the same transaction already arrived via another source — see
    cross-source dedupe below; suppressed, never produces a second expense).
  - `txnFingerprint` + `duplicateOfId` drive cross-source dedupe (below).
- **`MerchantPreference`** — the learning store, unique per `(userId, merchantKey)`.
  `merchantKey` is the normalized merchant name. Holds the learned `category`,
  `paymentMethod`, and `askReceipt` (flips to `false` after a decline), plus
  `timesSeen` / `declineCount` / `lastSeenAt`.
- **`GmailConnection`** — one per user. The connected Gmail address, **encrypted**
  OAuth access/refresh tokens, `expiresAt`, a `syncQuery` override, the
  `lastSyncedAt` watermark, and `status` (`GmailConnectionStatus`:
  `CONNECTED`/`REVOKED`/`ERROR`). Drives the background email sync.

Enums (`MessageSource`, `InboundMessageStatus`) are mirrored in
`packages/shared/src/enums.ts` (`MESSAGE_SOURCES`, `INBOUND_MESSAGE_STATUSES`,
`TXN_DIRECTIONS`) — keep them in sync with Prisma.

## Backend

- **LLM parse** — `lib/llm/message.ts` `extractTransactionMessage(text)`. Text-only
  (no vision), strict-JSON output, validate-and-retry-once-then-throw (same pattern
  as `lib/llm/receipt.ts`). Returns `isTransaction` (false for OTP/promo/balance),
  amount, merchant (cleaned), date (ISO), payment method, direction, account hint,
  category guess, confidence. Provider/model is config-driven —
  `llmConfig.messageParse` in `lib/llm/config.ts` (OpenRouter default; Gemini SDK
  supported). Env: `MESSAGE_PARSE_PROVIDER`, `MESSAGE_PARSE_OPENROUTER_MODEL`,
  `MESSAGE_PARSE_GEMINI_MODEL`.
- **`lib/services/message.service.ts`**
  - `ingestMessage(userId, input)` — dedupe → parse → if it's a transaction, look
    up/seed the merchant pref (sets `suggestedCategory`/`askReceipt`) → create the
    `InboundMessage`. Non-transactions become `IGNORED`; parse failures `FAILED`.
    Idempotent (returns `{ duplicate: true }` on a repeat).
  - `listMessages(userId, status, limit)` — the review queue (`PENDING_REVIEW`).
  - `resolveMessage(userId, id, input)` — **save** (creates an `Expense` via
    `expense.service`, or `Income`; links it; marks `DONE`) or **dismiss/ignore**.
    On a save it calls `learnFromSave` (remembers category/method, turns receipt
    prompting on if a receipt was attached, off if declined). The original message
    text is copied into `Expense.notes`.
- **`lib/services/merchant-preference.service.ts`** — `merchantKeyOf` (normalize),
  `recordSighting`, `learnFromSave`, `recordReceiptDecline`. All `userId`-scoped.

### Cross-source dedupe (SMS ↔ email — one transaction, one expense)

Banks often send **both** an SMS and an email for the same payment. We must not
log it twice. The dedupe is on the **parsed transaction**, not the raw text
(SMS and email wording differ entirely):

- `txnFingerprintOf(userId, direction, amount, merchantKey)` — a sha256 of the
  normalized transaction identity. Casing/wording differences wash out because
  `merchantKey` is normalized.
- On ingest, after parsing, `findCanonicalTxn` looks for an existing row with the
  same fingerprint whose transaction date is within **±2 days** (`DEDUPE_WINDOW_MS`)
  and whose status is `PENDING_REVIEW`/`DONE`/`DISMISSED` (a dismissed txn
  shouldn't resurface from a second source).
- If found: the new capture is stored with status **`DUPLICATE`**,
  `duplicateOfId`/`expenseId` pointing at the canonical row, and `ingestMessage`
  returns `{ duplicate: true, message: <canonical> }`. The duplicate is **not**
  shown in the queue and can never be resolved, so **only the canonical row ever
  creates an expense**. (Verified by an SMS+email integration test.)
- This is separate from the text-level `dedupeHash` (which only collapses
  *identical* re-captures, e.g. a shortcut double-fire).

Trade-off: two genuinely distinct purchases at the same merchant for the exact
same amount within 2 days would merge. Rare; the user can still add the second
manually.

### Gmail auto-capture (connect once → background sync)

The user connects their Google account; the backend then polls Gmail for
transaction emails and runs each through `ingestMessage` (`source=EMAIL`), so
email transactions land in the same review queue and dedupe against SMS.

- **Auth & tokens** — `lib/google/oauth.ts` (raw fetch, no `googleapis` SDK):
  builds the consent URL (scope `gmail.readonly` + `userinfo.email`,
  `access_type=offline`), exchanges/refreshes tokens, and signs a stateless
  `state` (HMAC of userId, 10-min TTL) so the callback knows who started the flow
  without a session. Tokens are **encrypted at rest** (`lib/crypto.ts`,
  AES-256-GCM keyed off `ENCRYPTION_KEY`) on `GmailConnection`.
- **Reading mail** — `lib/google/gmail.ts`: `listMessageIds(q)` +
  `getParsedMessage` (walks the MIME tree, prefers `text/plain`, strips HTML).
- **Service** — `lib/services/gmail.service.ts`: `connectFromCode`,
  `getConnectionStatus`, `disconnect`, `syncConnection` (refresh token if needed →
  Gmail search `${query} after:<watermark>` → ingest each → advance
  `lastSyncedAt`), and `syncDueConnections` for cron. Default query is
  transaction-leaning and excludes promotions/social; the LLM `isTransaction` gate
  filters the rest. First sync looks back 30 days; ≤25 messages per run.
- **Routes**: `POST /api/v1/google/connect` (auth → `{url}`),
  `GET /api/v1/google/callback` (no auth — verifies `state`, stores tokens, returns
  an HTML page that deep-links back to `pfms://`), `GET/DELETE /api/v1/google`
  (status / disconnect), and the cron `GET /api/v1/internal/gmail-sweep`
  (`CRON_SECRET`, registered every 5 min in `vercel.json`).
- **Mobile**: the **Auto-capture** screen (`app/setup-capture.tsx`) has a **Connect
  Gmail** card — opens consent in the system browser via `Linking`, refreshes
  status on focus (`useFocusEffect`). Connecting/managing is here; there is no
  manual paste UI.

> ⚠️ `gmail.readonly` is a Google **restricted scope**. In "Testing" OAuth mode it
> works for a few test users with no review, but refresh tokens expire ~weekly.
> Public launch requires Google's CASA security assessment. Requires a Google
> Cloud OAuth client — see env vars in `CLAUDE.md`.

### REST surface (`withApiUser`; bearer token or web session)

| Route | Methods | Notes |
|---|---|---|
| `app/api/v1/messages/route.ts` | `GET` (`?status=`, `?limit=`), `POST` (ingest) | POST is what the iOS Shortcut hits |
| `app/api/v1/messages/[id]/resolve/route.ts` | `POST` (`{action, kind, expense?, income?, receiptDeclined?}`) | save / dismiss / ignore |
| `app/api/v1/tokens/route.ts` | `POST` | mints the long-lived token the shortcut uses (pre-existing) |
| `app/api/v1/google/connect/route.ts` | `POST` | → `{url}` Google consent URL (signed state) |
| `app/api/v1/google/callback/route.ts` | `GET` | OAuth callback (no auth; verifies state) → stores tokens → HTML deep-link back |
| `app/api/v1/google/route.ts` | `GET`, `DELETE` | Gmail status / disconnect |
| `app/api/v1/internal/gmail-sweep/route.ts` | `GET` | cron (`CRON_SECRET`) → `syncDueConnections` |

Shared schemas/DTOs/client: `packages/shared/src/validation/message.ts`
(`messageIngestSchema`, `messageResolveSchema`), `types.ts` (`InboundMessageDTO`,
`MerchantPreferenceDTO`, `IngestMessageDTO`, `IssuedTokenDTO`, `GmailStatusDTO`),
`api-client.ts` (`ingestMessage`, `listMessages`, `resolveMessage`, `issueToken`,
`connectGoogle`, `gmailStatus`, `disconnectGoogle`).

## Mobile (`mobile/`)

- **Review tab** (`app/(tabs)/review.tsx`) — the queue, with a tab badge of the
  pending count. Shows the top pending message as a **`ReviewCard`**
  (`components/ReviewCard.tsx`): a swipeable card (built on RN `Animated` +
  `PanResponder`, no extra native deps). **Swipe right / Save** → logs an expense
  (uploading any attached receipt first, then caching it on-device keyed by the new
  expense id); **swipe left / Dismiss** → clears it. The category field is
  pre-filled from the learned merchant preference; the receipt prompt is hidden for
  merchants the user opted out of, and a "don't ask again" checkbox records the
  opt-out. (There is no manual paste UI — transactions arrive via connected Gmail
  and the SMS shortcut.)
- **Home** surfaces "_N transactions to review_" as a banner on open.
- **Auto-capture setup** (`app/setup-capture.tsx`) — mints a token and walks the
  user through building the iOS Shortcuts "Message" automation (endpoint, headers,
  JSON body). Linked from the Review tab and its empty state.

## Gotchas / notes

- **iOS message automations** can run without confirmation ("Run Immediately") on
  iOS 16+; older iOS shows a one-tap prompt. Either way the POST reaches us. Needs
  network when the SMS arrives.
- **Direction**: only `DEBIT` messages auto-suggest an expense. `CREDIT` messages
  are still queued (the card warns and offers to dismiss; income is logged on the
  web app / via the income API).
- **Receipt upload** reuses the existing mobile receipt path (`lib/receipt.ts` +
  `lib/receipt-store.ts` → `POST /api/v1/blob/receipt`), so captured-transaction
  receipts behave exactly like Add-Expense receipts.
