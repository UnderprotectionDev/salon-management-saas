import { ConvexError } from "convex/values";

/**
 * Extracts a user-friendly error message from a caught error.
 * Handles ConvexError (with `data.message`), plain Error, and unknown types.
 */
export function getConvexErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): string {
  if (error instanceof ConvexError) {
    const data = error.data as { message?: string } | string;
    if (typeof data === "string") return data;
    return data?.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
