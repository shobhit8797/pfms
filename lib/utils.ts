import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Serializes Prisma Decimal objects to numbers for Client Components
 * Recursively processes objects and arrays
 *
 * Note: Uses duck-typing to detect Decimal objects without importing Prisma runtime
 */
export function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  // Check if it's a Decimal by duck-typing
  // Prisma Decimals have toNumber() method and constructor name contains "Decimal"
  if (
    typeof obj === "object" &&
    "toNumber" in obj &&
    typeof (obj as any).toNumber === "function"
  ) {
    const constructorName = obj.constructor?.name || ""
    if (constructorName.includes("Decimal")) {
      return (obj as any).toNumber() as T
    }
  }

  if (obj instanceof Date) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimals) as T
  }

  if (typeof obj === "object") {
    const serialized: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeDecimals(obj[key])
      }
    }
    return serialized
  }

  return obj
}
