import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { ErrorCode, orgQuery, ownerMutation } from "./lib/functions";
import { internalMutation } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  subscriptionDetailValidator,
  subscriptionStatusValidator,
} from "./lib/validators";

/** Grace period duration: 7 days in milliseconds */
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

// =============================================================================
// Queries
// =============================================================================

/**
 * Get subscription status for the billing page.
 */
export const getSubscriptionStatus = orgQuery({
  args: {},
  returns: subscriptionDetailValidator,
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .first();

    return {
      status: settings?.subscriptionStatus ?? "pending_payment",
      plan: settings?.subscriptionPlan,
      polarSubscriptionId: settings?.polarSubscriptionId,
      trialEndsAt: settings?.trialEndsAt,
      currentPeriodEnd: settings?.currentPeriodEnd,
      gracePeriodEndsAt: settings?.gracePeriodEndsAt,
      suspendedAt: settings?.suspendedAt,
      cancelledAt: settings?.cancelledAt,
    };
  },
});

/**
 * Quick boolean check if org is suspended.
 */
export const isSuspended = orgQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .first();

    return (
      settings?.subscriptionStatus === "suspended" ||
      settings?.subscriptionStatus === "pending_payment"
    );
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Cancel subscription (owner only).
 * Sets status to "canceled" and records cancelledAt.
 */
export const cancelSubscription = ownerMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await rateLimiter.limit(ctx, "cancelSubscription", {
      key: ctx.organizationId,
    });

    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .first();

    if (!settings) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Organization settings not found",
      });
    }

    if (
      settings.subscriptionStatus !== "active" &&
      settings.subscriptionStatus !== "trialing"
    ) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "No active subscription to cancel",
      });
    }

    await ctx.db.patch(settings._id, {
      subscriptionStatus: "canceled",
      cancelledAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule Polar API cancellation
    if (settings.polarSubscriptionId) {
      await ctx.scheduler.runAfter(0, internal.polarActions.cancelInPolar, {
        polarSubscriptionId: settings.polarSubscriptionId,
      });
    }

    return null;
  },
});

// =============================================================================
// Internal Mutations (for webhooks & crons)
// =============================================================================

/**
 * Update subscription status from a Polar webhook event.
 */
export const updateFromWebhook = internalMutation({
  args: {
    organizationId: v.id("organization"),
    subscriptionStatus: subscriptionStatusValidator,
    polarSubscriptionId: v.optional(v.string()),
    polarCustomerId: v.optional(v.string()),
    subscriptionPlan: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    if (!settings) return null;

    const now = Date.now();
    const updates: Record<string, unknown> = {
      subscriptionStatus: args.subscriptionStatus,
      updatedAt: now,
    };

    if (args.polarSubscriptionId !== undefined) {
      updates.polarSubscriptionId = args.polarSubscriptionId;
    }
    if (args.polarCustomerId !== undefined) {
      updates.polarCustomerId = args.polarCustomerId;
    }
    if (args.subscriptionPlan !== undefined) {
      updates.subscriptionPlan = args.subscriptionPlan;
    }
    if (args.currentPeriodEnd !== undefined) {
      updates.currentPeriodEnd = args.currentPeriodEnd;
    }

    // If becoming active, clear grace period and suspension
    if (args.subscriptionStatus === "active") {
      updates.gracePeriodEndsAt = undefined;
      updates.suspendedAt = undefined;
      updates.cancelledAt = undefined;
    }

    // If past_due, start 7-day grace period
    if (args.subscriptionStatus === "past_due" && !settings.gracePeriodEndsAt) {
      updates.gracePeriodEndsAt = now + GRACE_PERIOD_MS;
    }

    await ctx.db.patch(settings._id, updates);
    return null;
  },
});

/**
 * Cron: Check grace periods and suspend orgs that have expired.
 */
export const checkGracePeriods = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Find settings with past_due status using index
    const pastDueSettings = await ctx.db
      .query("organizationSettings")
      .withIndex("by_subscription_status", (q) =>
        q.eq("subscriptionStatus", "past_due"),
      )
      .collect();

    for (const settings of pastDueSettings) {
      if (settings.gracePeriodEndsAt && settings.gracePeriodEndsAt <= now) {
        await ctx.db.patch(settings._id, {
          subscriptionStatus: "suspended",
          suspendedAt: now,
          updatedAt: now,
        });
      }
    }
    return null;
  },
});

/**
 * Cron: Check trial expirations and suspend orgs with expired trials.
 */
export const checkTrialExpirations = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();

    // Find settings with trialing status using index
    const trialingSettings = await ctx.db
      .query("organizationSettings")
      .withIndex("by_subscription_status", (q) =>
        q.eq("subscriptionStatus", "trialing"),
      )
      .collect();

    for (const settings of trialingSettings) {
      if (settings.trialEndsAt && settings.trialEndsAt <= now) {
        await ctx.db.patch(settings._id, {
          subscriptionStatus: "suspended",
          suspendedAt: now,
          updatedAt: now,
        });
      }
    }
    return null;
  },
});
