import { v } from "convex/values";
import {
  adminMutation,
  authedMutation,
  maybeAuthedQuery,
  orgQuery,
  publicQuery,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";

// =============================================================================
// Validators
// =============================================================================

const businessHoursDayValidator = v.optional(
  v.object({
    open: v.string(),
    close: v.string(),
    closed: v.boolean(),
  }),
);

const businessHoursValidator = v.optional(
  v.object({
    monday: businessHoursDayValidator,
    tuesday: businessHoursDayValidator,
    wednesday: businessHoursDayValidator,
    thursday: businessHoursDayValidator,
    friday: businessHoursDayValidator,
    saturday: businessHoursDayValidator,
    sunday: businessHoursDayValidator,
  }),
);

const bookingSettingsValidator = v.optional(
  v.object({
    minAdvanceBookingMinutes: v.optional(v.number()),
    maxAdvanceBookingDays: v.optional(v.number()),
    slotDurationMinutes: v.optional(v.number()),
    bufferBetweenBookingsMinutes: v.optional(v.number()),
    allowOnlineBooking: v.optional(v.boolean()),
    requireDeposit: v.optional(v.boolean()),
    depositAmount: v.optional(v.number()),
    cancellationPolicyHours: v.optional(v.number()),
  }),
);

const addressValidator = v.optional(
  v.object({
    street: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
  }),
);

// =============================================================================
// Public Queries
// =============================================================================

/**
 * Get organization by slug
 * Public query - no authentication required
 */
export const getBySlug = publicQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organization")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Get organization by ID
 * Public query - no authentication required
 */
export const get = publicQuery({
  args: { id: v.id("organization") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id);
  },
});

// =============================================================================
// Authenticated Queries
// =============================================================================

/**
 * List all organizations the current user belongs to
 * Uses maybeAuthedQuery - returns empty array if not authenticated
 */
export const listForUser = maybeAuthedQuery({
  args: {},
  handler: async (ctx) => {
    // Return empty array if not authenticated
    if (!ctx.user) {
      return [];
    }

    // Get all memberships for this user
    const memberships = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", ctx.user._id))
      .collect();

    // Get organization details for each membership
    const organizations = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.organizationId);
        return org
          ? {
              ...org,
              role: m.role,
              memberId: m._id,
            }
          : null;
      }),
    );

    return organizations.filter(
      (org): org is NonNullable<typeof org> => org !== null,
    );
  },
});

/**
 * Check if user has any organizations
 * Uses maybeAuthedQuery - returns false if not authenticated
 */
export const hasOrganization = maybeAuthedQuery({
  args: {},
  handler: async (ctx) => {
    // Return false if not authenticated
    if (!ctx.user) {
      return false;
    }

    const membership = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", ctx.user._id))
      .first();

    return !!membership;
  },
});

/**
 * Get organization settings
 */
export const getSettings = orgQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .first();
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new organization with the current user as owner
 * Bootstrap mutation - creates org, member, settings, and staff in one transaction
 */
/**
 * Create a new organization with the current user as owner
 * Bootstrap mutation - creates org, member, settings, and staff in one transaction
 * Rate limited: 3/day per user
 */
export const create = authedMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Rate limit check (per user)
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "createOrganization",
      {
        key: ctx.user._id,
      },
    );
    if (!ok) {
      throw new Error(
        `Organizasyon oluşturma limiti aşıldı. ${Math.ceil(retryAfter! / 1000 / 60 / 60)} saat sonra tekrar deneyin.`,
      );
    }

    const now = Date.now();

    // Check if slug is already taken
    const existingOrg = await ctx.db
      .query("organization")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingOrg) {
      throw new Error("This URL slug is already taken");
    }

    // Create organization
    const organizationId = await ctx.db.insert("organization", {
      name: args.name,
      slug: args.slug,
      logo: args.logo,
      createdAt: now,
      updatedAt: now,
    });

    // Create owner membership
    const memberId = await ctx.db.insert("member", {
      organizationId,
      userId: ctx.user._id,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    // Create default settings
    const defaultBusinessHours = {
      monday: { open: "09:00", close: "18:00", closed: false },
      tuesday: { open: "09:00", close: "18:00", closed: false },
      wednesday: { open: "09:00", close: "18:00", closed: false },
      thursday: { open: "09:00", close: "18:00", closed: false },
      friday: { open: "09:00", close: "18:00", closed: false },
      saturday: { open: "09:00", close: "18:00", closed: false },
      sunday: { open: "09:00", close: "18:00", closed: true },
    };

    const defaultBookingSettings = {
      minAdvanceBookingMinutes: 60,
      maxAdvanceBookingDays: 30,
      slotDurationMinutes: 30,
      bufferBetweenBookingsMinutes: 0,
      allowOnlineBooking: true,
      requireDeposit: false,
      depositAmount: 0,
      cancellationPolicyHours: 24,
    };

    await ctx.db.insert("organizationSettings", {
      organizationId,
      email: args.email,
      phone: args.phone,
      timezone: "Europe/Istanbul",
      currency: "TRY",
      locale: "tr-TR",
      businessHours: defaultBusinessHours,
      bookingSettings: defaultBookingSettings,
      subscriptionStatus: "trialing",
      subscriptionPlan: "free",
      createdAt: now,
      updatedAt: now,
    });

    // Create staff profile for owner
    await ctx.db.insert("staff", {
      userId: ctx.user._id,
      organizationId,
      memberId,
      name: ctx.user.name,
      email: ctx.user.email,
      status: "active",
      serviceIds: [],
      defaultSchedule: {
        monday: { start: "09:00", end: "18:00", available: true },
        tuesday: { start: "09:00", end: "18:00", available: true },
        wednesday: { start: "09:00", end: "18:00", available: true },
        thursday: { start: "09:00", end: "18:00", available: true },
        friday: { start: "09:00", end: "18:00", available: true },
        saturday: { start: "09:00", end: "18:00", available: true },
        sunday: { start: "09:00", end: "18:00", available: false },
      },
      createdAt: now,
      updatedAt: now,
    });

    return { organizationId, memberId, slug: args.slug };
  },
});

/**
 * Update organization
 */
export const update = adminMutation({
  args: {
    name: v.optional(v.string()),
    logo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.logo !== undefined) updates.logo = args.logo;

    await ctx.db.patch(ctx.organizationId, updates);
    return ctx.organizationId;
  },
});

/**
 * Update organization settings
 */
export const updateSettings = adminMutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    address: addressValidator,
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    locale: v.optional(v.string()),
    businessHours: businessHoursValidator,
    bookingSettings: bookingSettingsValidator,
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .first();

    if (!settings) {
      throw new Error("Organization settings not found");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(settings._id, updates);
    return settings._id;
  },
});
