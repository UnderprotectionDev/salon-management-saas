import { ConvexError, v } from "convex/values";
import { ErrorCode, ownerMutation, ownerQuery } from "./lib/functions";
import {
  productCategoryDocValidator,
  productCategoryWithCountValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List product categories for an organization with product counts.
 * Owner-only: product catalog is not accessible to staff.
 */
export const list = ownerQuery({
  args: {},
  returns: v.array(productCategoryWithCountValidator),
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();

    // Batch fetch all products once to count per category (avoids N+1)
    const allProducts = await ctx.db
      .query("products")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();

    const countMap = new Map<string, number>();
    for (const product of allProducts) {
      if (product.categoryId) {
        countMap.set(
          product.categoryId,
          (countMap.get(product.categoryId) ?? 0) + 1,
        );
      }
    }

    return categories
      .map((category) => ({
        ...category,
        productCount: countMap.get(category._id) ?? 0,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a product category.
 */
export const create = ownerMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("productCategories"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("productCategories")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();

    if (
      existing.some((c) => c.name.toLowerCase() === args.name.toLowerCase())
    ) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "A category with this name already exists",
      });
    }

    const maxSortOrder = existing.reduce(
      (max, c) => Math.max(max, c.sortOrder),
      0,
    );

    return await ctx.db.insert("productCategories", {
      organizationId: ctx.organizationId,
      name: args.name,
      description: args.description,
      sortOrder: maxSortOrder + 1,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update a product category.
 */
export const update = ownerMutation({
  args: {
    categoryId: v.id("productCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  returns: productCategoryDocValidator,
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Category not found",
      });
    }

    // Check for duplicate name if changing name
    if (args.name && args.name.toLowerCase() !== category.name.toLowerCase()) {
      const existing = await ctx.db
        .query("productCategories")
        .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
        .collect();

      const newName = args.name;
      if (
        existing.some((c) => c.name.toLowerCase() === newName.toLowerCase())
      ) {
        throw new ConvexError({
          code: ErrorCode.ALREADY_EXISTS,
          message: "A category with this name already exists",
        });
      }
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.categoryId, updates);

    const updated = await ctx.db.get(args.categoryId);
    if (!updated) {
      throw new ConvexError({
        code: ErrorCode.INTERNAL_ERROR,
        message: "Failed to retrieve updated category",
      });
    }
    return updated;
  },
});

/**
 * Reorder product categories by accepting an ordered array of IDs.
 */
export const reorder = ownerMutation({
  args: {
    categoryIds: v.array(v.id("productCategories")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const updates = args.categoryIds.map(async (id, index) => {
      const category = await ctx.db.get(id);
      if (!category || category.organizationId !== ctx.organizationId) {
        throw new ConvexError({
          code: ErrorCode.NOT_FOUND,
          message: "Category not found",
        });
      }
      await ctx.db.patch(id, { sortOrder: index + 1, updatedAt: Date.now() });
    });

    await Promise.all(updates);
    return true;
  },
});

/**
 * Delete a product category.
 * Products in this category become uncategorized (categoryId = undefined).
 */
export const remove = ownerMutation({
  args: {
    categoryId: v.id("productCategories"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Category not found",
      });
    }

    // Reassign products to uncategorized
    const products = await ctx.db
      .query("products")
      .withIndex("by_org_category", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .eq("categoryId", args.categoryId),
      )
      .collect();

    for (const product of products) {
      await ctx.db.patch(product._id, {
        categoryId: undefined,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.delete(args.categoryId);
    return true;
  },
});
