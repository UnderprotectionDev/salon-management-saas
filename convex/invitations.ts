import { v } from "convex/values";
import {
  adminMutation,
  authedMutation,
  authedQuery,
  orgQuery,
  publicQuery,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";

// =============================================================================
// Validators
// =============================================================================

const roleValidator = v.union(v.literal("admin"), v.literal("member"));

// =============================================================================
// Queries
// =============================================================================

/**
 * List invitations for an organization
 */
export const list = orgQuery({
  args: {},
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
 * Check if there are pending invitations for an email (used during signup/login)
 * Public query - returns only a boolean to prevent information disclosure
 */
export const hasPendingInvitations = publicQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitation")
      .withIndex("email", (q) => q.eq("email", args.email.toLowerCase()))
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
  handler: async (ctx) => {
    if (!ctx.user.email) return [];

    const invitations = await ctx.db
      .query("invitation")
      .withIndex("email", (q) => q.eq("email", ctx.user.email!.toLowerCase()))
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
export const create = adminMutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: roleValidator,
    phone: v.optional(v.string()),
  },
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
      throw new Error(
        `Invitation limit exceeded. Try again in ${Math.ceil(retryAfter! / 1000 / 60)} minutes.`,
      );
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
      throw new Error("An invitation is already pending for this email");
    }

    // Check if user is already a member
    const existingStaff = await ctx.db
      .query("staff")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), ctx.organizationId),
          q.eq(q.field("email"), normalizedEmail),
        ),
      )
      .first();

    if (existingStaff) {
      throw new Error("A staff member with this email already exists");
    }

    const now = Date.now();
    // Invitation expires in 7 days
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

    return await ctx.db.insert("invitation", {
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
  },
});

/**
 * Accept an invitation (called after user signs up/logs in)
 */
export const accept = authedMutation({
  args: { invitationId: v.id("invitation") },
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer valid");
    }

    // Check if invitation has expired
    if (invitation.expiresAt && invitation.expiresAt < Date.now()) {
      await ctx.db.patch(args.invitationId, {
        status: "expired",
        updatedAt: Date.now(),
      });
      throw new Error("Invitation has expired");
    }

    // Verify the user's email matches the invitation
    if (!ctx.user.email || ctx.user.email.toLowerCase() !== invitation.email) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Check if user is already a member of this organization
    const existingMembership = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q
          .eq("organizationId", invitation.organizationId)
          .eq("userId", ctx.user._id),
      )
      .first();

    if (existingMembership) {
      throw new Error("You are already a member of this organization");
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
      defaultSchedule: {
        monday: { start: "09:00", end: "18:00", available: true },
        tuesday: { start: "09:00", end: "18:00", available: true },
        wednesday: { start: "09:00", end: "18:00", available: true },
        thursday: { start: "09:00", end: "18:00", available: true },
        friday: { start: "09:00", end: "18:00", available: true },
        saturday: { start: "09:00", end: "18:00", available: true },
        sunday: { start: "09:00", end: "18:00", available: false },
      },
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
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer valid");
    }

    // Verify the user's email matches the invitation
    if (!ctx.user.email || ctx.user.email.toLowerCase() !== invitation.email) {
      throw new Error("This invitation was sent to a different email address");
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
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
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

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("You don't have permission to cancel invitations");
    }

    if (invitation.status !== "pending") {
      throw new Error("Can only cancel pending invitations");
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
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
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

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("You don't have permission to resend invitations");
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
      throw new Error(
        `Rate limit exceeded. Try again in ${Math.ceil(retryAfter! / 1000 / 60)} minutes.`,
      );
    }

    if (invitation.status !== "pending" && invitation.status !== "expired") {
      throw new Error("Can only resend pending or expired invitations");
    }

    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.invitationId, {
      status: "pending",
      expiresAt,
      updatedAt: now,
    });

    return true;
  },
});
