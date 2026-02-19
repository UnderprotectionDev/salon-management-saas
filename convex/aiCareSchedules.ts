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
      amount: CREDIT_COSTS.careSchedule,
      featureType: "careSchedule",
      description: `Care schedule (${args.salonType})`,
    });

    // Expire any active schedule for this user + salonType (compound index, no filter)
    const existing = await ctx.db
      .query("aiCareSchedules")
      .withIndex("by_user_status_salonType", (q) =>
        q
          .eq("userId", userId)
          .eq("status", "active")
          .eq("salonType", args.salonType),
      )
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
    // When salonType is specified, use compound index (no filter needed)
    if (args.salonType) {
      const salonType = args.salonType;
      return await ctx.db
        .query("aiCareSchedules")
        .withIndex("by_user_status_salonType", (q) =>
          q
            .eq("userId", ctx.user._id)
            .eq("status", "active")
            .eq("salonType", salonType),
        )
        .order("desc")
        .first();
    }

    return await ctx.db
      .query("aiCareSchedules")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", ctx.user._id).eq("status", "active"),
      )
      .order("desc")
      .first();
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
 *
 * Optimized: avoids N+1 queries by batch-fetching orgs and appointment services.
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

    // 1. Find customer records for this user across all orgs
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(10);

    if (customers.length === 0) return [];

    // 2. Batch fetch all orgs (one query per unique org, instead of one per appointment)
    const uniqueOrgIds = [...new Set(customers.map((c) => c.organizationId))];
    const orgDocs = await Promise.all(uniqueOrgIds.map((id) => ctx.db.get(id)));
    const orgMap = new Map(
      orgDocs
        .filter((o): o is NonNullable<typeof o> => o !== null)
        .map((o) => [o._id, o]),
    );

    // 3. Fetch appointments for all customers in parallel.
    // Cap per-customer to avoid one customer dominating the total limit.
    const perCustomerLimit = Math.min(
      limit,
      Math.ceil(limit / customers.length) + 5,
    );
    const appointmentsByCustomer = await Promise.all(
      customers.map((customer) =>
        ctx.db
          .query("appointments")
          .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
          .order("desc")
          .take(perCustomerLimit),
      ),
    );

    // Flatten and collect all appointments with their customer context
    const allAppointments = appointmentsByCustomer.flatMap((appts, idx) =>
      appts.map((appt) => ({
        appt,
        orgId: customers[idx].organizationId,
      })),
    );

    // Sort by date descending and take limit before fetching services
    allAppointments.sort((a, b) => b.appt.date.localeCompare(a.appt.date));
    const topAppointments = allAppointments.slice(0, limit);

    // 4. Batch fetch appointment services for all top appointments in parallel
    const servicesByAppt = await Promise.all(
      topAppointments.map(({ appt }) =>
        ctx.db
          .query("appointmentServices")
          .withIndex("by_appointment", (q) => q.eq("appointmentId", appt._id))
          .collect(),
      ),
    );

    return topAppointments.map(({ appt, orgId }, idx) => ({
      date: appt.date,
      status: appt.status,
      services: servicesByAppt[idx].map((s) => s.serviceName),
      orgName: orgMap.get(orgId)?.name,
    }));
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
    // Use by_user_status compound index to avoid full scan + filter
    const analysis = await ctx.db
      .query("aiAnalyses")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("status", "completed"),
      )
      .order("desc")
      .first();

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

export const setScheduleThreadId = internalMutation({
  args: {
    scheduleId: v.id("aiCareSchedules"),
    agentThreadId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scheduleId, { agentThreadId: args.agentThreadId });
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
    await ctx.db.patch(args.scheduleId, {
      status: "expired",
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Weekly cron: check active care schedules with approaching check dates.
 * For each due schedule:
 *  1. Sends a care reminder email to the user
 *  2. Bumps nextCheckDate by 7 days (so the cron doesn't fire again immediately)
 */
export const checkAndNotify = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const today = new Date().toISOString().slice(0, 10);

    // Use compound index: status="active" + nextCheckDate range (no filter needed).
    // "1900-01-01" lower bound excludes records with undefined nextCheckDate.
    const dueSchedules = await ctx.db
      .query("aiCareSchedules")
      .withIndex("by_status_nextCheck", (q) =>
        q
          .eq("status", "active")
          .gte("nextCheckDate", "1900-01-01")
          .lte("nextCheckDate", today),
      )
      .take(100);

    const now = Date.now();

    for (const schedule of dueSchedules) {
      // Send care reminder email (fire-and-forget, async action)
      if (schedule.userId) {
        await ctx.scheduler.runAfter(
          0,
          internal.email.sendCareScheduleReminderEmail,
          {
            userId: schedule.userId,
            salonType: schedule.salonType ?? "multi",
            scheduleId: schedule._id,
          },
        );
      } else {
        console.warn(
          `[checkAndNotify] Skipping email for schedule ${schedule._id}: no userId`,
        );
      }

      // Bump nextCheckDate by 7 days so cron doesn't fire again next run
      const nextDate = new Date(schedule.nextCheckDate as string);
      nextDate.setDate(nextDate.getDate() + 7);
      const newNextCheck = nextDate.toISOString().slice(0, 10);

      await ctx.db.patch(schedule._id, {
        nextCheckDate: newNextCheck,
        updatedAt: now,
      });
    }

    return null;
  },
});
