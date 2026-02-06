import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { adminMutation, ErrorCode, orgQuery } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  serviceDocValidator,
  servicePriceTypeValidator,
  serviceStatusValidator,
  serviceWithCategoryValidator,
  staffDocValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List services for an organization
 * Optionally filter by categoryId and/or status
 */
export const list = orgQuery({
  args: {
    categoryId: v.optional(v.id("serviceCategories")),
    status: v.optional(serviceStatusValidator),
  },
  returns: v.array(serviceWithCategoryValidator),
  handler: async (ctx, args) => {
    let services: Doc<"services">[];

    if (args.categoryId) {
      services = await ctx.db
        .query("services")
        .withIndex("by_org_category", (q) =>
          q
            .eq("organizationId", ctx.organizationId)
            .eq("categoryId", args.categoryId),
        )
        .collect();
    } else {
      services = await ctx.db
        .query("services")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", ctx.organizationId),
        )
        .collect();
    }

    // Filter by status if provided
    if (args.status) {
      services = services.filter((s) => s.status === args.status);
    }

    // Fetch category names
    const categoryIds = [
      ...new Set(
        services
          .map((s) => s.categoryId)
          .filter(
            (id): id is NonNullable<typeof id> =>
              id !== undefined && id !== null,
          ),
      ),
    ];
    const categories = await Promise.all(
      categoryIds.map((id) => ctx.db.get(id)),
    );
    const categoryMap = new Map(
      categories
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .map((c) => [c._id, c.name]),
    );

    return services
      .map((service) => ({
        ...service,
        categoryName: service.categoryId
          ? categoryMap.get(service.categoryId)
          : undefined,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Get a single service by ID
 */
export const get = orgQuery({
  args: { serviceId: v.id("services") },
  returns: v.union(serviceWithCategoryValidator, v.null()),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service || service.organizationId !== ctx.organizationId) {
      return null;
    }

    let categoryName: string | undefined;
    if (service.categoryId) {
      const category = await ctx.db.get(service.categoryId);
      categoryName = category?.name;
    }

    return { ...service, categoryName };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new service
 * Rate limited: 50/day per organization
 */
export const create = adminMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("serviceCategories")),
    duration: v.number(),
    bufferTime: v.optional(v.number()),
    price: v.number(),
    priceType: servicePriceTypeValidator,
    imageUrl: v.optional(v.string()),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    // Rate limit check
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "createService", {
      key: ctx.organizationId,
    });
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Service creation limit exceeded. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000 / 60)} minutes.`,
      });
    }

    // Validate category belongs to this org if provided
    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.organizationId !== ctx.organizationId) {
        throw new ConvexError({
          code: ErrorCode.NOT_FOUND,
          message: "Category not found",
        });
      }
    }

    // Auto-set sortOrder to max + 1
    const existingServices = await ctx.db
      .query("services")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();

    const maxSortOrder = existingServices.reduce(
      (max, s) => Math.max(max, s.sortOrder),
      0,
    );

    const now = Date.now();
    return await ctx.db.insert("services", {
      organizationId: ctx.organizationId,
      categoryId: args.categoryId,
      name: args.name,
      description: args.description,
      duration: args.duration,
      bufferTime: args.bufferTime,
      price: args.price,
      priceType: args.priceType,
      imageUrl: args.imageUrl,
      sortOrder: maxSortOrder + 1,
      isPopular: false,
      status: "active",
      showOnline: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update an existing service
 */
export const update = adminMutation({
  args: {
    serviceId: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("serviceCategories")),
    duration: v.optional(v.number()),
    bufferTime: v.optional(v.number()),
    price: v.optional(v.number()),
    priceType: v.optional(servicePriceTypeValidator),
    isPopular: v.optional(v.boolean()),
    status: v.optional(serviceStatusValidator),
    showOnline: v.optional(v.boolean()),
  },
  returns: serviceDocValidator,
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service || service.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Service not found",
      });
    }

    // Validate category if changing
    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.organizationId !== ctx.organizationId) {
        throw new ConvexError({
          code: ErrorCode.NOT_FOUND,
          message: "Category not found",
        });
      }
    }

    const { serviceId, ...updates } = args;
    await ctx.db.patch(serviceId, {
      ...updates,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(serviceId);
    if (!updated) {
      throw new ConvexError({
        code: ErrorCode.INTERNAL_ERROR,
        message: "Failed to retrieve updated service",
      });
    }
    return updated;
  },
});

/**
 * Soft-delete a service (set status to inactive)
 * Does not hard-delete since future bookings may reference it
 */
export const remove = adminMutation({
  args: { serviceId: v.id("services") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service || service.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Service not found",
      });
    }

    await ctx.db.patch(args.serviceId, {
      status: "inactive",
      updatedAt: Date.now(),
    });

    // Remove this service from all staff serviceIds
    const staffMembers = await ctx.db
      .query("staff")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();

    for (const staff of staffMembers) {
      if (staff.serviceIds?.includes(args.serviceId)) {
        await ctx.db.patch(staff._id, {
          serviceIds: staff.serviceIds.filter((id) => id !== args.serviceId),
          updatedAt: Date.now(),
        });
      }
    }

    return true;
  },
});

/**
 * Assign or unassign staff to a service
 * Adds/removes the service ID from staff.serviceIds
 */
export const assignStaff = adminMutation({
  args: {
    serviceId: v.id("services"),
    staffId: v.id("staff"),
    assign: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service || service.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Service not found",
      });
    }

    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff not found",
      });
    }

    const currentServiceIds = staff.serviceIds ?? [];

    if (args.assign) {
      // Add service ID if not already present
      if (!currentServiceIds.includes(args.serviceId)) {
        await ctx.db.patch(args.staffId, {
          serviceIds: [...currentServiceIds, args.serviceId],
          updatedAt: Date.now(),
        });
      }
    } else {
      // Remove service ID
      await ctx.db.patch(args.staffId, {
        serviceIds: currentServiceIds.filter((id) => id !== args.serviceId),
        updatedAt: Date.now(),
      });
    }

    return true;
  },
});

/**
 * Get staff members who can perform a specific service
 */
export const getStaffForService = orgQuery({
  args: { serviceId: v.id("services") },
  returns: v.array(staffDocValidator),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service || service.organizationId !== ctx.organizationId) {
      return [];
    }

    const allStaff = await ctx.db
      .query("staff")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();

    return allStaff.filter(
      (s) => s.status === "active" && s.serviceIds?.includes(args.serviceId),
    );
  },
});
