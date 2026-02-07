import { z } from "zod";

const TURKISH_PHONE_REGEX = /^\+90 5\d{2} \d{3} \d{2} \d{2}$/;

export const turkishPhoneSchema = z
  .string()
  .regex(TURKISH_PHONE_REGEX, "Phone must be in format: +90 5XX XXX XX XX");

/**
 * Format raw digits into Turkish phone format
 * Accepts: 5XXXXXXXXX, 905XXXXXXXXX, or already formatted
 */
export function formatPhoneInput(value: string): string {
  // Strip everything except digits and leading +
  const hasPlus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");

  // Already formatted or too short to format
  if (TURKISH_PHONE_REGEX.test(value)) return value;

  // 10 digits starting with 5 (local format)
  if (digits.length === 10 && digits.startsWith("5")) {
    return `+90 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }

  // 12 digits starting with 90 (international without +)
  if (digits.length === 12 && digits.startsWith("90")) {
    const d = digits.slice(2);
    return `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
  }

  // Partial formatting as user types
  if (hasPlus || digits.startsWith("90")) {
    const d = digits.startsWith("90") ? digits.slice(2) : digits;
    if (d.length <= 3) return `+90 ${d}`;
    if (d.length <= 6) return `+90 ${d.slice(0, 3)} ${d.slice(3)}`;
    if (d.length <= 8)
      return `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
    if (d.length <= 10)
      return `+90 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
  }

  return value;
}
