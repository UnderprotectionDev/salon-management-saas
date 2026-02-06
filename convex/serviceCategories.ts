import { ConvexError, v } from "convex/values";
import { adminMutation, ErrorCode, orgQuery } from "./lib/functions";
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

    // Get service counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const services = await ctx.db
          .query("services")
          .withIndex("by_org_category", (q) =>
            q
              .eq("organizationId", ctx.organizationId)
              .eq("categoryId", category._id),
          )
          .collect();

        return {
          ...category,
          serviceCount: services.length,
        };
      }),
    );

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
export const create = adminMutation({
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
export const update = adminMutation({
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
 * Delete a service category
 * Services in this category become uncategorized (categoryId = undefined)
 */
export const remove = adminMutation({
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
