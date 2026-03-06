import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import {
  ErrorCode,
  orgMutation,
  orgQuery,
  ownerMutation,
} from "./lib/functions";
import { isValidTurkishPhone } from "./lib/phone";
import { rateLimiter } from "./lib/rateLimits";
import {
  customerAccountStatusValidator,
  customerDocValidator,
  customerListItemValidator,
  customerListStatsValidator,
  customerSourceValidator,
  customerWithStaffValidator,
} from "./lib/validators";

// =============================================================================
// Helper: Get customer IDs for a staff member (customers they've served)
// =============================================================================

async function getStaffCustomerIds(
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
    limit: v.optional(v.number()),
  },
  returns: v.array(customerListItemValidator),
  handler: async (ctx, args) => {
    const maxResults = Math.min(args.limit ?? 200, 500);
    const isStaffOnly = ctx.member.role === "staff";
    const staffCustomerIds =
      isStaffOnly && ctx.staff?._id
        ? await getStaffCustomerIds(ctx.db, ctx.staff._id, ctx.organizationId)
        : null;

    let customers: Doc<"customers">[];

    if (args.search && args.search.trim().length > 0) {
      customers = await ctx.db
        .query("customers")
        .withSearchIndex("search_customers", (q) =>
          q
            .search("name", args.search as string)
            .eq("organizationId", ctx.organizationId),
        )
        .take(maxResults);
    } else {
      customers = await ctx.db
        .query("customers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", ctx.organizationId),
        )
        .take(maxResults);
    }

    // Staff: only their customers
    if (staffCustomerIds) {
      customers = customers.filter((c) =>
        staffCustomerIds.has(c._id as string),
      );
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
 * Get aggregate stats for the customer list page header.
 * Respects staff-scoped visibility.
 */
export const getListStats = orgQuery({
  args: {},
  returns: customerListStatsValidator,
  handler: async (ctx) => {
    const isStaffOnly = ctx.member.role === "staff";
    const staffCustomerIds =
      isStaffOnly && ctx.staff?._id
        ? await getStaffCustomerIds(ctx.db, ctx.staff._id, ctx.organizationId)
        : null;

    let customers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();

    if (staffCustomerIds) {
      customers = customers.filter((c) =>
        staffCustomerIds.has(c._id as string),
      );
    }

    const totalCustomers = customers.length;

    // New this month
    const now = new Date();
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).getTime();
    const newThisMonth = customers.filter(
      (c) => c.createdAt >= startOfMonth,
    ).length;

    // Active: visited in last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffStr = ninetyDaysAgo.toISOString().split("T")[0];
    const activeCustomers = customers.filter(
      (c) => c.lastVisitDate && c.lastVisitDate >= cutoffStr,
    ).length;

    // Average spend
    const totalSpent = customers.reduce(
      (sum, c) => sum + (c.totalSpent ?? 0),
      0,
    );
    const averageSpend =
      totalCustomers > 0 ? Math.round(totalSpent / totalCustomers) : 0;

    return { totalCustomers, newThisMonth, activeCustomers, averageSpend };
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

    // Staff can only see their own customers
    const isStaffOnly = ctx.member.role === "staff";
    if (isStaffOnly && ctx.staff?._id) {
      const staffCustomerIds = await getStaffCustomerIds(
        ctx.db,
        ctx.staff._id,
        ctx.organizationId,
      );
      if (!staffCustomerIds.has(customer._id as string)) {
        return null;
      }
    }

    let preferredStaffName: string | undefined;
    if (customer.preferredStaffId) {
      const staff = await ctx.db.get(customer.preferredStaffId);
      preferredStaffName = staff?.name;
    }

    return { ...customer, preferredStaffName };
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
    preferredStaffId: v.optional(v.id("staff")),
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
      preferredStaffId: args.preferredStaffId,
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

    // Staff can only update their own customers
    const isStaffOnly = ctx.member.role === "staff";
    if (isStaffOnly && ctx.staff?._id) {
      const staffCustomerIds = await getStaffCustomerIds(
        ctx.db,
        ctx.staff._id,
        ctx.organizationId,
      );
      if (!staffCustomerIds.has(customer._id as string)) {
        throw new ConvexError({
          code: ErrorCode.FORBIDDEN,
          message: "You can only update your own customers",
        });
      }
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
 * Delete a customer.
 * - Blocks deletion if customer has active/pending appointments
 * - If customer has past appointments, preserves customer name in staff notes
 *   and then hard-deletes the customer record
 * - Hard-deletes immediately if customer has no appointments
 * Admin/owner only
 */
export const remove = ownerMutation({
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

    // Check for existing appointments
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();

    // Block deletion if there are active/pending appointments
    const activeStatuses = [
      "pending",
      "confirmed",
      "checked_in",
      "in_progress",
    ];
    const hasActiveAppointments = appointments.some((apt) =>
      activeStatuses.includes(apt.status),
    );

    if (hasActiveAppointments) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          "Cannot delete customer with active or pending appointments. Cancel the appointments first.",
      });
    }

    // Record deleted customer info on past appointments.
    // Note: customerId remains as a dangling reference since the schema requires it (non-optional).
    // The staffNotes annotation preserves the customer name for historical context.
    for (const apt of appointments) {
      await ctx.db.patch(apt._id, {
        staffNotes: [apt.staffNotes, `(Deleted customer: ${customer.name})`]
          .filter(Boolean)
          .join(" "),
      });
    }

    await ctx.db.delete(args.customerId);
    return null;
  },
});
