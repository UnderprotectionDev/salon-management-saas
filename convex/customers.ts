import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  adminMutation,
  ErrorCode,
  orgMutation,
  orgQuery,
} from "./lib/functions";
import { isValidTurkishPhone } from "./lib/phone";
import { rateLimiter } from "./lib/rateLimits";
import {
  customerAccountStatusValidator,
  customerDocValidator,
  customerListItemValidator,
  customerNotificationPreferencesValidator,
  customerSourceValidator,
  customerWithStaffValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

/**
 * List customers for an organization
 * Supports full-text search via searchIndex and optional status filter
 */
export const list = orgQuery({
  args: {
    search: v.optional(v.string()),
    accountStatus: v.optional(customerAccountStatusValidator),
  },
  returns: v.array(customerListItemValidator),
  handler: async (ctx, args) => {
    let customers: Doc<"customers">[];

    if (args.search && args.search.trim().length > 0) {
      customers = await ctx.db
        .query("customers")
        .withSearchIndex("search_customers", (q) =>
          q
            .search("name", args.search as string)
            .eq("organizationId", ctx.organizationId),
        )
        .collect();
    } else {
      customers = await ctx.db
        .query("customers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", ctx.organizationId),
        )
        .collect();
    }

    // Filter by accountStatus if provided
    if (args.accountStatus) {
      customers = customers.filter(
        (c) => c.accountStatus === args.accountStatus,
      );
    }

    // Sort by name for non-search results (search results are ranked by relevance)
    if (!args.search) {
      customers.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    }

    return customers.map((c) => ({
      _id: c._id,
      _creationTime: c._creationTime,
      name: c.name,
      email: c.email,
      phone: c.phone,
      accountStatus: c.accountStatus,
      totalVisits: c.totalVisits,
      totalSpent: c.totalSpent,
      lastVisitDate: c.lastVisitDate,
      noShowCount: c.noShowCount,
      tags: c.tags,
      source: c.source,
      createdAt: c.createdAt,
    }));
  },
});

/**
 * Get a single customer by ID (enriched with preferred staff name)
 */
export const get = orgQuery({
  args: { customerId: v.id("customers") },
  returns: v.union(customerWithStaffValidator, v.null()),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== ctx.organizationId) {
      return null;
    }

    let preferredStaffName: string | undefined;
    if (customer.preferredStaffId) {
      const staff = await ctx.db.get(customer.preferredStaffId);
      preferredStaffName = staff?.name;
    }

    return { ...customer, preferredStaffName };
  },
});

/**
 * Advanced search with multiple filters
 */
export const advancedSearch = orgQuery({
  args: {
    query: v.optional(v.string()),
    lastVisitDays: v.optional(v.number()),
    totalVisitsMin: v.optional(v.number()),
    totalVisitsMax: v.optional(v.number()),
    totalSpentMin: v.optional(v.number()),
    totalSpentMax: v.optional(v.number()),
    noShowCountMin: v.optional(v.number()),
    noShowCountMax: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    source: v.optional(customerSourceValidator),
    accountStatus: v.optional(customerAccountStatusValidator),
  },
  returns: v.object({
    customers: v.array(customerListItemValidator),
    totalCount: v.number(),
  }),
  handler: async (ctx, args) => {
    let customers: Doc<"customers">[];

    if (args.query && args.query.trim().length > 0) {
      customers = await ctx.db
        .query("customers")
        .withSearchIndex("search_customers", (q) =>
          q
            .search("name", args.query as string)
            .eq("organizationId", ctx.organizationId),
        )
        .collect();
    } else {
      customers = await ctx.db
        .query("customers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", ctx.organizationId),
        )
        .collect();
    }

    // Apply filters
    if (args.accountStatus) {
      customers = customers.filter(
        (c) => c.accountStatus === args.accountStatus,
      );
    }
    if (args.source) {
      customers = customers.filter((c) => c.source === args.source);
    }
    if (args.totalVisitsMin !== undefined) {
      customers = customers.filter(
        (c) => (c.totalVisits ?? 0) >= (args.totalVisitsMin as number),
      );
    }
    if (args.totalVisitsMax !== undefined) {
      customers = customers.filter(
        (c) => (c.totalVisits ?? 0) <= (args.totalVisitsMax as number),
      );
    }
    if (args.totalSpentMin !== undefined) {
      customers = customers.filter(
        (c) => (c.totalSpent ?? 0) >= (args.totalSpentMin as number),
      );
    }
    if (args.totalSpentMax !== undefined) {
      customers = customers.filter(
        (c) => (c.totalSpent ?? 0) <= (args.totalSpentMax as number),
      );
    }
    if (args.noShowCountMin !== undefined) {
      customers = customers.filter(
        (c) => (c.noShowCount ?? 0) >= (args.noShowCountMin as number),
      );
    }
    if (args.noShowCountMax !== undefined) {
      customers = customers.filter(
        (c) => (c.noShowCount ?? 0) <= (args.noShowCountMax as number),
      );
    }
    if (args.tags && args.tags.length > 0) {
      const filterTags = args.tags;
      customers = customers.filter((c) =>
        filterTags.some((tag) => c.tags?.includes(tag)),
      );
    }
    if (args.lastVisitDays !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - args.lastVisitDays);
      const cutoffStr = cutoffDate.toISOString().split("T")[0];
      customers = customers.filter(
        (c) => c.lastVisitDate && c.lastVisitDate >= cutoffStr,
      );
    }

    const totalCount = customers.length;

    return {
      customers: customers.map((c) => ({
        _id: c._id,
        _creationTime: c._creationTime,
        name: c.name,
        email: c.email,
        phone: c.phone,
        accountStatus: c.accountStatus,
        totalVisits: c.totalVisits,
        totalSpent: c.totalSpent,
        lastVisitDate: c.lastVisitDate,
        noShowCount: c.noShowCount,
        tags: c.tags,
        source: c.source,
        createdAt: c.createdAt,
      })),
      totalCount,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new customer
 * Rate limited: 30/hour per organization
 * Phone must be valid Turkish format, unique per org
 */
export const create = orgMutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    customerNotes: v.optional(v.string()),
    staffNotes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    source: v.optional(customerSourceValidator),
  },
  returns: v.id("customers"),
  handler: async (ctx, args) => {
    // Rate limit
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "createCustomer", {
      key: ctx.organizationId,
    });
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Customer creation limit exceeded. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000 / 60)} minutes.`,
      });
    }

    // Phone validation
    if (!isValidTurkishPhone(args.phone)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          "Invalid phone format. Use Turkish mobile format: +90 5XX XXX XX XX",
      });
    }

    // Phone uniqueness per org
    const existingByPhone = await ctx.db
      .query("customers")
      .withIndex("by_org_phone", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("phone", args.phone),
      )
      .first();
    if (existingByPhone) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "A customer with this phone number already exists",
      });
    }

    // Email uniqueness per org (if provided)
    if (args.email) {
      const existingByEmail = await ctx.db
        .query("customers")
        .withIndex("by_org_email", (q) =>
          q.eq("organizationId", ctx.organizationId).eq("email", args.email),
        )
        .first();
      if (existingByEmail) {
        throw new ConvexError({
          code: ErrorCode.ALREADY_EXISTS,
          message: "A customer with this email already exists",
        });
      }
    }

    const now = Date.now();
    return await ctx.db.insert("customers", {
      organizationId: ctx.organizationId,
      name: args.name,
      phone: args.phone,
      email: args.email,
      customerNotes: args.customerNotes,
      staffNotes: args.staffNotes,
      tags: args.tags,
      source: args.source,
      accountStatus: "guest",
      totalVisits: 0,
      totalSpent: 0,
      noShowCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update a customer
 * Re-checks phone/email uniqueness if changed
 */
export const update = orgMutation({
  args: {
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    preferredStaffId: v.optional(v.id("staff")),
    customerNotes: v.optional(v.string()),
    staffNotes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notificationPreferences: v.optional(
      customerNotificationPreferencesValidator,
    ),
  },
  returns: customerDocValidator,
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Customer not found",
      });
    }

    // Phone validation + uniqueness if changed
    if (args.phone !== undefined && args.phone !== customer.phone) {
      if (!isValidTurkishPhone(args.phone)) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message:
            "Invalid phone format. Use Turkish mobile format: +90 5XX XXX XX XX",
        });
      }
      const existingByPhone = await ctx.db
        .query("customers")
        .withIndex("by_org_phone", (q) =>
          q
            .eq("organizationId", ctx.organizationId)
            .eq("phone", args.phone as string),
        )
        .first();
      if (existingByPhone && existingByPhone._id !== args.customerId) {
        throw new ConvexError({
          code: ErrorCode.ALREADY_EXISTS,
          message: "A customer with this phone number already exists",
        });
      }
    }

    // Email uniqueness if changed
    if (args.email !== undefined && args.email !== customer.email) {
      if (args.email) {
        const existingByEmail = await ctx.db
          .query("customers")
          .withIndex("by_org_email", (q) =>
            q
              .eq("organizationId", ctx.organizationId)
              .eq("email", args.email as string),
          )
          .first();
        if (existingByEmail && existingByEmail._id !== args.customerId) {
          throw new ConvexError({
            code: ErrorCode.ALREADY_EXISTS,
            message: "A customer with this email already exists",
          });
        }
      }
    }

    // Validate preferred staff belongs to org
    if (args.preferredStaffId) {
      const staff = await ctx.db.get(args.preferredStaffId);
      if (!staff || staff.organizationId !== ctx.organizationId) {
        throw new ConvexError({
          code: ErrorCode.NOT_FOUND,
          message: "Staff member not found",
        });
      }
    }

    const { customerId, ...updates } = args;
    await ctx.db.patch(customerId, {
      ...updates,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(customerId);
    if (!updated) {
      throw new ConvexError({
        code: ErrorCode.INTERNAL_ERROR,
        message: "Failed to retrieve updated customer",
      });
    }
    return updated;
  },
});

/**
 * Delete a customer (hard delete)
 * Admin/owner only
 */
export const remove = adminMutation({
  args: { customerId: v.id("customers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Customer not found",
      });
    }

    await ctx.db.delete(args.customerId);
    return null;
  },
});

/**
 * Merge two customer records
 * Keeps primary, merges stats from duplicate, deletes duplicate
 * Admin/owner only
 */
export const merge = adminMutation({
  args: {
    primaryCustomerId: v.id("customers"),
    duplicateCustomerId: v.id("customers"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    if (args.primaryCustomerId === args.duplicateCustomerId) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot merge a customer with itself",
      });
    }

    const primary = await ctx.db.get(args.primaryCustomerId);
    if (!primary || primary.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Primary customer not found",
      });
    }

    const duplicate = await ctx.db.get(args.duplicateCustomerId);
    if (!duplicate || duplicate.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Duplicate customer not found",
      });
    }

    // Merge stats
    const mergedVisits =
      (primary.totalVisits ?? 0) + (duplicate.totalVisits ?? 0);
    const mergedSpent = (primary.totalSpent ?? 0) + (duplicate.totalSpent ?? 0);
    const mergedNoShows =
      (primary.noShowCount ?? 0) + (duplicate.noShowCount ?? 0);

    // Pick latest visit date
    let mergedLastVisit = primary.lastVisitDate;
    if (
      duplicate.lastVisitDate &&
      (!mergedLastVisit || duplicate.lastVisitDate > mergedLastVisit)
    ) {
      mergedLastVisit = duplicate.lastVisitDate;
    }

    // Merge tags (union)
    const primaryTags = primary.tags ?? [];
    const duplicateTags = duplicate.tags ?? [];
    const mergedTags = [...new Set([...primaryTags, ...duplicateTags])];

    // Take duplicate's notes if primary is missing
    const mergedCustomerNotes =
      primary.customerNotes || duplicate.customerNotes;
    const mergedStaffNotes = primary.staffNotes || duplicate.staffNotes;

    // Update primary with merged data
    await ctx.db.patch(args.primaryCustomerId, {
      totalVisits: mergedVisits,
      totalSpent: mergedSpent,
      noShowCount: mergedNoShows,
      lastVisitDate: mergedLastVisit,
      tags: mergedTags.length > 0 ? mergedTags : undefined,
      customerNotes: mergedCustomerNotes,
      staffNotes: mergedStaffNotes,
      updatedAt: Date.now(),
    });

    // Delete duplicate
    await ctx.db.delete(args.duplicateCustomerId);

    return { success: true };
  },
});
