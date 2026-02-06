import { ConvexError, v } from "convex/values";
import {
  authedMutation,
  authedQuery,
  ErrorCode,
  orgQuery,
} from "./lib/functions";
import {
  staffDocValidator,
  staffScheduleValidator,
  staffStatusValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List all staff members in an organization
 */
export const list = orgQuery({
  args: {},
  returns: v.array(staffDocValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("staff")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();
  },
});

/**
 * List active staff members in an organization
 */
export const listActive = orgQuery({
  args: {},
  returns: v.array(staffDocValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("staff")
      .withIndex("organizationId_status", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("status", "active"),
      )
      .collect();
  },
});

/**
 * Get staff member by user ID in an organization
 */
export const getByUser = orgQuery({
  args: { userId: v.string() },
  returns: v.union(staffDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("userId", args.userId),
      )
      .first();
  },
});

/**
 * Get current user's staff profile in an organization
 */
export const getCurrentStaff = authedQuery({
  args: { organizationId: v.id("organization") },
  returns: v.union(staffDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", ctx.user._id),
      )
      .first();
  },
});

/**
 * Get staff member by ID
 * Uses authedQuery with manual org check since staffId is the input
 */
export const get = authedQuery({
  args: { staffId: v.id("staff") },
  returns: v.union(staffDocValidator, v.null()),
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      return null;
    }

    // Manual org access check
    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", staff.organizationId).eq("userId", ctx.user._id),
      )
      .first();

    if (!member) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this staff member",
      });
    }

    return staff;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new staff profile
 * Uses authedMutation for bootstrap case (first owner has no staff yet)
 */
export const createProfile = authedMutation({
  args: {
    userId: v.string(),
    organizationId: v.id("organization"),
    memberId: v.id("member"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    status: v.optional(staffStatusValidator),
    serviceIds: v.optional(v.array(v.string())),
    defaultSchedule: staffScheduleValidator,
  },
  returns: v.id("staff"),
  handler: async (ctx, args) => {
    // Security check: user can only create their own staff profile
    // OR must have existing org access (for admin adding staff)
    if (args.userId !== ctx.user._id) {
      // Check if the current user has permission to add staff (owner/admin)
      const currentMembership = await ctx.db
        .query("member")
        .withIndex("organizationId_userId", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("userId", ctx.user._id),
        )
        .first();

      if (
        !currentMembership ||
        !["owner", "admin"].includes(currentMembership.role)
      ) {
        throw new ConvexError({
          code: ErrorCode.FORBIDDEN,
          message:
            "You don't have permission to add staff to this organization",
        });
      }
    } else {
      // User is creating their own profile - verify they have a valid member record
      const membership = await ctx.db.get(args.memberId);
      if (
        !membership ||
        membership.userId !== ctx.user._id ||
        membership.organizationId !== args.organizationId
      ) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Invalid membership record",
        });
      }
    }

    // Check if staff profile already exists
    const existing = await ctx.db
      .query("staff")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId),
      )
      .first();

    if (existing) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "Staff profile already exists for this user",
      });
    }

    const now = Date.now();

    const staffId = await ctx.db.insert("staff", {
      userId: args.userId,
      organizationId: args.organizationId,
      memberId: args.memberId,
      name: args.name,
      email: args.email,
      phone: args.phone,
      imageUrl: args.imageUrl,
      bio: args.bio,
      status: args.status ?? "active",
      serviceIds: args.serviceIds ?? [],
      defaultSchedule: args.defaultSchedule,
      createdAt: now,
      updatedAt: now,
    });

    return staffId;
  },
});

/**
 * Update a staff profile
 * Uses authedMutation with manual org check since staffId is the input
 */
export const updateProfile = authedMutation({
  args: {
    staffId: v.id("staff"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    status: v.optional(staffStatusValidator),
    serviceIds: v.optional(v.array(v.string())),
    defaultSchedule: staffScheduleValidator,
  },
  returns: v.id("staff"),
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.staffId);
    if (!staff) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff not found",
      });
    }

    // Manual org access check
    const member = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", staff.organizationId).eq("userId", ctx.user._id),
      )
      .first();

    if (!member) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have access to this organization",
      });
    }

    // Authorization: only allow self-update or admin/owner
    if (
      staff.userId !== ctx.user._id &&
      !["owner", "admin"].includes(member.role)
    ) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have permission to update this staff profile",
      });
    }

    const { staffId, ...updateFields } = args;

    // Filter out undefined values
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(staffId, updates);

    return staffId;
  },
});
