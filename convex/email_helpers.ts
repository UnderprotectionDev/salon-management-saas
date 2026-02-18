import { v } from "convex/values";
import { components } from "./_generated/api";
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

/**
 * Look up a user's email and name by userId via the betterAuth adapter.
 * Used by care schedule reminder email to get the recipient's contact info.
 */
export const getUserEmailById = internalQuery({
  args: { userId: v.string() },
  returns: v.union(v.object({ email: v.string(), name: v.string() }), v.null()),
  handler: async (ctx, args) => {
    // Use ctx.runQuery to call through Convex's component boundary (not direct invocation)
    const user = await ctx.runQuery(
      // biome-ignore lint/suspicious/noExplicitAny: betterAuth adapter returns dynamic types
      components.betterAuth.adapter.findOne as any,
      {
        input: {
          model: "user",
          where: [{ field: "_id", operator: "eq", value: args.userId }],
        },
      },
    );
    if (!user?.email) return null;
    return {
      email: user.email as string,
      name: (user.name as string) ?? "User",
    };
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
