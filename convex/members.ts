import { v } from "convex/values";
import {
  adminMutation,
  authedMutation,
  authedQuery,
  orgQuery,
} from "./lib/functions";

// =============================================================================
// Validators
// =============================================================================

const roleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
);

// =============================================================================
// Queries
// =============================================================================

/**
 * Get members of an organization
 */
export const list = orgQuery({
  args: {},
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
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    // Cannot add another owner
    if (args.role === "owner") {
      throw new Error("Cannot add another owner");
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("userId", args.userId),
      )
      .first();

    if (existingMembership) {
      throw new Error("User is already a member of this organization");
    }

    const now = Date.now();

    return await ctx.db.insert("member", {
      organizationId: ctx.organizationId,
      userId: args.userId,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    });
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
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
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

    if (!currentMembership || currentMembership.role !== "owner") {
      throw new Error("Only owner can change member roles");
    }

    // Cannot change owner role
    if (member.role === "owner") {
      throw new Error("Cannot change owner role");
    }

    // Cannot make someone else owner
    if (args.role === "owner") {
      throw new Error("Cannot assign owner role");
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
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Member not found");
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
      !["owner", "admin"].includes(currentMembership.role)
    ) {
      throw new Error("You don't have permission to remove members");
    }

    // Cannot remove owner
    if (member.role === "owner") {
      throw new Error("Cannot remove the owner");
    }

    // Cannot remove self (use leave instead)
    if (member.userId === ctx.user._id) {
      throw new Error("Cannot remove yourself, use leave instead");
    }

    // Cascading: Also remove staff profile
    const staffProfile = await ctx.db
      .query("staff")
      .withIndex("memberId", (q) => q.eq("memberId", args.memberId))
      .first();

    if (staffProfile) {
      await ctx.db.delete(staffProfile._id);
    }

    await ctx.db.delete(args.memberId);

    return true;
  },
});

/**
 * Leave an organization
 * Any member can leave except owner
 */
export const leave = authedMutation({
  args: { organizationId: v.id("organization") },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", ctx.user._id),
      )
      .first();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    if (membership.role === "owner") {
      throw new Error("Owner cannot leave the organization");
    }

    // Cascading: Remove staff profile
    const staffProfile = await ctx.db
      .query("staff")
      .withIndex("memberId", (q) => q.eq("memberId", membership._id))
      .first();

    if (staffProfile) {
      await ctx.db.delete(staffProfile._id);
    }

    await ctx.db.delete(membership._id);

    return true;
  },
});
