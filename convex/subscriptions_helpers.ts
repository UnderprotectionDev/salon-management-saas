/**
 * Internal helper queries for subscription webhooks.
 * These are used by http.ts webhook callbacks which run in httpAction context.
 */
import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Find the owner's member record for a given userId.
 * Used by webhook to map Polar customer → organization.
 *
 * If a user owns multiple orgs, prioritize the one with pending_payment
 * status (most likely the org being set up) or no subscription yet.
 */
export const findOwnerMember = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();

    const ownerMembers = members.filter((m) => m.role === "owner");
    if (ownerMembers.length === 0) {
      return members[0] ?? null;
    }
    if (ownerMembers.length === 1) {
      return ownerMembers[0];
    }

    // Multiple owner memberships — prioritize the org awaiting payment
    for (const member of ownerMembers) {
      const settings = await ctx.db
        .query("organizationSettings")
        .withIndex("organizationId", (q) =>
          q.eq("organizationId", member.organizationId),
        )
        .first();

      if (
        !settings?.subscriptionStatus ||
        settings.subscriptionStatus === "pending_payment"
      ) {
        return member;
      }
    }

    // Fallback to first owner membership
    return ownerMembers[0];
  },
});

/**
 * Find organization settings by Polar subscription ID.
 * Used by webhook to find the org when a subscription is updated.
 */
export const findByPolarSubscriptionId = internalQuery({
  args: { polarSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("organizationSettings")
        .withIndex("by_polar_subscription", (q) =>
          q.eq("polarSubscriptionId", args.polarSubscriptionId),
        )
        .first()) ?? null
    );
  },
});
