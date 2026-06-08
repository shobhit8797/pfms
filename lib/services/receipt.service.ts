import { prisma } from "@/lib/db"
import { notFound } from "@/lib/errors"
import { deleteBlob } from "@/lib/blob"
import type { OcrStatus, Prisma } from "@prisma/client"

export async function listReceiptsForTransaction(userId: string, transactionId: string) {
  return prisma.receipt.findMany({
    where: { userId, transactionId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  })
}

export async function getReceiptOrThrow(userId: string, id: string) {
  const receipt = await prisma.receipt.findFirst({ where: { id, userId, deletedAt: null } })
  if (!receipt) throw notFound("Receipt not found")
  return receipt
}

/**
 * Creates a Receipt row for an already-uploaded blob and (optionally) links it
 * to a transaction, keeping Transaction.receiptIds in sync.
 */
export async function createReceipt(
  userId: string,
  input: { fileUrl: string; thumbnailUrl?: string | null; transactionId?: string | null; ocrStatus?: OcrStatus }
) {
  return prisma.$transaction(async (tx) => {
    if (input.transactionId) {
      const owned = await tx.transaction.findFirst({
        where: { id: input.transactionId, userId, deletedAt: null },
        select: { id: true, receiptIds: true },
      })
      if (!owned) throw notFound("Transaction not found")
    }

    const receipt = await tx.receipt.create({
      data: {
        userId,
        fileUrl: input.fileUrl,
        thumbnailUrl: input.thumbnailUrl ?? null,
        transactionId: input.transactionId ?? null,
        ocrStatus: input.ocrStatus ?? "NONE",
      },
    })

    if (input.transactionId) {
      await tx.transaction.update({
        where: { id: input.transactionId },
        data: { receiptIds: { push: receipt.id } },
      })
    }

    return receipt
  })
}

/** Updates OCR status / extracted payload (used by the receipt OCR pass). */
export async function setReceiptOcr(
  userId: string,
  id: string,
  data: { ocrStatus: OcrStatus; extracted?: Prisma.InputJsonValue }
) {
  await getReceiptOrThrow(userId, id)
  return prisma.receipt.update({
    where: { id },
    data: { ocrStatus: data.ocrStatus, ...(data.extracted ? { extracted: data.extracted } : {}) },
  })
}

/** Soft-deletes a receipt, removes it from its transaction, and deletes the blob. */
export async function deleteReceipt(userId: string, id: string) {
  const receipt = await getReceiptOrThrow(userId, id)

  await prisma.$transaction(async (tx) => {
    await tx.receipt.update({ where: { id }, data: { deletedAt: new Date() } })
    if (receipt.transactionId) {
      const txn = await tx.transaction.findUnique({
        where: { id: receipt.transactionId },
        select: { receiptIds: true },
      })
      if (txn) {
        await tx.transaction.update({
          where: { id: receipt.transactionId },
          data: { receiptIds: txn.receiptIds.filter((rid) => rid !== id) },
        })
      }
    }
  })

  await deleteBlob(receipt.fileUrl)
  return { id }
}
