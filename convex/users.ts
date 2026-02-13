import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { authedMutation, authedQuery, ErrorCode } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import { cascadeDeleteStaffData, revokeUserSessions } from "./members";

// Returns the current authenticated user
// Throws UNAUTHENTICATED if not logged in
export const getCurrentUser = authedQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.user;
  },
});

/**
 * Delete the current user's account.
 *
 * Rules:
 * - If user is an org owner, they must transfer ownership first
 * - If user is a staff member, auto-triggers leave flow (cascade delete)
 * - Deletes userProfile, Better Auth user/session/account records
 * - Rate limited: 1 per day
 */
export const deleteMyAccount = authedMutation({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    // Rate limit
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "deleteAccount", {
      key: ctx.user._id,
    });
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Account deletion limit exceeded. Try again in ${Math.ceil((retryAfter ?? 0) / 1000 / 60 / 60)} hours.`,
      });
    }

    // Check if user is a member of any organization
    const membership = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    if (membership) {
      if (membership.role === "owner") {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message:
            "You are the owner of a salon. Please transfer ownership or delete the salon before deleting your account.",
        });
      }

      // Staff member — cascade delete staff data and leave
      const staffProfile = await ctx.db
        .query("staff")
        .withIndex("memberId", (q) => q.eq("memberId", membership._id))
        .first();

      if (staffProfile) {
        // Use shared cascade delete helper to avoid code duplication
        await cascadeDeleteStaffData(
          ctx,
          staffProfile._id,
          membership.organizationId,
        );
        await ctx.db.delete(staffProfile._id);
      }

      await ctx.db.delete(membership._id);

      // Revoke sessions immediately after removing membership
      await revokeUserSessions(ctx, ctx.user._id);
    }

    // Delete userProfile
    const userProfile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.user._id))
      .first();
    if (userProfile) {
      await ctx.db.delete(userProfile._id);
    }

    // Delete Better Auth account records
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component API union type requires assertion
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "account",
        where: [{ field: "userId", operator: "eq", value: ctx.user._id }],
      },
    } as any);

    // Delete Better Auth user record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Component API union type requires assertion
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "user",
        where: [{ field: "_id", operator: "eq", value: ctx.user._id }],
      },
    } as any);

    return true;
  },
});
