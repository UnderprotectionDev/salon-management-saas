import { ConvexError, v } from "convex/values";
import { ErrorCode, ownerQuery } from "./lib/functions";
import { inventoryTransactionWithDetailsValidator } from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List inventory transactions for a specific product, enriched with
 * product name and staff name.
 * Owner-only.
 */
export const listByProduct = ownerQuery({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  returns: v.array(inventoryTransactionWithDetailsValidator),
  handler: async (ctx, args) => {
    // Verify product belongs to this org
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Product not found",
      });
    }

    const limit = args.limit ?? 50;

    const transactions = await ctx.db
      .query("inventoryTransactions")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(limit);

    // Batch fetch staff names (avoids N+1)
    const staffIds = [
      ...new Set(
        transactions
          .map((t) => t.staffId)
          .filter((id): id is NonNullable<typeof id> => id != null),
      ),
    ];
    const staffMap = new Map<string, string>();
    if (staffIds.length > 0) {
      await Promise.all(
        staffIds.map(async (id) => {
          const staff = await ctx.db.get(id);
          if (staff) staffMap.set(id, staff.name);
        }),
      );
    }

    return transactions.map((t) => ({
      ...t,
      productName: product.name,
      staffName: t.staffId ? staffMap.get(t.staffId) : undefined,
    }));
  },
});

/**
 * List recent inventory transactions across all products for an organization.
 * Useful for the activity feed.
 */
export const listRecent = ownerQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(inventoryTransactionWithDetailsValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const transactions = await ctx.db
      .query("inventoryTransactions")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .order("desc")
      .take(limit);

    if (transactions.length === 0) return [];

    // Batch fetch products and staff
    const productIds = [...new Set(transactions.map((t) => t.productId))];
    const staffIds = [
      ...new Set(
        transactions
          .map((t) => t.staffId)
          .filter((id): id is NonNullable<typeof id> => id != null),
      ),
    ];

    const productMap = new Map<string, string>();
    const staffMap = new Map<string, string>();

    await Promise.all([
      ...productIds.map(async (id) => {
        const product = await ctx.db.get(id);
        if (product) productMap.set(id, product.name);
      }),
      ...staffIds.map(async (id) => {
        const staff = await ctx.db.get(id);
        if (staff) staffMap.set(id, staff.name);
      }),
    ]);

    return transactions.map((t) => ({
      ...t,
      productName: productMap.get(t.productId) ?? "Unknown product",
      staffName: t.staffId ? staffMap.get(t.staffId) : undefined,
    }));
  },
});
