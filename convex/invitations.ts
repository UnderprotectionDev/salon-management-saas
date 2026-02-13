import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { DEFAULT_STAFF_SCHEDULE } from "./lib/defaults";
import {
  authedMutation,
  authedQuery,
  ErrorCode,
  isSuperAdminEmail,
  orgQuery,
  ownerMutation,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  invitationDocValidator,
  invitationRoleValidator,
  invitationWithOrgValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List invitations for an organization
 */
export const list = orgQuery({
  args: {},
  returns: v.array(invitationDocValidator),
  handler: async (ctx) => {
    return await ctx.db
      .query("invitation")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();
  },
});

/**
 * Check if there are pending invitations for the current user's email.
 * Requires authentication to prevent email enumeration attacks.
 */
export const hasPendingInvitations = authedQuery({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    if (!ctx.user.email) return false;

    const invitation = await ctx.db
      .query("invitation")
      .withIndex("email", (q) => q.eq("email", ctx.user.email?.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!invitation) return false;

    // Check if expired
    const now = Date.now();
    return !invitation.expiresAt || invitation.expiresAt > now;
  },
});

/**
 * Get pending invitations for the current authenticated user
 * Returns invitations with organization info for in-app approval
 */
export const getPendingForCurrentUser = authedQuery({
  args: {},
  returns: v.array(invitationWithOrgValidator),
  handler: async (ctx) => {
    if (!ctx.user.email) return [];

    const invitations = await ctx.db
      .query("invitation")
      .withIndex("email", (q) => q.eq("email", ctx.user.email?.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const now = Date.now();
    const validInvitations = await Promise.all(
      invitations
        .filter((inv) => !inv.expiresAt || inv.expiresAt > now)
        .map(async (inv) => {
          const org = await ctx.db.get(inv.organizationId);
          return org
            ? {
                ...inv,
                organizationName: org.name,
                organizationSlug: org.slug,
              }
            : null;
        }),
    );

    return validInvitations.filter(
      (inv): inv is NonNullable<typeof inv> => inv !== null,
    );
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create an invitation for a new staff member
 * Only owner/admin can invite members
 * Rate limited: 20/day per organization
 */
export const create = ownerMutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: invitationRoleValidator,
    phone: v.optional(v.string()),
  },
  returns: v.id("invitation"),
  handler: async (ctx, args) => {
    // Rate limit check (per organization)
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "createInvitation",
      {
        key: ctx.organizationId,
      },
    );
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Invitation limit exceeded. Try again in ${Math.ceil((retryAfter ?? 0) / 1000 / 60)} minutes.`,
      });
    }

    // Normalize email for consistent comparisons
    const normalizedEmail = args.email.toLowerCase();

    // Check if there's already a pending invitation for this email
    const existingInvitation = await ctx.db
      .query("invitation")
      .withIndex("organizationId_email", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("email", normalizedEmail),
      )
      .first();

    if (existingInvitation && existingInvitation.status === "pending") {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "An invitation is already pending for this email",
      });
    }

    // Check if user is already a member (using index instead of filter)
    const existingStaff = await ctx.db
      .query("staff")
      .withIndex("organizationId_email", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("email", normalizedEmail),
      )
      .first();

    if (existingStaff) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "A staff member with this email already exists in this salon",
      });
    }

    // Check if user is already staff at another organization
    const staffAtOtherOrg = await ctx.db
      .query("staff")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (
      staffAtOtherOrg &&
      staffAtOtherOrg.organizationId !== ctx.organizationId
    ) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "This person is already a staff member at another salon",
      });
    }

    const now = Date.now();
    // Invitation expires in 7 days
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

    const invitationId = await ctx.db.insert("invitation", {
      organizationId: ctx.organizationId,
      email: normalizedEmail,
      name: args.name,
      role: args.role,
      phone: args.phone,
      status: "pending",
      invitedBy: ctx.user._id,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    // Send invitation email (async, non-blocking)
    await ctx.scheduler.runAfter(0, internal.email.sendInvitationEmail, {
      invitationId,
    });

    return invitationId;
  },
});

/**
 * Accept an invitation (called after user signs up/logs in)
 */
export const accept = authedMutation({
  args: { invitationId: v.id("invitation") },
  returns: v.object({
    memberId: v.id("member"),
    organizationId: v.id("organization"),
    organizationSlug: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Invitation not found",
      });
    }

    if (invitation.status !== "pending") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invitation is no longer valid",
      });
    }

    // Check if invitation has expired
    if (invitation.expiresAt && invitation.expiresAt < Date.now()) {
      await ctx.db.patch(args.invitationId, {
        status: "expired",
        updatedAt: Date.now(),
      });
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invitation has expired",
      });
    }

    // Verify the user's email matches the invitation
    if (!ctx.user.email || ctx.user.email.toLowerCase() !== invitation.email) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "This invitation was sent to a different email address",
      });
    }

    // Check if user is already a member of ANY organization
    const existingMembership = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (existingMembership) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message:
          "You are already a member of a salon. A staff member can only belong to one salon.",
      });
    }

    const now = Date.now();

    // Cascading: Create member record
    const memberId = await ctx.db.insert("member", {
      organizationId: invitation.organizationId,
      userId: ctx.user._id,
      role: invitation.role,
      createdAt: now,
      updatedAt: now,
    });

    // Cascading: Create staff profile
    await ctx.db.insert("staff", {
      userId: ctx.user._id,
      organizationId: invitation.organizationId,
      memberId,
      name: invitation.name,
      email: invitation.email,
      phone: invitation.phone,
      status: "active",
      serviceIds: [],
      defaultSchedule: { ...DEFAULT_STAFF_SCHEDULE },
      createdAt: now,
      updatedAt: now,
    });

    // Mark invitation as accepted
    await ctx.db.patch(args.invitationId, {
      status: "accepted",
      updatedAt: now,
    });

    // Return organization slug for redirect
    const org = await ctx.db.get(invitation.organizationId);
    return {
      memberId,
      organizationId: invitation.organizationId,
      organizationSlug: org?.slug ?? null,
    };
  },
});

/**
 * Reject an invitation (user declines to join)
 */
export const reject = authedMutation({
  args: { invitationId: v.id("invitation") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Invitation not found",
      });
    }

    if (invitation.status !== "pending") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invitation is no longer valid",
      });
    }

    // Verify the user's email matches the invitation
    if (!ctx.user.email || ctx.user.email.toLowerCase() !== invitation.email) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "This invitation was sent to a different email address",
      });
    }

    await ctx.db.patch(args.invitationId, {
      status: "rejected",
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Cancel an invitation
 * Uses authedMutation with manual check since invitationId is input
 */
export const cancel = authedMutation({
  args: { invitationId: v.id("invitation") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Invitation not found",
      });
    }

    // Manual permission check
    const membership = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q
          .eq("organizationId", invitation.organizationId)
          .eq("userId", ctx.user._id),
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && !isSuperAdminEmail(ctx.user.email))
    ) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have permission to cancel invitations",
      });
    }

    if (invitation.status !== "pending") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Can only cancel pending invitations",
      });
    }

    await ctx.db.patch(args.invitationId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Resend an invitation (extends expiry)
 * Rate limited: 3/hour per invitation
 */
export const resend = authedMutation({
  args: { invitationId: v.id("invitation") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Invitation not found",
      });
    }

    // Permission check FIRST to avoid rate limit exhaustion by unauthorized users
    const membership = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q
          .eq("organizationId", invitation.organizationId)
          .eq("userId", ctx.user._id),
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && !isSuperAdminEmail(ctx.user.email))
    ) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You don't have permission to resend invitations",
      });
    }

    // Rate limit check (per invitation) - after permission check
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "resendInvitation",
      {
        key: args.invitationId,
      },
    );
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Rate limit exceeded. Try again in ${Math.ceil((retryAfter ?? 0) / 1000 / 60)} minutes.`,
      });
    }

    if (invitation.status !== "pending" && invitation.status !== "expired") {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Can only resend pending or expired invitations",
      });
    }

    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.invitationId, {
      status: "pending",
      expiresAt,
      updatedAt: now,
    });

    // Resend invitation email (async, non-blocking)
    await ctx.scheduler.runAfter(0, internal.email.sendInvitationEmail, {
      invitationId: args.invitationId,
    });

    return true;
  },
});

// =============================================================================
// Internal
// =============================================================================

/**
 * Mark expired invitations as "expired".
 * Called by cron job to keep invitation statuses accurate.
 */
export const expireOldInvitations = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const pending = await ctx.db
      .query("invitation")
      .withIndex("status", (q) => q.eq("status", "pending"))
      .collect();

    let count = 0;
    for (const inv of pending) {
      if (inv.expiresAt && inv.expiresAt < now) {
        await ctx.db.patch(inv._id, { status: "expired", updatedAt: now });
        count++;
      }
    }
    return count;
  },
});
