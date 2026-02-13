import { ConvexError, v } from "convex/values";
import { ErrorCode, orgQuery, ownerMutation } from "./lib/functions";
import {
  serviceCategoryDocValidator,
  serviceCategoryWithCountValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List service categories for an organization with service counts
 */
export const list = orgQuery({
  args: {},
  returns: v.array(serviceCategoryWithCountValidator),
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();

    // Batch fetch all services once and count per category (avoids N+1)
    const allServices = await ctx.db
      .query("services")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();

    const countMap = new Map<string, number>();
    for (const svc of allServices) {
      if (svc.categoryId) {
        countMap.set(svc.categoryId, (countMap.get(svc.categoryId) ?? 0) + 1);
      }
    }

    const categoriesWithCounts = categories.map((category) => ({
      ...category,
      serviceCount: countMap.get(category._id) ?? 0,
    }));

    // Sort by sortOrder
    return categoriesWithCounts.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a service category
 */
export const create = ownerMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("serviceCategories"),
  handler: async (ctx, args) => {
    // Check for duplicate name in this organization
    const existing = await ctx.db
      .query("serviceCategories")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();

    if (
      existing.some((c) => c.name.toLowerCase() === args.name.toLowerCase())
    ) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "A category with this name already exists",
      });
    }

    // Auto-set sortOrder to max + 1
    const maxSortOrder = existing.reduce(
      (max, c) => Math.max(max, c.sortOrder),
      0,
    );

    return await ctx.db.insert("serviceCategories", {
      organizationId: ctx.organizationId,
      name: args.name,
      description: args.description,
      sortOrder: maxSortOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update a service category
 */
export const update = ownerMutation({
  args: {
    categoryId: v.id("serviceCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: serviceCategoryDocValidator,
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
        .query("serviceCategories")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", ctx.organizationId),
        )
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

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    updates.updatedAt = Date.now();

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
 * Reorder service categories.
 * Accepts an ordered array of category IDs and updates their sortOrder.
 */
export const reorder = ownerMutation({
  args: {
    categoryIds: v.array(v.id("serviceCategories")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Validate all categories belong to this organization
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
 * Delete a service category
 * Services in this category become uncategorized (categoryId = undefined)
 */
export const remove = ownerMutation({
  args: {
    categoryId: v.id("serviceCategories"),
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

    // Reassign services to uncategorized
    const services = await ctx.db
      .query("services")
      .withIndex("by_org_category", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .eq("categoryId", args.categoryId),
      )
      .collect();

    for (const service of services) {
      await ctx.db.patch(service._id, { categoryId: undefined });
    }

    await ctx.db.delete(args.categoryId);
    return true;
  },
});
