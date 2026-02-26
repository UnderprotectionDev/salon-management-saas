import { ConvexError, v } from "convex/values";
import { ErrorCode, ownerMutation } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";

// =============================================================================
// Bulk Operations
// =============================================================================

/**
 * Bulk update product status (active/inactive).
 */
export const bulkUpdateStatus = ownerMutation({
  args: {
    productIds: v.array(v.id("products")),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (args.productIds.length > 100) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Cannot update more than 100 products at once",
      });
    }
    await rateLimiter.limit(ctx, "bulkProductOperation", {
      key: ctx.organizationId,
    });

    let count = 0;
    const now = Date.now();
    for (const productId of args.productIds) {
      const product = await ctx.db.get(productId);
      if (product && product.organizationId === ctx.organizationId) {
        await ctx.db.patch(productId, { status: args.status, updatedAt: now });
        count++;
      }
    }
    return count;
  },
});

/**
 * Bulk update product category.
 */
export const bulkUpdateCategory = ownerMutation({
  args: {
    productIds: v.array(v.id("products")),
    categoryId: v.optional(v.id("productCategories")),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (args.productIds.length > 100) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Cannot update more than 100 products at once",
      });
    }
    await rateLimiter.limit(ctx, "bulkProductOperation", {
      key: ctx.organizationId,
    });

    // Validate category if provided
    if (args.categoryId) {
      const cat = await ctx.db.get(args.categoryId);
      if (!cat || cat.organizationId !== ctx.organizationId) {
        throw new ConvexError({
          code: ErrorCode.NOT_FOUND,
          message: "Category not found",
        });
      }
    }

    let count = 0;
    const now = Date.now();
    for (const productId of args.productIds) {
      const product = await ctx.db.get(productId);
      if (product && product.organizationId === ctx.organizationId) {
        await ctx.db.patch(productId, {
          categoryId: args.categoryId,
          updatedAt: now,
        });
        count++;
      }
    }
    return count;
  },
});

/**
 * Bulk adjust prices by percentage or fixed amount.
 */
export const bulkAdjustPrices = ownerMutation({
  args: {
    productIds: v.array(v.id("products")),
    adjustmentType: v.union(v.literal("percentage"), v.literal("fixed")),
    priceField: v.union(v.literal("costPrice"), v.literal("sellingPrice")),
    amount: v.number(), // percentage (e.g. 10 for +10%) or kuruş amount
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    if (args.productIds.length > 100) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Cannot update more than 100 products at once",
      });
    }
    await rateLimiter.limit(ctx, "bulkProductOperation", {
      key: ctx.organizationId,
    });

    let count = 0;
    const now = Date.now();
    for (const productId of args.productIds) {
      const product = await ctx.db.get(productId);
      if (!product || product.organizationId !== ctx.organizationId) continue;

      const currentPrice = product[args.priceField];
      if (currentPrice === undefined || currentPrice === null) continue;

      let newPrice: number;

      if (args.adjustmentType === "percentage") {
        newPrice = Math.round(currentPrice * (1 + args.amount / 100));
      } else {
        newPrice = currentPrice + args.amount;
      }

      // Ensure price doesn't go below 0
      newPrice = Math.max(0, newPrice);

      if (newPrice !== currentPrice) {
        await ctx.db.patch(productId, {
          [args.priceField]: newPrice,
          updatedAt: now,
        });
        await ctx.db.insert("priceHistory", {
          organizationId: ctx.organizationId,
          productId,
          field: args.priceField,
          previousValue: currentPrice,
          newValue: newPrice,
          changedBy: ctx.staff?._id,
          createdAt: now,
        });
        count++;
      }
    }
    return count;
  },
});
