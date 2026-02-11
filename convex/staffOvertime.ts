import { ConvexError, v } from "convex/values";
import { ErrorCode, orgMutation, orgQuery } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import { staffOvertimeDocValidator } from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List overtime entries for a specific staff member.
 * Optionally filter by date range.
 */
export const listByStaff = orgQuery({
  args: {
    staffId: v.id("staff"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.array(staffOvertimeDocValidator),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("staffOvertime")
      .withIndex("by_staff_date", (q) => q.eq("staffId", args.staffId))
      .collect();

    // Filter by date range in-memory if provided
    if (args.startDate || args.endDate) {
      return entries.filter((entry) => {
        if (args.startDate && entry.date < args.startDate) return false;
        if (args.endDate && entry.date > args.endDate) return false;
        return true;
      });
    }

    return entries;
  },
});

/**
 * List all overtime entries for a specific date across the organization.
 */
export const listByDate = orgQuery({
  args: {
    date: v.string(),
  },
  returns: v.array(staffOvertimeDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staffOvertime")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .collect();
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create an overtime entry for a staff member.
 * Staff can create their own overtime; admins/owners can create for anyone.
 */
export const create = orgMutation({
  args: {
    staffId: v.id("staff"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.id("staffOvertime"),
  handler: async (ctx, args) => {
    // Permission check: own staff profile or owner
    const isOwnProfile = ctx.staff?._id === args.staffId;
    const isOwner = ctx.member.role === "owner";

    if (!isOwnProfile && !isOwner) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You can only create overtime entries for yourself",
      });
    }

    // Rate limit
    await rateLimiter.limit(ctx, "createOvertime", {
      key: args.staffId,
    });

    // Validate: startTime must be before endTime (HH:MM string comparison works)
    if (args.startTime >= args.endTime) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Start time must be before end time",
      });
    }

    // Insert the overtime entry
    return await ctx.db.insert("staffOvertime", {
      staffId: args.staffId,
      organizationId: ctx.organizationId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      reason: args.reason,
      createdAt: Date.now(),
    });
  },
});

/**
 * Remove an overtime entry.
 * Staff can remove their own entries; admins/owners can remove any.
 */
export const remove = orgMutation({
  args: {
    overtimeId: v.id("staffOvertime"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.overtimeId);

    if (!entry) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Overtime entry not found",
      });
    }

    // Verify it belongs to this organization
    if (entry.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "This overtime entry does not belong to your organization",
      });
    }

    // Permission check: own entry or owner
    const isOwnEntry = ctx.staff?._id === entry.staffId;
    const isOwner = ctx.member.role === "owner";

    if (!isOwnEntry && !isOwner) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You can only remove your own overtime entries",
      });
    }

    await ctx.db.delete(args.overtimeId);
    return true;
  },
});
