import { ConvexError, v } from "convex/values";
import {
  ErrorCode,
  orgMutation,
  orgQuery,
  ownerMutation,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  timeOffRequestDocValidator,
  timeOffRequestWithStaffValidator,
  timeOffStatusValidator,
  timeOffTypeValidator,
} from "./lib/validators";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get all dates between start and end (inclusive) as "YYYY-MM-DD" strings.
 */
function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (current <= last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// =============================================================================
// Queries
// =============================================================================

/**
 * List time-off requests for the organization.
 * Admins/owners see all requests; members see only their own.
 * Optionally filter by status.
 */
export const listByOrg = orgQuery({
  args: {
    status: v.optional(timeOffStatusValidator),
  },
  returns: v.array(timeOffRequestWithStaffValidator),
  handler: async (ctx, args) => {
    const isOwner = ctx.member.role === "owner";

    let requests;

    if (args.status) {
      requests = await ctx.db
        .query("timeOffRequests")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", ctx.organizationId).eq("status", args.status!),
        )
        .collect();
    } else {
      requests = await ctx.db
        .query("timeOffRequests")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", ctx.organizationId),
        )
        .collect();
    }

    // Members can only see their own requests
    if (!isOwner) {
      requests = requests.filter(
        (r) => ctx.staff && r.staffId === ctx.staff._id,
      );
    }

    // Batch fetch all referenced staff (avoids N+1)
    const staffIds = [
      ...new Set([
        ...requests.map((r) => r.staffId),
        ...requests
          .map((r) => r.approvedBy)
          .filter((id): id is NonNullable<typeof id> => id != null),
      ]),
    ];
    const staffDocs = await Promise.all(staffIds.map((id) => ctx.db.get(id)));
    const staffMap = new Map(
      staffDocs
        .filter((s): s is NonNullable<typeof s> => s != null)
        .map((s) => [s._id, s.name]),
    );

    return requests.map((request) => ({
      ...request,
      staffName: staffMap.get(request.staffId) ?? "Unknown",
      approvedByName: request.approvedBy
        ? (staffMap.get(request.approvedBy) ?? "Unknown")
        : undefined,
    }));
  },
});

/**
 * Get current user's time-off requests.
 */
export const getMyRequests = orgQuery({
  args: {},
  returns: v.array(timeOffRequestDocValidator),
  handler: async (ctx) => {
    if (!ctx.staff) {
      return [];
    }

    return await ctx.db
      .query("timeOffRequests")
      .withIndex("by_staff", (q) => q.eq("staffId", ctx.staff!._id))
      .collect();
  },
});

/**
 * Get count of pending time-off requests for the organization.
 */
export const getPendingCount = orgQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("timeOffRequests")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("status", "pending"),
      )
      .collect();

    return pending.length;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new time-off request (any staff member).
 */
export const request = orgMutation({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    type: timeOffTypeValidator,
    reason: v.optional(v.string()),
  },
  returns: v.id("timeOffRequests"),
  handler: async (ctx, args) => {
    if (!ctx.staff) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Staff profile required",
      });
    }

    // Rate limit per staff member
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "createTimeOffRequest",
      { key: ctx.staff._id },
    );
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Rate limit exceeded. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000 / 60)} minutes.`,
      });
    }

    // Validate date range
    if (args.startDate > args.endDate) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Start date must be before or equal to end date",
      });
    }

    return await ctx.db.insert("timeOffRequests", {
      staffId: ctx.staff._id,
      organizationId: ctx.organizationId,
      startDate: args.startDate,
      endDate: args.endDate,
      type: args.type,
      status: "pending",
      reason: args.reason,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Approve a pending time-off request (admin/owner only).
 * Creates schedule overrides for each day in the range.
 */
export const approve = ownerMutation({
  args: {
    requestId: v.id("timeOffRequests"),
  },
  returns: v.id("timeOffRequests"),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Time-off request not found",
      });
    }

    if (request.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this request",
      });
    }

    if (request.status !== "pending") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Only pending requests can be approved",
      });
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "approved",
      approvedBy: ctx.staff?._id,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create schedule overrides for each day in the range
    const dates = getDatesBetween(request.startDate, request.endDate);
    for (const date of dates) {
      // Check if override already exists for this staff+date
      const existing = await ctx.db
        .query("scheduleOverrides")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", request.staffId).eq("date", date),
        )
        .first();

      if (!existing) {
        await ctx.db.insert("scheduleOverrides", {
          staffId: request.staffId,
          organizationId: ctx.organizationId,
          date,
          type: "time_off",
          reason: `Time off: ${request.type}`,
          createdAt: Date.now(),
        });
      }
    }

    return args.requestId;
  },
});

/**
 * Reject a pending time-off request (admin/owner only).
 * If the request was previously approved, also removes associated schedule overrides.
 */
export const reject = ownerMutation({
  args: {
    requestId: v.id("timeOffRequests"),
    rejectionReason: v.optional(v.string()),
  },
  returns: v.id("timeOffRequests"),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Time-off request not found",
      });
    }

    if (request.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this request",
      });
    }

    // Allow rejecting both pending and approved requests
    if (request.status === "rejected") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "This request has already been rejected",
      });
    }

    // If previously approved, remove associated schedule overrides
    if (request.status === "approved") {
      const dates = getDatesBetween(request.startDate, request.endDate);
      for (const date of dates) {
        const override = await ctx.db
          .query("scheduleOverrides")
          .withIndex("by_staff_date", (q) =>
            q.eq("staffId", request.staffId).eq("date", date),
          )
          .filter((q) => q.eq(q.field("type"), "time_off"))
          .first();

        if (override) {
          await ctx.db.delete(override._id);
        }
      }
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      rejectionReason: args.rejectionReason,
      reviewedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.requestId;
  },
});

/**
 * Cancel a time-off request (own requests only).
 * If approved, also removes associated schedule overrides.
 */
export const cancel = orgMutation({
  args: {
    requestId: v.id("timeOffRequests"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Time-off request not found",
      });
    }

    if (request.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this request",
      });
    }

    if (request.staffId !== ctx.staff?._id) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You can only cancel your own requests",
      });
    }

    if (request.status === "rejected") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "This request has already been rejected",
      });
    }

    // If approved, remove associated schedule overrides
    if (request.status === "approved") {
      const dates = getDatesBetween(request.startDate, request.endDate);
      for (const date of dates) {
        const override = await ctx.db
          .query("scheduleOverrides")
          .withIndex("by_staff_date", (q) =>
            q.eq("staffId", request.staffId).eq("date", date),
          )
          .filter((q) => q.eq(q.field("type"), "time_off"))
          .first();

        if (override) {
          await ctx.db.delete(override._id);
        }
      }
    }

    // Delete the cancelled request
    await ctx.db.delete(args.requestId);

    return true;
  },
});
