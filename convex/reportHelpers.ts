/**
 * Shared helpers for report modules.
 */
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import { ErrorCode } from "./lib/functions";
import { getDatesBetween } from "./lib/scheduleResolver";

export async function getAppointmentsForDateRange(
  db: DatabaseReader,
  organizationId: Id<"organization">,
  startDate: string,
  endDate: string,
) {
  return db
    .query("appointments")
    .withIndex("by_org_date", (q) =>
      q
        .eq("organizationId", organizationId)
        .gte("date", startDate)
        .lte("date", endDate),
    )
    .collect();
}

export function validateDateRange(startDate: string, endDate: string) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: "Date must be in YYYY-MM-DD format",
    });
  }
  if (startDate > endDate) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: "Start date must be before end date",
    });
  }
  const dates = getDatesBetween(startDate, endDate);
  if (dates.length > 366) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: "Date range cannot exceed 1 year",
    });
  }
  return dates;
}
