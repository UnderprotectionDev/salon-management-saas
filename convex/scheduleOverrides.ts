import { ConvexError, v } from "convex/values";
import { ErrorCode, orgMutation, orgQuery } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  scheduleOverrideDocValidator,
  scheduleOverrideTypeValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List schedule overrides for a specific staff member.
 * Optionally filter by date range.
 */
export const listByStaff = orgQuery({
  args: {
    staffId: v.id("staff"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.array(scheduleOverrideDocValidator),
  handler: async (ctx, args) => {
    // Verify staff belongs to this organization
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff not found",
      });
    }

    const overrides = await ctx.db
      .query("scheduleOverrides")
      .withIndex("by_staff_date", (q) => q.eq("staffId", args.staffId))
      .collect();

    // Filter by date range in-memory if provided
    if (args.startDate || args.endDate) {
      return overrides.filter((override) => {
        if (args.startDate && override.date < args.startDate) return false;
        if (args.endDate && override.date > args.endDate) return false;
        return true;
      });
    }

    return overrides;
  },
});

/**
 * List all schedule overrides for a specific date across the organization.
 */
export const listByDate = orgQuery({
  args: {
    date: v.string(),
  },
  returns: v.array(scheduleOverrideDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scheduleOverrides")
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
 * Create a schedule override for a staff member.
 * Staff can create their own overrides; admins/owners can create for anyone.
 */
export const create = orgMutation({
  args: {
    staffId: v.id("staff"),
    date: v.string(),
    type: scheduleOverrideTypeValidator,
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  returns: v.id("scheduleOverrides"),
  handler: async (ctx, args) => {
    // Verify staff belongs to this organization
    const targetStaff = await ctx.db.get(args.staffId);
    if (!targetStaff || targetStaff.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff not found",
      });
    }

    // Permission check: own staff profile or owner
    const isOwnProfile = ctx.staff?._id === args.staffId;
    const isOwner = ctx.member.role === "owner";

    if (!isOwnProfile && !isOwner) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You can only create schedule overrides for yourself",
      });
    }

    // Rate limit
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "createScheduleOverride",
      { key: ctx.organizationId },
    );
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Rate limit exceeded. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000 / 60)} minutes.`,
      });
    }

    // Validate: custom_hours requires startTime and endTime
    if (args.type === "custom_hours") {
      if (!args.startTime || !args.endTime) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message:
            "Start time and end time are required for custom hours overrides",
        });
      }
    }

    // Check for duplicate override on the same date for the same staff
    const existing = await ctx.db
      .query("scheduleOverrides")
      .withIndex("by_staff_date", (q) =>
        q.eq("staffId", args.staffId).eq("date", args.date),
      )
      .first();

    if (existing) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "A schedule override already exists for this date",
      });
    }

    // Insert the override
    return await ctx.db.insert("scheduleOverrides", {
      staffId: args.staffId,
      organizationId: ctx.organizationId,
      date: args.date,
      type: args.type,
      startTime: args.startTime,
      endTime: args.endTime,
      reason: args.reason,
      createdAt: Date.now(),
    });
  },
});

/**
 * Remove a schedule override.
 * Staff can remove their own overrides; admins/owners can remove any.
 */
export const remove = orgMutation({
  args: {
    overrideId: v.id("scheduleOverrides"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const override = await ctx.db.get(args.overrideId);

    if (!override) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Schedule override not found",
      });
    }

    // Verify it belongs to this organization
    if (override.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "This override does not belong to your organization",
      });
    }

    // Permission check: own override or owner
    const isOwnOverride = ctx.staff?._id === override.staffId;
    const isOwner = ctx.member.role === "owner";

    if (!isOwnOverride && !isOwner) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You can only remove your own schedule overrides",
      });
    }

    await ctx.db.delete(args.overrideId);
    return true;
  },
});
