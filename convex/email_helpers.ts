import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  appointmentDocValidator,
  appointmentServiceDocValidator,
  customerDocValidator,
  invitationDocValidator,
  organizationDocValidator,
  organizationSettingsDocValidator,
  staffDocValidator,
} from "./lib/validators";

/**
 * Internal query helpers for email actions.
 * Actions can't access ctx.db directly, so they call these queries.
 */

export const getAppointmentData = internalQuery({
  args: { appointmentId: v.id("appointments") },
  returns: v.union(appointmentDocValidator, v.null()),
  handler: async (ctx, args) => {
    return ctx.db.get(args.appointmentId);
  },
});

export const getCustomer = internalQuery({
  args: { customerId: v.id("customers") },
  returns: v.union(customerDocValidator, v.null()),
  handler: async (ctx, args) => {
    return ctx.db.get(args.customerId);
  },
});

export const getOrganization = internalQuery({
  args: { organizationId: v.id("organization") },
  returns: v.union(organizationDocValidator, v.null()),
  handler: async (ctx, args) => {
    return ctx.db.get(args.organizationId);
  },
});

export const getOrganizationSettings = internalQuery({
  args: { organizationId: v.id("organization") },
  returns: v.union(organizationSettingsDocValidator, v.null()),
  handler: async (ctx, args) => {
    return ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
  },
});

export const getAppointmentServices = internalQuery({
  args: { appointmentId: v.id("appointments") },
  returns: v.array(appointmentServiceDocValidator),
  handler: async (ctx, args) => {
    return ctx.db
      .query("appointmentServices")
      .withIndex("by_appointment", (q) =>
        q.eq("appointmentId", args.appointmentId),
      )
      .collect();
  },
});

export const getStaff = internalQuery({
  args: { staffId: v.id("staff") },
  returns: v.union(staffDocValidator, v.null()),
  handler: async (ctx, args) => {
    return ctx.db.get(args.staffId);
  },
});

export const getInvitation = internalQuery({
  args: { invitationId: v.id("invitation") },
  returns: v.union(invitationDocValidator, v.null()),
  handler: async (ctx, args) => {
    return ctx.db.get(args.invitationId);
  },
});

export const getUserName = internalQuery({
  args: { userId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    // Find staff by userId to get their name
    const staff = await ctx.db
      .query("staff")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .first();
    return staff?.name ?? null;
  },
});

// =============================================================================
// Internal Mutations (tracking email delivery)
// =============================================================================

export const markConfirmationSent = internalMutation({
  args: { appointmentId: v.id("appointments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentId, {
      confirmationSentAt: Date.now(),
    });
    return null;
  },
});

export const markReminderSent = internalMutation({
  args: { appointmentId: v.id("appointments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentId, {
      reminderSentAt: Date.now(),
    });
    return null;
  },
});

/**
 * Daily cron job to send 24-hour advance reminder emails.
 * Finds all appointments for tomorrow that haven't received a reminder yet.
 */
export const send24HourRemindersDaily = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const in24Hours = now + 24 * 60 * 60 * 1000;
    const tomorrow = new Date(in24Hours);
    const tomorrowDateStr = `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`;

    const orgs = await ctx.db.query("organization").collect();

    for (const org of orgs) {
      const appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) =>
          q.eq("organizationId", org._id).eq("date", tomorrowDateStr),
        )
        .filter((q) =>
          q.and(
            q.or(
              q.eq(q.field("status"), "pending"),
              q.eq(q.field("status"), "confirmed"),
            ),
            q.eq(q.field("reminderSentAt"), undefined),
          ),
        )
        .collect();

      for (const appt of appointments) {
        await ctx.scheduler.runAfter(0, internal.email.send24HourReminder, {
          appointmentId: appt._id,
        });
      }
    }

    return null;
  },
});
