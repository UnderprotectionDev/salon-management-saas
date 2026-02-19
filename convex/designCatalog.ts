/**
 * Design Catalog — salon design portfolio for virtual try-on
 *
 * Salon owners upload, categorize, reorder, and manage designs.
 * Customers browse active designs to select for virtual try-on.
 */

import { ConvexError, v } from "convex/values";
import {
  ErrorCode,
  orgMutation,
  orgQuery,
  ownerMutation,
  publicQuery,
} from "./lib/functions";
import {
  designCatalogDocValidator,
  designCatalogPublicValidator,
} from "./lib/validators";

// =============================================================================
// Org Mutations (owner + staff)
// =============================================================================

/**
 * Create a new design catalog entry.
 * Accessible by both owners and staff — staff's staffId is recorded.
 */
export const create = orgMutation({
  args: {
    name: v.string(),
    category: v.string(),
    imageStorageId: v.id("_storage"),
    thumbnailStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    tags: v.array(v.string()),
    salonType: v.union(
      v.literal("hair"),
      v.literal("nail"),
      v.literal("makeup"),
      v.literal("multi"),
    ),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  returns: v.id("designCatalog"),
  handler: async (ctx, args) => {
    // Get the current max sortOrder for this org
    const existing = await ctx.db
      .query("designCatalog")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .order("desc")
      .first();

    const sortOrder = existing ? existing.sortOrder + 1 : 0;
    const now = Date.now();

    return await ctx.db.insert("designCatalog", {
      organizationId: ctx.organizationId,
      name: args.name,
      category: args.category,
      imageStorageId: args.imageStorageId,
      thumbnailStorageId: args.thumbnailStorageId,
      description: args.description,
      tags: args.tags,
      salonType: args.salonType,
      status: args.status ?? "active",
      sortOrder,
      createdByStaffId: ctx.staff?._id ?? undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a design catalog entry.
 * Staff can only update their own designs; owners can update any.
 */
export const update = orgMutation({
  args: {
    designId: v.id("designCatalog"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    salonType: v.optional(
      v.union(
        v.literal("hair"),
        v.literal("nail"),
        v.literal("makeup"),
        v.literal("multi"),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const design = await ctx.db.get(args.designId);
    if (!design || design.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Design not found",
      });
    }

    // Staff can only edit their own designs
    const isOwner = ctx.member.role === "owner";
    if (!isOwner && design.createdByStaffId !== ctx.staff?._id) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You can only edit your own designs",
      });
    }

    const { designId: _, ...updates } = args;
    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined),
    );

    if (Object.keys(cleanUpdates).length > 0) {
      await ctx.db.patch(args.designId, {
        ...cleanUpdates,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Toggle design status between active and inactive.
 */
export const setStatus = ownerMutation({
  args: {
    designId: v.id("designCatalog"),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const design = await ctx.db.get(args.designId);
    if (!design || design.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Design not found",
      });
    }

    await ctx.db.patch(args.designId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Hard delete a design catalog entry.
 */
export const remove = ownerMutation({
  args: {
    designId: v.id("designCatalog"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const design = await ctx.db.get(args.designId);
    if (!design || design.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Design not found",
      });
    }

    // Clean up associated storage files
    await ctx.storage.delete(design.imageStorageId);
    if (design.thumbnailStorageId) {
      await ctx.storage.delete(design.thumbnailStorageId);
    }

    await ctx.db.delete(args.designId);
    return null;
  },
});

/**
 * Batch update sortOrder values for drag-to-reorder.
 */
export const reorder = ownerMutation({
  args: {
    orderedIds: v.array(v.id("designCatalog")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Validate all IDs belong to this organization
    const designs = await Promise.all(
      args.orderedIds.map((id) => ctx.db.get(id)),
    );
    for (const design of designs) {
      if (!design || design.organizationId !== ctx.organizationId) {
        throw new ConvexError({
          code: ErrorCode.FORBIDDEN,
          message: "One or more designs do not belong to this organization",
        });
      }
    }

    const updates = args.orderedIds.map((id, index) =>
      ctx.db.patch(id, { sortOrder: index, updatedAt: Date.now() }),
    );
    await Promise.all(updates);
    return null;
  },
});

// =============================================================================
// Owner-only Mutations (status/delete/reorder)
// =============================================================================

// (setStatus, remove, reorder remain as ownerMutation below)

// =============================================================================
// Org Queries (owner + staff)
// =============================================================================

/**
 * List all designs for management (including inactive).
 * Staff see all org designs so they can see each other's work.
 * Capped at 500 designs per org — sufficient for any realistic catalog.
 */
export const listAllByOrg = orgQuery({
  args: {},
  returns: v.array(designCatalogPublicValidator),
  handler: async (ctx) => {
    const designs = await ctx.db
      .query("designCatalog")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .take(500);

    return await Promise.all(
      designs.map(async (design) => {
        const imageUrl = await ctx.storage.getUrl(design.imageStorageId);
        const thumbnailUrl = design.thumbnailStorageId
          ? await ctx.storage.getUrl(design.thumbnailStorageId)
          : null;
        return {
          ...design,
          imageUrl: imageUrl ?? undefined,
          thumbnailUrl: thumbnailUrl ?? undefined,
        };
      }),
    );
  },
});

/**
 * List designs created by the current staff member.
 * Used in staff view to show "my designs".
 */
export const listMyDesigns = orgQuery({
  args: {},
  returns: v.array(designCatalogDocValidator),
  handler: async (ctx) => {
    if (!ctx.staff) return [];
    return await ctx.db
      .query("designCatalog")
      .withIndex("by_org_staff", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .eq("createdByStaffId", ctx.staff?._id),
      )
      .collect();
  },
});

// =============================================================================
// Public Queries (customer-facing)
// =============================================================================

/**
 * List active designs for customers, sorted by sortOrder.
 * Capped at 200 active designs — standard customer-facing catalog limit.
 */
export const listByOrg = publicQuery({
  args: {
    organizationId: v.id("organization"),
  },
  returns: v.array(designCatalogPublicValidator),
  handler: async (ctx, args) => {
    const designs = await ctx.db
      .query("designCatalog")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .take(200);

    // Sort by sortOrder in memory (already fetched)
    designs.sort((a, b) => a.sortOrder - b.sortOrder);

    // Resolve image URLs
    const withUrls = await Promise.all(
      designs.map(async (design) => {
        const imageUrl = await ctx.storage.getUrl(design.imageStorageId);
        const thumbnailUrl = design.thumbnailStorageId
          ? await ctx.storage.getUrl(design.thumbnailStorageId)
          : null;

        return {
          ...design,
          imageUrl: imageUrl ?? undefined,
          thumbnailUrl: thumbnailUrl ?? undefined,
        };
      }),
    );

    return withUrls;
  },
});

/**
 * List active designs for a specific staff member's public portfolio.
 * If staffId is omitted, returns all active designs for the org.
 */
export const listByStaff = publicQuery({
  args: {
    organizationId: v.id("organization"),
    staffId: v.optional(v.id("staff")),
  },
  returns: v.array(designCatalogPublicValidator),
  handler: async (ctx, args) => {
    // by_org_staff index doesn't encode status, so we take a capped set and
    // filter in memory. by_org_status is used for the "all active" branch.
    const allActive = args.staffId
      ? (
          await ctx.db
            .query("designCatalog")
            .withIndex("by_org_staff", (q) =>
              q
                .eq("organizationId", args.organizationId)
                .eq("createdByStaffId", args.staffId),
            )
            .take(200)
        ).filter((d) => d.status === "active")
      : await ctx.db
          .query("designCatalog")
          .withIndex("by_org_status", (q) =>
            q.eq("organizationId", args.organizationId).eq("status", "active"),
          )
          .take(200);

    const designs = allActive.sort((a, b) => a.sortOrder - b.sortOrder);

    return await Promise.all(
      designs.map(async (design) => {
        const imageUrl = await ctx.storage.getUrl(design.imageStorageId);
        const thumbnailUrl = design.thumbnailStorageId
          ? await ctx.storage.getUrl(design.thumbnailStorageId)
          : null;
        return {
          ...design,
          imageUrl: imageUrl ?? undefined,
          thumbnailUrl: thumbnailUrl ?? undefined,
        };
      }),
    );
  },
});

/**
 * List active designs filtered by category.
 */
export const listByCategory = publicQuery({
  args: {
    organizationId: v.id("organization"),
    category: v.string(),
  },
  returns: v.array(designCatalogPublicValidator),
  handler: async (ctx, args) => {
    // by_org_category index doesn't include status — filter in memory after
    // a capped fetch (categories are usually a small subset of the full catalog).
    const designs = await ctx.db
      .query("designCatalog")
      .withIndex("by_org_category", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("category", args.category),
      )
      .take(200);

    // Filter to active only and sort
    const active = designs
      .filter((d) => d.status === "active")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // Resolve image URLs
    const withUrls = await Promise.all(
      active.map(async (design) => {
        const imageUrl = await ctx.storage.getUrl(design.imageStorageId);
        const thumbnailUrl = design.thumbnailStorageId
          ? await ctx.storage.getUrl(design.thumbnailStorageId)
          : null;

        return {
          ...design,
          imageUrl: imageUrl ?? undefined,
          thumbnailUrl: thumbnailUrl ?? undefined,
        };
      }),
    );

    return withUrls;
  },
});

/**
 * Get unique categories for a salon's design catalog.
 * Capped at 200 active designs (same as listByOrg).
 */
export const getCategories = publicQuery({
  args: {
    organizationId: v.id("organization"),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const designs = await ctx.db
      .query("designCatalog")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .take(200);

    const categories = [...new Set(designs.map((d) => d.category))];
    return categories.sort();
  },
});
