import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  ExpenseInput,
  ExpenseUpdateInput,
  IncomeInput,
  IncomeUpdateInput,
  CardCreateInput,
  UpiHandleCreateInput,
  MessageIngestInput,
  MessageResolveInput,
  SubscriptionInput,
  SubscriptionUpdateInput,
  SubscriptionPaymentInput,
} from "@pfms/shared"
import { useAuth } from "./auth"

/** Query hooks over the PFMS REST API, bound to the authenticated client. */

export function useExpenses() {
  const { client } = useAuth()
  return useQuery({ queryKey: ["expenses"], queryFn: () => client.listExpenses({ limit: 100 }) })
}

export function useIncome() {
  const { client } = useAuth()
  return useQuery({ queryKey: ["income"], queryFn: () => client.listIncome({ limit: 100 }) })
}

export function useAccounts() {
  const { client } = useAuth()
  return useQuery({ queryKey: ["accounts"], queryFn: () => client.listAccounts() })
}

export function useCards() {
  const { client } = useAuth()
  return useQuery({ queryKey: ["cards"], queryFn: () => client.listCards() })
}

export function useCreateExpense() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ExpenseInput) => client.createExpense(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      qc.invalidateQueries({ queryKey: ["cards"] })
    },
  })
}

export function useScanReceipt() {
  const { client } = useAuth()
  return useMutation({
    // `image` is a base64 data URL (image or PDF) of the receipt.
    mutationFn: (image: string) => client.scanReceipt(image),
  })
}

export function useUpdateExpense() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseUpdateInput }) => client.updateExpense(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      qc.invalidateQueries({ queryKey: ["cards"] })
      qc.invalidateQueries({ queryKey: ["recurring-suggestions"] })
    },
  })
}

export function useDeleteExpense() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      qc.invalidateQueries({ queryKey: ["cards"] })
    },
  })
}

/** Detected month-on-month repeats not yet flagged recurring. */
export function useRecurringSuggestions() {
  const { client } = useAuth()
  return useQuery({
    queryKey: ["recurring-suggestions"],
    queryFn: () => client.listRecurringSuggestions(),
  })
}

export function useCreateIncome() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IncomeInput) => client.createIncome(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
    },
  })
}

export function useUpdateIncome() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: IncomeUpdateInput }) => client.updateIncome(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      qc.invalidateQueries({ queryKey: ["recurring-suggestions"] })
    },
  })
}

export function useDeleteIncome() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.deleteIncome(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["income"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
    },
  })
}

// ---- Subscriptions ----

export function useSubscriptions() {
  const { client } = useAuth()
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => client.listSubscriptions({ includeInactive: true }),
  })
}

export function useSubscription(id: string) {
  const { client } = useAuth()
  return useQuery({
    queryKey: ["subscription", id],
    queryFn: () => client.getSubscription(id),
    enabled: !!id,
  })
}

export function useSubscriptionPayments(id: string) {
  const { client } = useAuth()
  return useQuery({
    queryKey: ["subscription-payments", id],
    queryFn: () => client.listSubscriptionPayments(id),
    enabled: !!id,
  })
}

export function useCreateSubscription() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SubscriptionInput) => client.createSubscription(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  })
}

export function useUpdateSubscription() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SubscriptionUpdateInput }) => client.updateSubscription(id, input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] })
      qc.invalidateQueries({ queryKey: ["subscription", v.id] })
    },
  })
}

export function useDeleteSubscription() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.deleteSubscription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscriptions"] }),
  })
}

export function useMarkSubscriptionPaid() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: SubscriptionPaymentInput }) => client.markSubscriptionPaid(id, input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["subscriptions"] })
      qc.invalidateQueries({ queryKey: ["subscription", v.id] })
      qc.invalidateQueries({ queryKey: ["subscription-payments", v.id] })
      qc.invalidateQueries({ queryKey: ["expenses"] })
    },
  })
}

export function useCreateCard() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CardCreateInput) => client.createCard(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  })
}

export function useDeleteCard() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.deleteCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards"] }),
  })
}

// ---- Message capture (review queue) ----

/** Pending captured transaction messages awaiting review. */
export function usePendingMessages() {
  const { client } = useAuth()
  return useQuery({
    queryKey: ["messages", "PENDING_REVIEW"],
    queryFn: () => client.listMessages({ status: "PENDING_REVIEW", limit: 100 }),
  })
}

/** Capture a raw message (manual paste / share). */
export function useIngestMessage() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: MessageIngestInput) => client.ingestMessage(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages"] }),
  })
}

/** Save a reviewed message (expense/income) or dismiss/ignore it. */
export function useResolveMessage() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MessageResolveInput }) => client.resolveMessage(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] })
      qc.invalidateQueries({ queryKey: ["expenses"] })
      qc.invalidateQueries({ queryKey: ["income"] })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      qc.invalidateQueries({ queryKey: ["cards"] })
    },
  })
}

/** Mint a long-lived API token for the iOS auto-capture Shortcut. */
export function useIssueToken() {
  const { client } = useAuth()
  return useMutation({ mutationFn: (name?: string) => client.issueToken(name) })
}

// ---- Gmail auto-capture ----

/** Current Gmail connection status. */
export function useGmailStatus() {
  const { client } = useAuth()
  return useQuery({ queryKey: ["gmail-status"], queryFn: () => client.gmailStatus() })
}

/** Begin connecting Google — returns the consent URL to open in a browser. */
export function useConnectGoogle() {
  const { client } = useAuth()
  return useMutation({ mutationFn: () => client.connectGoogle() })
}

/** Disconnect the Gmail account. */
export function useDisconnectGoogle() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => client.disconnectGoogle(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gmail-status"] }),
  })
}

/** Trigger an on-demand Gmail sync, then refresh the status and review queue. */
export function useSyncGmail() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => client.syncGmail(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gmail-status"] })
      qc.invalidateQueries({ queryKey: ["messages"] })
    },
  })
}

/**
 * Enable curated capture (Expenses label + Purchases category) and import the
 * existing curated mail, then refresh the status and review queue.
 */
export function useBackfillGmail() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => client.backfillGmail(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gmail-status"] })
      qc.invalidateQueries({ queryKey: ["messages"] })
    },
  })
}

export function useUpiHandles() {
  const { client } = useAuth()
  return useQuery({ queryKey: ["upi-handles"], queryFn: () => client.listUpiHandles() })
}

export function useCreateUpiHandle() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpiHandleCreateInput) => client.createUpiHandle(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["upi-handles"] }),
  })
}

export function useDeleteUpiHandle() {
  const { client } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.deleteUpiHandle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["upi-handles"] }),
  })
}
