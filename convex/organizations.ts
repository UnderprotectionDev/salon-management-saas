import { ConvexError, v } from "convex/values";
import {
  adminMutation,
  authedMutation,
  authedQuery,
  ErrorCode,
  orgQuery,
  publicQuery,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  addressValidator,
  bookingSettingsValidator,
  businessHoursValidator,
  organizationDocValidator,
  organizationSettingsDocValidator,
  organizationWithRoleValidator,
} from "./lib/validators";

export const getBySlug = publicQuery({
  args: { slug: v.string() },
  returns: v.union(organizationDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organization")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const listPublic = publicQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("organization"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      logo: v.optional(v.string()),
      description: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organization").take(200);

    return orgs.map((org) => ({
      _id: org._id,
      _creationTime: org._creationTime,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      description: org.description,
    }));
  },
});

export const listForUser = authedQuery({
  args: {},
  returns: v.array(organizationWithRoleValidator),
  handler: async (ctx) => {
    const memberships = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", ctx.user._id))
      .collect();

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
 * Get organization settings
 */
export const getSettings = orgQuery({
  args: {},
  returns: v.union(organizationSettingsDocValidator, v.null()),
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
  returns: v.object({
    organizationId: v.id("organization"),
    memberId: v.id("member"),
    slug: v.string(),
  }),
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
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Organization creation limit exceeded. Try again in ${Math.ceil(retryAfter! / 1000 / 60 / 60)} hours.`,
      });
    }

    const now = Date.now();

    // Check if slug is already taken
    const existingOrg = await ctx.db
      .query("organization")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existingOrg) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "This URL slug is already taken",
      });
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
      subscriptionStatus: "pending_payment",
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
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
  },
  returns: v.id("organization"),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
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
  returns: v.id("organizationSettings"),
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .first();

    if (!settings) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Organization settings not found",
      });
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.website !== undefined) updates.website = args.website;
    if (args.address !== undefined) updates.address = args.address;
    if (args.timezone !== undefined) updates.timezone = args.timezone;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.locale !== undefined) updates.locale = args.locale;
    if (args.businessHours !== undefined)
      updates.businessHours = args.businessHours;
    if (args.bookingSettings !== undefined)
      updates.bookingSettings = args.bookingSettings;

    await ctx.db.patch(settings._id, updates);

    return settings._id;
  },
});
