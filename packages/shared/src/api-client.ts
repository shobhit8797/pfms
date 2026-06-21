import type { ExpenseInput, ExpenseUpdateInput } from "./validation/expense"
import type { IncomeInput, IncomeUpdateInput } from "./validation/income"
import type { CardCreateInput } from "./validation/card"
import type { UpiHandleCreateInput } from "./validation/upi-handle"
import type { MessageIngestInput, MessageResolveInput } from "./validation/message"
import type {
  SubscriptionInput,
  SubscriptionUpdateInput,
  SubscriptionPaymentInput,
} from "./validation/subscription"
import type { InboundMessageStatus } from "./enums"
import type {
  AccountPickerDTO,
  CardDTO,
  ExpenseDTO,
  GmailBackfillDTO,
  GmailStatusDTO,
  GmailSyncDTO,
  IncomeDTO,
  InboundMessageDTO,
  IngestMessageDTO,
  IssuedTokenDTO,
  ListResponse,
  LoginResponse,
  ReceiptScanDTO,
  RecurringSuggestionDTO,
  SubscriptionDTO,
  SubscriptionMonthDTO,
  SubscriptionPaymentDTO,
  UpiHandleDTO,
} from "./types"

/** Thrown on any non-2xx response; carries the server's error code when present. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export type PfmsClientOptions = {
  /** Base URL of the deployed/dev backend, e.g. http://192.168.1.5:3000 */
  baseUrl: string
  /** Returns the current bearer token (or null when logged out). */
  getToken?: () => string | null | Promise<string | null>
}

/**
 * Typed client over the PFMS REST API (`/api/v1/**`). Used by the mobile app;
 * usable from any TS runtime. Attaches `Authorization: Bearer <token>` and
 * unwraps the `{ error, code }` envelope into a thrown `ApiError`.
 */
export class PfmsClient {
  constructor(private opts: PfmsClientOptions) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.opts.getToken ? await this.opts.getToken() : null
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    }
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch(`${this.opts.baseUrl}${path}`, { ...init, headers })
    const text = await res.text()
    const body = text ? JSON.parse(text) : null

    if (!res.ok) {
      const message = body?.error ?? `Request failed (${res.status})`
      throw new ApiError(res.status, message, body?.code)
    }
    return body as T
  }

  // ---- Auth ----
  login(email: string, password: string, deviceName?: string) {
    return this.request<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, deviceName }),
    })
  }

  // ---- Expenses ----
  listExpenses(params: { limit?: number; offset?: number; search?: string } = {}) {
    const q = new URLSearchParams()
    if (params.limit != null) q.set("limit", String(params.limit))
    if (params.offset != null) q.set("offset", String(params.offset))
    if (params.search) q.set("search", params.search)
    const qs = q.toString()
    return this.request<ListResponse<ExpenseDTO>>(`/api/v1/expenses${qs ? `?${qs}` : ""}`)
  }
  createExpense(input: ExpenseInput) {
    return this.request<ExpenseDTO>("/api/v1/expenses", { method: "POST", body: JSON.stringify(input) })
  }
  updateExpense(id: string, input: ExpenseUpdateInput) {
    return this.request<ExpenseDTO>(`/api/v1/expenses/${id}`, { method: "PATCH", body: JSON.stringify(input) })
  }
  deleteExpense(id: string) {
    return this.request<{ ok: true }>(`/api/v1/expenses/${id}`, { method: "DELETE" })
  }
  /**
   * Extract expense fields from a receipt. `image` is a base64 data URL of an
   * image or PDF (e.g. `data:image/jpeg;base64,...`). Returns nullable fields
   * for the user to review — nothing is persisted.
   */
  scanReceipt(image: string) {
    return this.request<ReceiptScanDTO>("/api/v1/expenses/scan", {
      method: "POST",
      body: JSON.stringify({ image }),
    })
  }

  // ---- Income ----
  listIncome(params: { limit?: number; offset?: number } = {}) {
    const q = new URLSearchParams()
    if (params.limit != null) q.set("limit", String(params.limit))
    if (params.offset != null) q.set("offset", String(params.offset))
    const qs = q.toString()
    return this.request<ListResponse<IncomeDTO>>(`/api/v1/income${qs ? `?${qs}` : ""}`)
  }
  createIncome(input: IncomeInput) {
    return this.request<IncomeDTO>("/api/v1/income", { method: "POST", body: JSON.stringify(input) })
  }
  updateIncome(id: string, input: IncomeUpdateInput) {
    return this.request<IncomeDTO>(`/api/v1/income/${id}`, { method: "PATCH", body: JSON.stringify(input) })
  }
  deleteIncome(id: string) {
    return this.request<{ ok: true }>(`/api/v1/income/${id}`, { method: "DELETE" })
  }

  // ---- Recurring suggestions ----
  /** Detected month-on-month repeats not yet marked recurring, for one-tap confirm. */
  listRecurringSuggestions() {
    return this.request<{ items: RecurringSuggestionDTO[] }>("/api/v1/expenses/recurring-suggestions")
  }

  // ---- Subscriptions ----
  listSubscriptions(params: { includeInactive?: boolean } = {}) {
    const q = new URLSearchParams()
    if (params.includeInactive) q.set("includeInactive", "1")
    const qs = q.toString()
    return this.request<ListResponse<SubscriptionDTO>>(`/api/v1/subscriptions${qs ? `?${qs}` : ""}`)
  }
  getSubscription(id: string) {
    return this.request<{ subscription: SubscriptionDTO; months: SubscriptionMonthDTO[] }>(
      `/api/v1/subscriptions/${id}`
    )
  }
  createSubscription(input: SubscriptionInput) {
    return this.request<SubscriptionDTO>("/api/v1/subscriptions", { method: "POST", body: JSON.stringify(input) })
  }
  updateSubscription(id: string, input: SubscriptionUpdateInput) {
    return this.request<SubscriptionDTO>(`/api/v1/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(input) })
  }
  deleteSubscription(id: string) {
    return this.request<{ ok: true }>(`/api/v1/subscriptions/${id}`, { method: "DELETE" })
  }
  listSubscriptionPayments(id: string) {
    return this.request<ListResponse<SubscriptionPaymentDTO>>(`/api/v1/subscriptions/${id}/payments`)
  }
  markSubscriptionPaid(id: string, input: SubscriptionPaymentInput = {}) {
    return this.request<SubscriptionPaymentDTO>(`/api/v1/subscriptions/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(input),
    })
  }

  // ---- Pickers (read-only) ----
  listAccounts() {
    return this.request<{ items: AccountPickerDTO[] }>("/api/v1/accounts")
  }

  // ---- Cards ----
  listCards() {
    return this.request<{ items: CardDTO[] }>("/api/v1/cards")
  }
  createCard(input: CardCreateInput) {
    return this.request<CardDTO>("/api/v1/cards", { method: "POST", body: JSON.stringify(input) })
  }
  deleteCard(id: string) {
    return this.request<{ ok: true }>(`/api/v1/cards/${id}`, { method: "DELETE" })
  }

  // ---- Message capture ----
  /** Capture a raw transaction message (also the endpoint the iOS Shortcut hits). */
  ingestMessage(input: MessageIngestInput) {
    return this.request<IngestMessageDTO>("/api/v1/messages", {
      method: "POST",
      body: JSON.stringify(input),
    })
  }
  /** The review queue. Defaults to pending messages. */
  listMessages(params: { status?: InboundMessageStatus; limit?: number } = {}) {
    const q = new URLSearchParams()
    q.set("status", params.status ?? "PENDING_REVIEW")
    if (params.limit != null) q.set("limit", String(params.limit))
    return this.request<ListResponse<InboundMessageDTO>>(`/api/v1/messages?${q.toString()}`)
  }
  /** Save a message as an expense/income, or dismiss/ignore it. Records learning. */
  resolveMessage(id: string, input: MessageResolveInput) {
    return this.request<{ message: InboundMessageDTO; expense?: ExpenseDTO; income?: IncomeDTO }>(
      `/api/v1/messages/${id}/resolve`,
      { method: "POST", body: JSON.stringify(input) }
    )
  }

  // ---- API tokens (for the iOS auto-capture Shortcut) ----
  /** Mint a long-lived bearer token; plaintext is returned once. */
  issueToken(name?: string) {
    return this.request<IssuedTokenDTO>("/api/v1/tokens", {
      method: "POST",
      body: JSON.stringify({ name }),
    })
  }

  // ---- Gmail auto-capture ----
  /** Returns the Google consent URL to open in a browser for the signed-in user. */
  connectGoogle() {
    return this.request<{ url: string }>("/api/v1/google/connect", { method: "POST" })
  }
  /** Current Gmail connection status. */
  gmailStatus() {
    return this.request<GmailStatusDTO>("/api/v1/google")
  }
  /** Trigger an on-demand Gmail sync (manual equivalent of the cron sweep). */
  syncGmail() {
    return this.request<GmailSyncDTO>("/api/v1/google/sync", { method: "POST" })
  }
  /**
   * Enable curated capture — point ongoing sync at the Expenses label + Purchases
   * category and import existing curated mail. Re-callable (dedupes) to go deeper.
   */
  backfillGmail() {
    return this.request<GmailBackfillDTO>("/api/v1/google/backfill", { method: "POST" })
  }
  /** Disconnect Gmail (revokes the token and forgets it). */
  disconnectGoogle() {
    return this.request<{ ok: true }>("/api/v1/google", { method: "DELETE" })
  }

  // ---- UPI handles ----
  listUpiHandles() {
    return this.request<{ items: UpiHandleDTO[] }>("/api/v1/upi-handles")
  }
  createUpiHandle(input: UpiHandleCreateInput) {
    return this.request<UpiHandleDTO>("/api/v1/upi-handles", { method: "POST", body: JSON.stringify(input) })
  }
  deleteUpiHandle(id: string) {
    return this.request<{ ok: true }>(`/api/v1/upi-handles/${id}`, { method: "DELETE" })
  }
}
