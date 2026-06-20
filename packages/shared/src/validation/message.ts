import { z } from "zod"
import { MESSAGE_SOURCES } from "../enums"
import { expenseBaseSchema } from "./expense"
import { incomeBaseSchema } from "./income"

/**
 * Isomorphic schemas for the message-capture pipeline, shared by the REST
 * handlers (`/api/v1/messages`) and the mobile app. The ingest schema is also
 * what an iOS Shortcut automation POSTs.
 */

/** Body posted to `POST /api/v1/messages` to capture a raw transaction message. */
export const messageIngestSchema = z.object({
  /** The raw SMS / notification / email text. Emails can be long, so the cap is generous. */
  text: z.string().min(1, "Message text is required").max(20000),
  /** Bank/UPI sender id, e.g. "VM-HDFCBK" (optional). */
  sender: z.string().max(64).optional().nullable(),
  /** When the message arrived on the device (ISO). Defaults to now server-side. */
  receivedAt: z.coerce.date().optional().nullable(),
  /** Where the capture came from. Defaults to MANUAL when omitted. */
  source: z.enum(MESSAGE_SOURCES).optional().nullable(),
})
export type MessageIngestInput = z.infer<typeof messageIngestSchema>

/**
 * Body posted to `POST /api/v1/messages/:id/resolve`. The user either saves the
 * message as an expense/income (with the reviewed/edited fields) or clears it.
 * `receiptDeclined` records that the user chose not to attach a receipt for this
 * merchant — the backend then stops asking for that merchant in future.
 */
export const messageResolveSchema = z
  .object({
    action: z.enum(["save", "dismiss", "ignore"]),
    kind: z.enum(["expense", "income"]).optional(),
    expense: expenseBaseSchema.optional(),
    income: incomeBaseSchema.optional(),
    receiptDeclined: z.coerce.boolean().optional().default(false),
  })
  .superRefine((d, ctx) => {
    if (d.action === "save") {
      const kind = d.kind ?? "expense"
      if (kind === "expense" && !d.expense) {
        ctx.addIssue({ code: "custom", path: ["expense"], message: "expense payload is required to save" })
      }
      if (kind === "income" && !d.income) {
        ctx.addIssue({ code: "custom", path: ["income"], message: "income payload is required to save" })
      }
    }
  })
export type MessageResolveInput = z.infer<typeof messageResolveSchema>
