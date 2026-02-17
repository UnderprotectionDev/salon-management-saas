import { ConvexError, v } from "convex/values";
import { authedMutation, authedQuery, ErrorCode } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";

// =============================================================================
// Queries
// =============================================================================

/**
 * List all favorite salons for the current user.
 * Returns enriched data with organization name, slug, and logo.
 */
export const list = authedQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("favoriteSalons"),
      organizationId: v.id("organization"),
      organizationName: v.string(),
      organizationSlug: v.string(),
      organizationLogo: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const favorites = await ctx.db
      .query("favoriteSalons")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .take(50);

    // Batch-fetch orgs
    const orgIds = [...new Set(favorites.map((f) => f.organizationId))];
    const orgDocs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
    const orgMap = new Map(
      orgDocs
        .filter((o): o is NonNullable<typeof o> => o !== null)
        .map((o) => [o._id, o]),
    );

    return favorites
      .map((f) => {
        const org = orgMap.get(f.organizationId);
        if (!org) return null;
        return {
          _id: f._id,
          organizationId: f.organizationId,
          organizationName: org.name,
          organizationSlug: org.slug,
          organizationLogo: org.logo,
          createdAt: f.createdAt,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);
  },
});

/**
 * Check if a specific organization is favorited by the current user.
 */
export const isFavorite = authedQuery({
  args: {
    organizationId: v.id("organization"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("favoriteSalons")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", ctx.user._id).eq("organizationId", args.organizationId),
      )
      .first();
    return existing !== null;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Toggle a salon as favorite (add if not exists, remove if exists).
 */
export const toggle = authedMutation({
  args: {
    organizationId: v.id("organization"),
  },
  returns: v.object({
    isFavorite: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Rate limit
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "toggleFavoriteSalon",
      { key: ctx.user._id },
    );
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Too many requests. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000)} seconds.`,
      });
    }

    // Verify org exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Salon not found",
      });
    }

    // Check if already favorited
    const existing = await ctx.db
      .query("favoriteSalons")
      .withIndex("by_user_org", (q) =>
        q.eq("userId", ctx.user._id).eq("organizationId", args.organizationId),
      )
      .first();

    if (existing) {
      // Remove from favorites
      await ctx.db.delete(existing._id);
      return { isFavorite: false };
    }

    // Add to favorites (cap at 50)
    const currentCount = await ctx.db
      .query("favoriteSalons")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .take(51);
    if (currentCount.length >= 50) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Maximum 50 favorite salons allowed",
      });
    }

    await ctx.db.insert("favoriteSalons", {
      userId: ctx.user._id,
      organizationId: args.organizationId,
      createdAt: Date.now(),
    });

    return { isFavorite: true };
  },
});
