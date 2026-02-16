import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import {
  authedMutation,
  authedQuery,
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
  customerProfileValidator,
  customerSearchResultValidator,
  customerSourceValidator,
  customerWithStaffValidator,
} from "./lib/validators";

// =============================================================================
// Helper: Get customer IDs for a staff member (customers they've served)
// =============================================================================

async function getStaffCustomerIds(
  db: DatabaseReader,
  staffId: Id<"staff">,
): Promise<Set<string>> {
  const appointments = await db
    .query("appointments")
    .withIndex("by_staff_date", (q) => q.eq("staffId", staffId))
    .collect();
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
        ? await getStaffCustomerIds(ctx.db, ctx.staff._id)
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
      const staffCustomerIds = await getStaffCustomerIds(ctx.db, ctx.staff._id);
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
        ? await getStaffCustomerIds(ctx.db, ctx.staff._id)
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
        .collect();
    } else {
      customers = await ctx.db
        .query("customers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", ctx.organizationId),
        )
        .collect();
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
        ? await getStaffCustomerIds(ctx.db, ctx.staff._id)
        : null;

    // Fetch all org customers for substring phone matching
    // .collect() instead of .take(200) to avoid silently missing matches in larger orgs
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();

    let filtered = customers.filter((c) => c.phone.includes(args.phonePrefix));

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
      const staffCustomerIds = await getStaffCustomerIds(ctx.db, ctx.staff._id);
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

/**
 * Merge two customer records
 * Keeps primary, merges stats from duplicate, deletes duplicate
 * Admin/owner only
 */
export const merge = ownerMutation({
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

    // Reassign all appointments from duplicate to primary
    const duplicateAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_customer", (q) =>
        q.eq("customerId", args.duplicateCustomerId),
      )
      .collect();

    for (const apt of duplicateAppointments) {
      await ctx.db.patch(apt._id, { customerId: args.primaryCustomerId });
    }

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

// =============================================================================
// Customer–User Linking
// =============================================================================

// =============================================================================
// Authenticated Customer (Dashboard)
// =============================================================================

/**
 * Get all customer profiles linked to the current user (across orgs).
 * Used by the dashboard to show profile info.
 */
export const getMyProfiles = authedQuery({
  args: {},
  returns: v.array(customerProfileValidator),
  handler: async (ctx) => {
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    const enriched = await Promise.all(
      customers.map(async (c) => {
        const org = await ctx.db.get(c.organizationId);
        return {
          _id: c._id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          organizationId: c.organizationId,
          organizationName: org?.name ?? "Unknown",
          organizationSlug: org?.slug ?? "",
          totalVisits: c.totalVisits ?? 0,
          totalSpent: c.totalSpent ?? 0,
          createdAt: c.createdAt,
        };
      }),
    );

    return enriched;
  },
});

/**
 * Update a customer profile from the dashboard.
 * Verifies ownership via customer.userId.
 */
export const updateMyProfile = authedMutation({
  args: {
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.userId !== ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You do not have permission to update this profile",
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
            .eq("organizationId", customer.organizationId)
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
              .eq("organizationId", customer.organizationId)
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

    const { customerId, ...updates } = args;
    await ctx.db.patch(customerId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Link a customer record to the current authenticated user.
 * Called after public booking to connect the appointment to the user's account.
 */
export const linkToCurrentUser = authedMutation({
  args: {
    customerId: v.id("customers"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      return { success: false };
    }

    // Verify the user's email or phone matches the customer record
    // This prevents cross-tenant linking by ensuring only the actual customer can link
    const userEmail = ctx.user.email;
    const emailMatches =
      userEmail && customer.email && userEmail === customer.email;
    if (!emailMatches) {
      return { success: false };
    }

    // Only link if not already linked to a different user
    if (customer.userId && customer.userId !== ctx.user._id) {
      return { success: false };
    }

    // Already linked to this user
    if (customer.userId === ctx.user._id) {
      return { success: true };
    }

    await ctx.db.patch(args.customerId, {
      userId: ctx.user._id,
      accountStatus: "registered",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
