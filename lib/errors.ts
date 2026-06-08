/**
 * Typed errors thrown by the service layer (lib/services/*). Both adapters —
 * Server Actions and REST route handlers — translate these into their own
 * response shapes (see lib/api-auth.ts and the action adapters).
 */
export type ServiceErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "CONFLICT"
  | "INTERNAL"

export class ServiceError extends Error {
  constructor(
    public code: ServiceErrorCode,
    message: string
  ) {
    super(message)
    this.name = "ServiceError"
  }
}

/** Maps a ServiceError code to an HTTP status for the REST layer. */
export function statusForCode(code: ServiceErrorCode): number {
  switch (code) {
    case "NOT_FOUND":
      return 404
    case "FORBIDDEN":
      return 403
    case "UNAUTHORIZED":
      return 401
    case "VALIDATION":
      return 422
    case "CONFLICT":
      return 409
    case "INTERNAL":
    default:
      return 500
  }
}

/** Convenience constructors. */
export const notFound = (msg = "Not found") => new ServiceError("NOT_FOUND", msg)
export const forbidden = (msg = "Forbidden") => new ServiceError("FORBIDDEN", msg)
export const validation = (msg = "Invalid input") => new ServiceError("VALIDATION", msg)
export const conflict = (msg = "Conflict") => new ServiceError("CONFLICT", msg)
