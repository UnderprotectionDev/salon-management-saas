import { v } from "convex/values";
import { orgQuery, ownerQuery } from "./lib/functions";
import { inventoryStatsValidator } from "./lib/validators";

// =============================================================================
// Product Stats & Inventory Overview
// =============================================================================

/**
 * Count of low-stock products for the dashboard alert.
 */
export const countLowStock = orgQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("status", "active"),
      )
      .collect();

    return products.filter(
      (p) =>
        p.lowStockThreshold !== undefined &&
        p.stockQuantity > 0 &&
        p.stockQuantity <= p.lowStockThreshold,
    ).length;
  },
});

/**
 * Inventory stats for the products dashboard.
 * Returns totals for products, stock value, low-stock, and out-of-stock counts.
 */
export const getInventoryStats = ownerQuery({
  args: {},
  returns: inventoryStatsValidator,
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("status", "active"),
      )
      .collect();

    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      totalStockValue += p.stockQuantity * p.costPrice;
      if (p.stockQuantity === 0) {
        outOfStockCount++;
      } else if (
        p.lowStockThreshold !== undefined &&
        p.stockQuantity <= p.lowStockThreshold
      ) {
        lowStockCount++;
      }
    }

    return {
      totalProducts: products.length,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
    };
  },
});
