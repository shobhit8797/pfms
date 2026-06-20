import { prisma } from "@/lib/db"
import type { Prisma, PaymentMethod } from "@prisma/client"

/**
 * Per-merchant learned behavior. Two things are learned from how the user
 * reviews captured transaction messages:
 *   1. The spend category (and payment method) they assign to a merchant — so
 *      the next message from that merchant is auto-classified.
 *   2. Whether they want to be asked to attach a receipt — once they decline a
 *      receipt for a merchant, we stop prompting for it.
 *
 * Every query is userId-scoped. Used only by the message service.
 */

/** Normalize a merchant name into a stable key for matching across messages. */
export function merchantKeyOf(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ") // strip punctuation/refs to spaces
    .replace(/\b(pvt|ltd|limited|india|inc|llp|the)\b/g, "") // drop noise tokens
    .replace(/\s+/g, " ")
    .trim()
}

export async function getPreference(userId: string, merchantKey: string) {
  return prisma.merchantPreference.findUnique({
    where: { userId_merchantKey: { userId, merchantKey } },
  })
}

/**
 * Record that a merchant was seen (on ingest). Bumps `timesSeen`/`lastSeenAt`
 * and seeds the display name. Returns the (possibly new) preference row so the
 * caller can read the learned `category` / `askReceipt`.
 */
export async function recordSighting(userId: string, merchantKey: string, displayName: string) {
  return prisma.merchantPreference.upsert({
    where: { userId_merchantKey: { userId, merchantKey } },
    create: { userId, merchantKey, displayName, timesSeen: 1 },
    update: { displayName, timesSeen: { increment: 1 }, lastSeenAt: new Date() },
  })
}

/**
 * Apply what we learned when the user saves a reviewed transaction:
 *   - remember the chosen category / payment method for this merchant
 *   - if they declined a receipt, flip `askReceipt` off (and count it); if they
 *     DID attach one, turn prompting back on.
 */
export async function learnFromSave(
  userId: string,
  merchantKey: string,
  displayName: string,
  opts: {
    category?: string | null
    paymentMethod?: PaymentMethod | null
    receiptDeclined?: boolean
    receiptAttached?: boolean
  }
) {
  const data: Prisma.MerchantPreferenceUpdateInput = { displayName, lastSeenAt: new Date() }
  if (opts.category) data.category = opts.category
  if (opts.paymentMethod) data.paymentMethod = opts.paymentMethod
  if (opts.receiptDeclined) {
    data.askReceipt = false
    data.declineCount = { increment: 1 }
  } else if (opts.receiptAttached) {
    data.askReceipt = true
  }

  return prisma.merchantPreference.upsert({
    where: { userId_merchantKey: { userId, merchantKey } },
    create: {
      userId,
      merchantKey,
      displayName,
      category: opts.category ?? null,
      paymentMethod: opts.paymentMethod ?? null,
      askReceipt: opts.receiptDeclined ? false : true,
      declineCount: opts.receiptDeclined ? 1 : 0,
      timesSeen: 1,
    },
    update: data,
  })
}

/** Record a standalone receipt decline (e.g. the user dismissed the card). */
export async function recordReceiptDecline(userId: string, merchantKey: string, displayName: string) {
  return prisma.merchantPreference.upsert({
    where: { userId_merchantKey: { userId, merchantKey } },
    create: { userId, merchantKey, displayName, askReceipt: false, declineCount: 1, timesSeen: 1 },
    update: { askReceipt: false, declineCount: { increment: 1 }, lastSeenAt: new Date() },
  })
}

export function listPreferences(userId: string) {
  return prisma.merchantPreference.findMany({ where: { userId }, orderBy: { lastSeenAt: "desc" } })
}
