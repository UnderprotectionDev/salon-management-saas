/**
 * Shared helpers for AI action modules.
 */
import { ConvexError } from "convex/values";

/**
 * Execute an async function with exponential backoff + jitter.
 * Retries on any error, re-throws on final failure.
 *
 * @param fn       Async function to execute
 * @param maxRetries  Max attempts (default 3)
 * @param baseDelayMs Base delay in ms (default 1000, doubles each attempt)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // ConvexError (e.g. FORBIDDEN, VALIDATION_ERROR) are permanent — don't retry
      if (error instanceof ConvexError) throw error;
      lastError = error;
      if (attempt < maxRetries - 1) {
        // Exponential backoff + jitter
        const delay = baseDelayMs * 2 ** attempt + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/** Extract a human-readable error message from any caught error. */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof ConvexError) {
    return (error.data as { message?: string })?.message ?? "Validation error";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error occurred";
}
