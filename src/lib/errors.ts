import { ConvexError } from "convex/values";

/**
 * Extract a user-friendly error message from any error type.
 * Handles ConvexError with data.message, standard Error.message, and unknown errors.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Bir hata oluştu",
): string {
  if (error instanceof ConvexError) {
    const data = error.data as { message?: string; code?: string };
    return data?.message ?? fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
