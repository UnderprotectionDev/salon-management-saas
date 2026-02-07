/**
 * Confirmation code generator for appointments.
 * Generates 6-character alphanumeric codes excluding ambiguous chars (0, O, I, 1).
 */

import type { GenericDatabaseReader } from "convex/server";
import type { DataModel } from "../_generated/dataModel";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateConfirmationCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/**
 * Generate a confirmation code that is unique within the organization.
 * Retries up to 10 times if a collision is found.
 */
export async function ensureUniqueCode(
  db: GenericDatabaseReader<DataModel>,
  organizationId: string,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateConfirmationCode();
    const existing = await db
      .query("appointments")
      .withIndex("by_confirmation", (q) => q.eq("confirmationCode", code))
      .first();
    if (!existing || existing.organizationId !== organizationId) {
      return code;
    }
  }
  // Extremely unlikely to reach here with 30^6 = ~729M combinations
  throw new Error(
    "Failed to generate unique confirmation code after 10 attempts",
  );
}
