import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import { orgQuery } from "./lib/functions";
import {
  customerAccountStatusValidator,
  customerListItemValidator,
  customerSearchResultValidator,
  customerSourceValidator,
} from "./lib/validators";

// =============================================================================
// Helper: Get customer IDs for a staff member (customers they've served)
// =============================================================================

export async function getStaffCustomerIds(
  db: DatabaseReader,
  staffId: Id<"staff">,
  organizationId?: Id<"organization">,
): Promise<Set<string>> {
  // Capped at 1000 most-recent appointments to avoid unbounded scans.
  // Uses compound index when organizationId is provided to avoid in-memory filtering.
  const appointments = organizationId
    ? await db
        .query("appointments")
        .withIndex("by_staff_org_date", (q) =>
          q.eq("staffId", staffId).eq("organizationId", organizationId),
        )
        .order("desc")
        .take(1000)
    : await db
        .query("appointments")
        .withIndex("by_staff_date", (q) => q.eq("staffId", staffId))
        .order("desc")
        .take(1000);
  return new Set(appointments.map((a) => a.customerId as string));
}

// =============================================================================
// Search Queries
// =============================================================================

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
    const isStaffOnly = ctx.member.role === "staff";
    const staffCustomerIds =
      isStaffOnly && ctx.staff?._id
        ? await getStaffCustomerIds(ctx.db, ctx.staff._id, ctx.organizationId)
        : null;

    let customers: Doc<"customers">[];

    if (args.query && args.query.trim().length > 0) {
      customers = await ctx.db
        .query("customers")
        .withSearchIndex("search_customers", (q) =>
          q
            .search("name", args.query as string)
            .eq("organizationId", ctx.organizationId),
        )
        .take(500);
    } else {
      customers = await ctx.db
        .query("customers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", ctx.organizationId),
        )
        .take(500);
    }

    // Staff: only their customers
    if (staffCustomerIds) {
      customers = customers.filter((c) =>
        staffCustomerIds.has(c._id as string),
      );
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

/**
 * Search customers by phone prefix (for walk-in autocomplete).
 * Returns up to 10 matching results.
 */
export const searchByPhone = orgQuery({
  args: {
    phonePrefix: v.string(),
  },
  returns: v.array(customerSearchResultValidator),
  handler: async (ctx, args) => {
    if (args.phonePrefix.length < 3) {
      return [];
    }

    const isStaffOnly = ctx.member.role === "staff";
    const staffCustomerIds =
      isStaffOnly && ctx.staff?._id
        ? await getStaffCustomerIds(ctx.db, ctx.staff._id, ctx.organizationId)
        : null;

    // Fetch org customers for substring phone matching (capped at 2000)
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .take(2000);

    let filtered = customers.filter((c) => c.phone?.startsWith(args.phonePrefix));

    // Staff: only their customers
    if (staffCustomerIds) {
      filtered = filtered.filter((c) => staffCustomerIds.has(c._id as string));
    }

    return filtered.slice(0, 10).map((c) => ({
      _id: c._id,
      name: c.name,
      phone: c.phone,
      email: c.email,
    }));
  },
});
