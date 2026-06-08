import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  MAX_UPLOAD_BYTES,
  RECEIPT_CONTENT_TYPES,
  STATEMENT_CONTENT_TYPES,
} from "@/lib/blob"

/**
 * Issues a client-upload token for receipts/statements. Files are uploaded
 * directly from the browser to Vercel Blob (never through a Server Action body),
 * so large PDFs/images bypass the action payload limit. The DB row is created
 * separately by a server action once the upload returns its URL.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth()
        if (!session?.user?.id) throw new Error("Unauthorized")

        const isStatement = pathname.startsWith("statements/")
        return {
          allowedContentTypes: isStatement
            ? STATEMENT_CONTENT_TYPES
            : RECEIPT_CONTENT_TYPES,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        }
      },
      // Note: not reachable on localhost; the client links the row via a server
      // action using the returned URL. Kept for production webhook completeness.
      onUploadCompleted: async () => {},
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
