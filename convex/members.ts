import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  authedMutation,
  authedQuery,
  ErrorCode,
  isSuperAdminEmail,
  orgQuery,
  ownerMutation,
} from "./lib/functions";
import { memberDocValidator, memberRoleValidator } from "./lib/validators";

/**
 * Revoke all Better Auth sessions for a given user.
 * This forces the user to re-authenticate after being removed/leaving.
 *
 * @internal - Shared helper used by both members.remove/leave and users.deleteMyAccount
 */
export async function revokeUserSessions(ctx: MutationCtx, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component API union type requires assertion
  const adapter = components.betterAuth.adapter as any;

  await adapter.deleteMany({
    model: "session",
    where: [{ field: "userId", value: userId }],
  });
}

/**
 * Cascade delete staff-related data when removing a staff member.
 * This nullifies staffId references instead of deleting records to preserve history.
 *
 * @internal - Shared helper used by both members.remove and users.deleteMyAccount
 */
export async function cascadeDeleteStaffData(
  ctx: MutationCtx,
  staffId: Id<"staff">,
  organizationId: Id<"organization">,
) {
  const overrides = await ctx.db
    .query("scheduleOverrides")
    .withIndex("by_staff_date", (q) => q.eq("staffId", staffId))
    .collect();
  for (const override of overrides) {
    await ctx.db.delete(override._id);
  }

  const timeOff = await ctx.db
    .query("timeOffRequests")
    .withIndex("by_staff", (q) => q.eq("staffId", staffId))
    .collect();
  for (const request of timeOff) {
    await ctx.db.delete(request._id);
  }

  const overtime = await ctx.db
    .query("staffOvertime")
    .withIndex("by_staff_date", (q) => q.eq("staffId", staffId))
    .collect();
  for (const entry of overtime) {
    await ctx.db.delete(entry._id);
  }

  const notifications = await ctx.db
    .query("notifications")
    .withIndex("by_org_staff", (q) =>
      q.eq("organizationId", organizationId).eq("recipientStaffId", staffId),
    )
    .collect();
  for (const notification of notifications) {
    await ctx.db.delete(notification._id);
  }

  const locks = await ctx.db
    .query("slotLocks")
    .withIndex("by_staff_date", (q) => q.eq("staffId", staffId))
    .collect();
  for (const lock of locks) {
    await ctx.db.delete(lock._id);
  }

  // Nullify staffId on appointments (preserve history, mark as unassigned)
  // Use by_organization index + filter instead of by_staff_date to avoid issues with null staffId
  const allAppointments = await ctx.db
    .query("appointments")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();

  const appointments = allAppointments.filter((apt) => apt.staffId === staffId);

  for (const apt of appointments) {
    await ctx.db.patch(apt._id, { staffId: null });
  }

  // Nullify staffId on appointment services (batch query to avoid N+1)
  // Collect all appointmentIds first, then query all services in one go
  const appointmentIds = appointments.map((apt) => apt._id);

  if (appointmentIds.length > 0) {
    // Query all appointment services for this organization
    // Note: This could be optimized with a by_organization index on appointmentServices
    // For now, we filter in memory after fetching by appointment
    const allServices: Doc<"appointmentServices">[] = [];
    for (const aptId of appointmentIds) {
      const services = await ctx.db
        .query("appointmentServices")
        .withIndex("by_appointment", (q) => q.eq("appointmentId", aptId))
        .collect();
      allServices.push(...services);
    }

    // Update only services assigned to this staff
    for (const svc of allServices) {
      if (svc.staffId === staffId) {
        await ctx.db.patch(svc._id, { staffId: null });
      }
    }
  }

  // Clear preferredStaffId on customers who preferred this staff
  // Use filter to avoid loading all customers into memory unnecessarily
  const allCustomers = await ctx.db
    .query("customers")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .collect();

  const customersWithPreference = allCustomers.filter(
    (customer) => customer.preferredStaffId === staffId,
  );

  for (const customer of customersWithPreference) {
    await ctx.db.patch(customer._id, { preferredStaffId: undefined });
  }
}

export const list = orgQuery({
  args: {},
  returns: v.array(memberDocValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("member")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();
  },
});

export const getCurrent = authedQuery({
  args: { organizationId: v.id("organization") },
  returns: v.union(memberDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", ctx.user._id),
      )
      .first();
  },
});

export const add = ownerMutation({
  args: {
    userId: v.string(),
    role: memberRoleValidator,
  },
  returns: v.id("member"),
  handler: async (ctx, args) => {
    if (args.role === "owner") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot add another owner",
      });
    }

    const existingMembership = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingMembership) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message:
          "User is already a member of a salon. A staff member can only belong to one salon.",
      });
    }

    const now = Date.now();

    const memberId = await ctx.db.insert("member", {
      organizationId: ctx.organizationId,
      userId: args.userId,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    });

    return memberId;
  },
});

export const updateRole = authedMutation({
  args: {
    memberId: v.id("member"),
    role: memberRoleValidator,
  },
  returns: v.id("member"),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Member not found",
      });
    }

    const currentMembership = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q
          .eq("organizationId", member.organizationId)
          .eq("userId", ctx.user._id),
      )
      .first();

    if (
      !currentMembership ||
      (currentMembership.role !== "owner" && !isSuperAdminEmail(ctx.user.email))
    ) {
      throw new ConvexError({
        code: ErrorCode.OWNER_REQUIRED,
        message: "Only owner can change member roles",
      });
    }

    if (member.role === "owner") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot change owner role",
      });
    }

    if (args.role === "owner") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot assign owner role",
      });
    }

    await ctx.db.patch(args.memberId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return args.memberId;
  },
});

export const remove = authedMutation({
  args: { memberId: v.id("member") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Member not found",
      });
    }

    const currentMembership = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q
          .eq("organizationId", member.organizationId)
          .eq("userId", ctx.user._id),
      )
      .first();

    if (
      !currentMembership ||
      (currentMembership.role !== "owner" && !isSuperAdminEmail(ctx.user.email))
    ) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have permission to remove members",
      });
    }

    if (member.role === "owner") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot remove the owner",
      });
    }

    if (member.userId === ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot remove yourself, use leave instead",
      });
    }

    const staffProfile = await ctx.db
      .query("staff")
      .withIndex("memberId", (q) => q.eq("memberId", args.memberId))
      .first();

    if (staffProfile) {
      await cascadeDeleteStaffData(
        ctx,
        staffProfile._id,
        member.organizationId,
      );
      await ctx.db.delete(staffProfile._id);
    }

    await ctx.db.delete(args.memberId);

    // Revoke all sessions so the removed user is immediately logged out
    await revokeUserSessions(ctx, member.userId);

    return true;
  },
});

export const transferOwnership = ownerMutation({
  args: {
    newOwnerId: v.id("member"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const newOwner = await ctx.db.get(args.newOwnerId);
    if (!newOwner) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Member not found",
      });
    }

    if (newOwner.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Member does not belong to this organization",
      });
    }

    if (newOwner.userId === ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot transfer ownership to yourself",
      });
    }

    if (newOwner.role === "owner") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Member is already the owner",
      });
    }

    const now = Date.now();

    await ctx.db.patch(ctx.member._id, {
      role: "staff",
      updatedAt: now,
    });

    await ctx.db.patch(args.newOwnerId, {
      role: "owner",
      updatedAt: now,
    });

    return true;
  },
});

export const leave = authedMutation({
  args: { organizationId: v.id("organization") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", ctx.user._id),
      )
      .first();

    if (!membership) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "You are not a member of this organization",
      });
    }

    if (membership.role === "owner") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Owner cannot leave the organization",
      });
    }

    const staffProfile = await ctx.db
      .query("staff")
      .withIndex("memberId", (q) => q.eq("memberId", membership._id))
      .first();

    if (staffProfile) {
      await cascadeDeleteStaffData(ctx, staffProfile._id, args.organizationId);
      await ctx.db.delete(staffProfile._id);
    }

    await ctx.db.delete(membership._id);

    // Revoke all sessions so the leaving user must re-authenticate
    await revokeUserSessions(ctx, ctx.user._id);

    return true;
  },
});
