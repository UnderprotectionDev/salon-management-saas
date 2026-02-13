import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  adminMutation,
  authedMutation,
  authedQuery,
  ErrorCode,
  isSuperAdminEmail,
  orgQuery,
  ownerMutation,
} from "./lib/functions";
import { memberDocValidator, memberRoleValidator } from "./lib/validators";

/**
 * Cascade-delete all data associated with a staff profile.
 * Removes: scheduleOverrides, timeOffRequests, staffOvertime, notifications, slotLocks.
 */
async function cascadeDeleteStaffData(
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
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get members of an organization
 */
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

/**
 * Get current user's membership in an organization
 */
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

// =============================================================================
// Mutations
// =============================================================================

/**
 * Add a new member to an organization
 * Only owner/admin can add members
 */
export const add = adminMutation({
  args: {
    userId: v.string(), // Better Auth user ID
    role: memberRoleValidator,
  },
  returns: v.id("member"),
  handler: async (ctx, args) => {
    // Cannot add another owner
    if (args.role === "owner") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot add another owner",
      });
    }

    // Check if user is already a member of ANY organization
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

/**
 * Update member role
 * Only owner can change roles
 * Uses authedMutation with manual check since memberId is input
 */
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

    // Check if current user is owner
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

    // Cannot change owner role
    if (member.role === "owner") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot change owner role",
      });
    }

    // Cannot make someone else owner
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

/**
 * Remove a member from organization
 * Owner/admin can remove members, cannot remove owner
 * Uses authedMutation with manual check since memberId is input
 */
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

    // Check if current user has permission
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

    // Cannot remove owner
    if (member.role === "owner") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot remove the owner",
      });
    }

    // Cannot remove self (use leave instead)
    if (member.userId === ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot remove yourself, use leave instead",
      });
    }

    // Cascading: Remove staff profile and all associated data
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

    return true;
  },
});

/**
 * Transfer organization ownership to another member
 * Only owner can transfer ownership
 */
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

    // Must be in the same organization
    if (newOwner.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Member does not belong to this organization",
      });
    }

    // Cannot transfer to self
    if (newOwner.userId === ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot transfer ownership to yourself",
      });
    }

    // Cannot transfer to someone already owner
    if (newOwner.role === "owner") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Member is already the owner",
      });
    }

    const now = Date.now();

    // Demote current owner to staff
    await ctx.db.patch(ctx.member._id, {
      role: "staff",
      updatedAt: now,
    });

    // Promote new owner
    await ctx.db.patch(args.newOwnerId, {
      role: "owner",
      updatedAt: now,
    });

    return true;
  },
});

/**
 * Leave an organization
 * Any member can leave except owner
 */
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

    // Cascading: Remove staff profile and all associated data
    const staffProfile = await ctx.db
      .query("staff")
      .withIndex("memberId", (q) => q.eq("memberId", membership._id))
      .first();

    if (staffProfile) {
      await cascadeDeleteStaffData(ctx, staffProfile._id, args.organizationId);
      await ctx.db.delete(staffProfile._id);
    }

    await ctx.db.delete(membership._id);

    return true;
  },
});
