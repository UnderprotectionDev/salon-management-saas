import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { isOverlapping } from "./lib/dateTime";
import { authedMutation, ErrorCode } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";

/**
 * Acquire a slot lock to prevent double booking.
 * Each session can hold only one lock at a time.
 * Lock expires after 2 minutes.
 */
export const acquire = authedMutation({
  args: {
    organizationId: v.id("organization"),
    staffId: v.id("staff"),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    sessionId: v.string(),
  },
  returns: v.object({
    lockId: v.id("slotLocks"),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    // Rate limit (per user)
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "acquireSlotLock", {
      key: ctx.user._id,
    });
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Too many slot lock attempts. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000)} seconds.`,
      });
    }

    // Validate time range
    if (args.startTime < 0 || args.endTime < 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Time values must be non-negative",
      });
    }
    if (args.endTime <= args.startTime) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "End time must be after start time",
      });
    }

    // Cross-validate: staff must belong to the organization
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.organizationId !== args.organizationId) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Staff does not belong to this organization",
      });
    }

    const now = Date.now();

    // Release any existing lock for this session
    const existingLocks = await ctx.db
      .query("slotLocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const lock of existingLocks) {
      await ctx.db.delete(lock._id);
    }

    // Check for conflicting locks/appointments on the same staff + time
    const staffLocks = await ctx.db
      .query("slotLocks")
      .withIndex("by_staff_date", (q) =>
        q.eq("staffId", args.staffId).eq("date", args.date),
      )
      .collect();
    const activeLocks = staffLocks.filter((l) => l.expiresAt > now);

    for (const lock of activeLocks) {
      if (
        isOverlapping(
          args.startTime,
          args.endTime,
          lock.startTime,
          lock.endTime,
        )
      ) {
        throw new ConvexError({
          code: ErrorCode.ALREADY_EXISTS,
          message:
            "This time slot is currently being booked by another customer",
        });
      }
    }

    // Check for conflicting appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_staff_date", (q) =>
        q.eq("staffId", args.staffId).eq("date", args.date),
      )
      .collect();
    const activeAppts = appointments.filter(
      (a) => a.status !== "cancelled" && a.status !== "no_show",
    );

    for (const appt of activeAppts) {
      if (
        isOverlapping(
          args.startTime,
          args.endTime,
          appt.startTime,
          appt.endTime,
        )
      ) {
        throw new ConvexError({
          code: ErrorCode.ALREADY_EXISTS,
          message: "This time slot is no longer available",
        });
      }
    }

    // Create lock with 2-minute TTL
    const expiresAt = now + 120_000;
    const lockId = await ctx.db.insert("slotLocks", {
      organizationId: args.organizationId,
      staffId: args.staffId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      sessionId: args.sessionId,
      expiresAt,
    });

    return { lockId, expiresAt };
  },
});

/**
 * Release a slot lock.
 */
export const release = authedMutation({
  args: {
    lockId: v.id("slotLocks"),
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lock = await ctx.db.get(args.lockId);
    if (lock && lock.sessionId === args.sessionId) {
      await ctx.db.delete(args.lockId);
    }
    return null;
  },
});

/**
 * Clean up expired slot locks.
 * Called by cron job every minute.
 */
export const cleanupExpired = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("slotLocks")
      .withIndex("by_expiry")
      .collect();
    const toDelete = expired.filter((l) => l.expiresAt < now);

    for (const lock of toDelete) {
      await ctx.db.delete(lock._id);
    }

    return toDelete.length;
  },
});
