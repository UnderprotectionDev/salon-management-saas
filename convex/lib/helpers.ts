import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { ErrorCode } from "./functions";
import { isValidTurkishPhone } from "./phone";

/**
 * Assert a document exists and belongs to the current organization.
 * Throws NOT_FOUND if null or org mismatch.
 */
export function assertBelongsToOrg<
  T extends { organizationId: Id<"organization"> },
>(
  doc: T | null,
  organizationId: Id<"organization">,
  resourceName = "Resource",
): asserts doc is T {
  if (!doc || doc.organizationId !== organizationId) {
    throw new ConvexError({
      code: ErrorCode.NOT_FOUND,
      message: `${resourceName} not found`,
    });
  }
}

/**
 * Validate a Turkish phone number, throwing VALIDATION_ERROR if invalid.
 */
export function validatePhoneOrThrow(phone: string): void {
  if (!isValidTurkishPhone(phone)) {
    throw new ConvexError({
      code: ErrorCode.VALIDATION_ERROR,
      message:
        "Invalid Turkish phone number. Expected format: +90 5XX XXX XX XX",
    });
  }
}
