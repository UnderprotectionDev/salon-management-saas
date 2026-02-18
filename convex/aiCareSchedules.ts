/**
 * AI Care Schedules — personalized care calendar based on visit history + analysis
 *
 * User-scoped: care schedules belong to the user, not an org.
 * Credits are deducted from the user's global pool.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalQuery } from "./_generated/server";
import { CREDIT_COSTS } from "./lib/aiConstants";
import { authedMutation, authedQuery, internalMutation } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  aiCareScheduleDocValidator,
  salonTypeValidator,
} from "./lib/validators";

// =============================================================================
// Mutations
// =============================================================================

/**
 * Generate a personalized care schedule for the authenticated user.
 * Deducts 2 credits from user's global pool.
 * salonType determines what kind of care advice to generate.
 */
export const generateSchedule = authedMutation({
  args: {
    salonType: salonTypeValidator,
    organizationId: v.optional(v.id("organization")),
  },
  returns: v.id("aiCareSchedules"),
  handler: async (ctx, args) => {
    const userId = ctx.user._id;

    await rateLimiter.limit(ctx, "aiCareSchedule", {
      key: userId,
      throws: true,
    });

    // Deduct credits from user's global pool
    await ctx.runMutation(internal.aiCredits.deductCredits, {
      userId,
      poolType: "customer",
      amount: CREDIT_COSTS.careSchedule,
      featureType: "careSchedule",
      description: `Care schedule (${args.salonType})`,
    });

    // Expire any active schedule for this user + salonType
    const existing = await ctx.db
      .query("aiCareSchedules")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "active"),
      )
      .filter((q) => q.eq(q.field("salonType"), args.salonType))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "expired",
        updatedAt: Date.now(),
      });
    }

    const now = Date.now();

    const scheduleId = await ctx.db.insert("aiCareSchedules", {
      userId,
      organizationId: args.organizationId,
      salonType: args.salonType,
      recommendations: [],
      status: "active",
      creditCost: CREDIT_COSTS.careSchedule,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.aiActions.runCareScheduleGeneration,
      { scheduleId },
    );

    return scheduleId;
  },
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get the active care schedule for the authenticated user + salonType.
 */
export const getMySchedule = authedQuery({
  args: {
    salonType: v.optional(salonTypeValidator),
  },
  returns: v.union(aiCareScheduleDocValidator, v.null()),
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("aiCareSchedules")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", ctx.user._id).eq("status", "active"),
      );

    if (args.salonType) {
      return await query
        .filter((q) => q.eq(q.field("salonType"), args.salonType))
        .order("desc")
        .first();
    }

    return await query.order("desc").first();
  },
});

/**
 * List all care schedules for the authenticated user.
 */
export const listMySchedules = authedQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(aiCareScheduleDocValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    return await ctx.db
      .query("aiCareSchedules")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(limit);
  },
});

// =============================================================================
// Internal Functions (called by aiActions + cron)
// =============================================================================

export const getScheduleInternal = internalQuery({
  args: { scheduleId: v.id("aiCareSchedules") },
  returns: v.union(aiCareScheduleDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.scheduleId);
  },
});

/**
 * Get user's recent appointments across ALL orgs (for care schedule context).
 */
export const getUserAppointments = internalQuery({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      date: v.string(),
      status: v.string(),
      services: v.array(v.string()),
      orgName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Find customer records for this user across all orgs
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(10);

    if (customers.length === 0) return [];

    const result = [];

    for (const customer of customers) {
      const appointments = await ctx.db
        .query("appointments")
        .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
        .order("desc")
        .take(limit);

      const org = await ctx.db.get(customer.organizationId);

      for (const appt of appointments) {
        const services = await ctx.db
          .query("appointmentServices")
          .withIndex("by_appointment", (q) => q.eq("appointmentId", appt._id))
          .collect();

        result.push({
          date: appt.date,
          status: appt.status,
          services: services.map((s) => s.serviceName),
          orgName: org?.name,
        });
      }
    }

    // Sort by date descending and take limit
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result.slice(0, limit);
  },
});

/**
 * Get user's latest photo analysis (for care schedule context).
 */
export const getLatestUserAnalysis = internalQuery({
  args: {
    userId: v.string(),
    salonType: v.optional(salonTypeValidator),
  },
  returns: v.union(
    v.object({
      salonType: salonTypeValidator,
      result: v.optional(v.any()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("aiAnalyses")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "completed"));

    const analysis = await query.order("desc").first();

    if (!analysis) return null;
    return {
      salonType: analysis.salonType,
      result: analysis.result,
    };
  },
});

/**
 * Get active services for an org (optional — for service matching if org is provided).
 */
export const getActiveServices = internalQuery({
  args: { organizationId: v.id("organization") },
  returns: v.array(
    v.object({
      _id: v.id("services"),
      name: v.string(),
      duration: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .collect();

    return services.map((s) => ({
      _id: s._id,
      name: s.name,
      duration: s.duration,
    }));
  },
});

// Keep legacy query for backward compat (getLatestAnalysis used in aiActions)
export const getLatestAnalysis = internalQuery({
  args: {
    organizationId: v.optional(v.id("organization")),
    customerId: v.optional(v.id("customers")),
    userId: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      salonType: salonTypeValidator,
      result: v.optional(v.any()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    if (args.userId) {
      const analysis = await ctx.db
        .query("aiAnalyses")
        .withIndex("by_user", (q) => q.eq("userId", args.userId ?? ""))
        .filter((q) => q.eq(q.field("status"), "completed"))
        .order("desc")
        .first();
      if (!analysis) return null;
      return { salonType: analysis.salonType, result: analysis.result };
    }
    return null;
  },
});

export const completeSchedule = internalMutation({
  args: {
    scheduleId: v.id("aiCareSchedules"),
    recommendations: v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        recommendedDate: v.string(),
        serviceId: v.optional(v.id("services")),
      }),
    ),
    nextCheckDate: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scheduleId, {
      recommendations: args.recommendations,
      nextCheckDate: args.nextCheckDate,
      status: "active",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const failSchedule = internalMutation({
  args: {
    scheduleId: v.id("aiCareSchedules"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const schedule = await ctx.db.get(args.scheduleId);
    if (!schedule) return null;

    await ctx.db.patch(args.scheduleId, {
      status: "expired",
      updatedAt: Date.now(),
    });

    // Refund credits to user pool
    if (schedule.userId) {
      await ctx.runMutation(internal.aiCredits.refundCredits, {
        userId: schedule.userId,
        poolType: "customer",
        amount: schedule.creditCost,
        featureType: "careSchedule",
        referenceId: args.scheduleId,
        description: "Refund for failed care schedule generation",
      });
    }

    return null;
  },
});

/**
 * Weekly cron: check active care schedules with approaching check dates.
 */
export const checkAndNotify = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);

    const dueSchedules = await ctx.db
      .query("aiCareSchedules")
      .withIndex("by_next_check")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.neq(q.field("nextCheckDate"), undefined),
          q.lte(q.field("nextCheckDate"), today),
        ),
      )
      .take(100);

    for (const schedule of dueSchedules) {
      console.log(
        `[Care Schedule] Check due for user ${schedule.userId}, salonType: ${schedule.salonType ?? "unknown"}`,
      );

      const nextDate = new Date(schedule.nextCheckDate as string);
      nextDate.setDate(nextDate.getDate() + 7);
      const newNextCheck = nextDate.toISOString().slice(0, 10);

      await ctx.db.patch(schedule._id, {
        nextCheckDate: newNextCheck,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
