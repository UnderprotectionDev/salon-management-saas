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
  returns: v.union(
    v.object({
      _id: v.id("member"),
      _creationTime: v.number(),
      userId: v.string(),
      organizationId: v.id("organization"),
      role: v.union(v.literal("owner"), v.literal("staff")),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Shape member to match the strict returns validator
    const shapeMember = (m: (typeof members)[0]) => ({
      _id: m._id,
      _creationTime: m._creationTime,
      userId: m.userId,
      organizationId: m.organizationId,
      role: m.role,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    });

    const ownerMembers = members.filter((m) => m.role === "owner");
    if (ownerMembers.length === 0) {
      return members[0] ? shapeMember(members[0]) : null;
    }
    if (ownerMembers.length === 1) {
      return shapeMember(ownerMembers[0]);
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
        return shapeMember(member);
      }
    }

    // Fallback to first owner membership
    return shapeMember(ownerMembers[0]);
  },
});

/**
 * Find organization settings by Polar subscription ID.
 * Used by webhook to find the org when a subscription is updated.
 */
export const findByPolarSubscriptionId = internalQuery({
  args: { polarSubscriptionId: v.string() },
  returns: v.union(
    v.object({
      organizationId: v.id("organization"),
      subscriptionPlan: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("by_polar_subscription", (q) =>
        q.eq("polarSubscriptionId", args.polarSubscriptionId),
      )
      .first();

    if (!settings) return null;

    return {
      organizationId: settings.organizationId,
      subscriptionPlan: settings.subscriptionPlan,
    };
  },
});
