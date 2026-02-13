import { ConvexError } from "convex/values";
import { ErrorCode } from "./functions";
import { isValidTurkishPhone } from "./phone";

/**
 * Trims and validates string length.
 * Returns the trimmed string or throws ConvexError.
 */
export function validateString(
  value: string,
  field: string,
  opts: { min?: number; max?: number },
): string {
  const trimmed = value.trim();
  if (opts.min !== undefined && trimmed.length < opts.min) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: `${field} must be at least ${opts.min} characters`,
    });
  }
  if (opts.max !== undefined && trimmed.length > opts.max) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: `${field} must be at most ${opts.max} characters`,
    });
  }
  return trimmed;
}

/**
 * Validates a URL slug: trims, lowercases, checks format and length (2-50).
 * Returns the cleaned slug or throws ConvexError.
 */
export function validateSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (
    slug.length < 2 ||
    slug.length > 50 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message:
        "URL slug must be 2-50 characters, start and end with a letter or number, and can only contain lowercase letters, numbers, and hyphens (no consecutive hyphens)",
    });
  }
  return slug;
}

/**
 * Validates email format.
 * Returns the email or throws ConvexError.
 */
export function validateEmail(value: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: "Invalid email format",
    });
  }
  return value;
}

/**
 * Validates Turkish phone format (+90 5XX XXX XX XX).
 * Returns the phone string or throws ConvexError.
 */
export function validatePhone(value: string): string {
  if (!isValidTurkishPhone(value)) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: "Invalid phone format. Expected: +90 5XX XXX XX XX",
    });
  }
  return value;
}

/**
 * Validates URL format (http/https). Allows empty string.
 * Returns the value or throws ConvexError.
 */
export function validateUrl(value: string, field: string): string {
  if (value !== "" && !/^https?:\/\/.+/i.test(value)) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: `${field} must be a valid URL`,
    });
  }
  return value;
}
