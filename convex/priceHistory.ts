import { v } from "convex/values";
import { ownerQuery } from "./lib/functions";
import { priceHistoryWithStaffValidator } from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List price history for a product, most recent first.
 */
export const listByProduct = ownerQuery({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  returns: v.array(priceHistoryWithStaffValidator),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== ctx.organizationId) {
      return [];
    }

    const sanitizedLimit = Math.min(
      Math.max(1, Math.floor(args.limit ?? 20)),
      100,
    );
    const entries = await ctx.db
      .query("priceHistory")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(sanitizedLimit);

    // Enrich with staff names (parallel fetch)
    const staffIds = [
      ...new Set(entries.map((e) => e.changedBy).filter(Boolean)),
    ];
    const staffRecords = await Promise.all(
      staffIds.map((id) => ctx.db.get(id!)),
    );
    const staffMap = new Map<string, string>();
    staffIds.forEach((id, i) => {
      const staff = staffRecords[i];
      if (id && staff) staffMap.set(id, staff.name);
    });

    return entries.map((entry) => ({
      ...entry,
      staffName: entry.changedBy ? staffMap.get(entry.changedBy) : undefined,
    }));
  },
});
