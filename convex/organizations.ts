import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import {
  DEFAULT_BOOKING_SETTINGS,
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_STAFF_SCHEDULE,
} from "./lib/defaults";
import {
  authedMutation,
  authedQuery,
  ErrorCode,
  orgQuery,
  ownerMutation,
  publicQuery,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  validateEmail,
  validatePhone,
  validateSlug,
  validateString,
  validateUrl,
} from "./lib/validation";

const RESERVED_SLUGS = new Set([
  "dashboard",
  "settings",
  "sign-in",
  "sign-up",
  "onboarding",
  "api",
  "admin",
  "auth",
  "billing",
  "book",
  "calendar",
  "customers",
  "reports",
  "services",
  "staff",
  "appointments",
  "invite",
  "accept-invite",
  "404",
  "500",
  "error",
]);

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

    // Filter out suspended organizations
    const results: {
      _id: (typeof orgs)[number]["_id"];
      _creationTime: number;
      name: string;
      slug: string;
      logo?: string;
      description?: string;
    }[] = [];

    for (const org of orgs) {
      const settings = await ctx.db
        .query("organizationSettings")
        .withIndex("organizationId", (q) => q.eq("organizationId", org._id))
        .first();

      if (settings?.subscriptionStatus === "suspended") continue;

      results.push({
        _id: org._id,
        _creationTime: org._creationTime,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        description: org.description,
      });
    }

    return results;
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

export const getSettings = orgQuery({
  args: {},
  returns: organizationSettingsDocValidator,
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .first();

    if (!settings) {
      throw new ConvexError({
        code: ErrorCode.INTERNAL_ERROR,
        message: "Organization settings not found - data integrity issue",
      });
    }

    return settings;
  },
});

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
        message: `Organization creation limit exceeded. Try again in ${Math.ceil((retryAfter ?? 0) / 1000 / 60 / 60)} hours.`,
      });
    }

    const now = Date.now();

    const trimmedName = validateString(args.name, "Salon name", {
      min: 2,
      max: 100,
    });
    const trimmedSlug = validateSlug(args.slug);

    if (RESERVED_SLUGS.has(trimmedSlug)) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "This URL slug is reserved and cannot be used",
      });
    }

    if (args.phone) validatePhone(args.phone);
    if (args.email) validateEmail(args.email);

    const existingMembership = await ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", ctx.user._id))
      .first();
    if (existingMembership) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message:
          "You already belong to a salon. A user can only be part of one salon.",
      });
    }

    // Check if slug is already taken
    const existingOrg = await ctx.db
      .query("organization")
      .withIndex("slug", (q) => q.eq("slug", trimmedSlug))
      .first();

    if (existingOrg) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "This URL slug is already taken",
      });
    }

    // Create organization
    const organizationId = await ctx.db.insert("organization", {
      name: trimmedName,
      slug: trimmedSlug,
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
    await ctx.db.insert("organizationSettings", {
      organizationId,
      email: args.email,
      phone: args.phone,
      timezone: "Europe/Istanbul",
      currency: "TRY",
      locale: "tr-TR",
      businessHours: { ...DEFAULT_BUSINESS_HOURS },
      bookingSettings: { ...DEFAULT_BOOKING_SETTINGS },
      subscriptionStatus: "pending_payment",
      createdAt: now,
      updatedAt: now,
    });

    // Create staff profile for owner
    await ctx.db.insert("staff", {
      userId: ctx.user._id,
      organizationId,
      memberId,
      name: ctx.user.name || "Unknown",
      email: ctx.user.email,
      status: "active",
      serviceIds: [],
      defaultSchedule: { ...DEFAULT_STAFF_SCHEDULE },
      createdAt: now,
      updatedAt: now,
    });

    return { organizationId, memberId, slug: trimmedSlug };
  },
});

export const update = ownerMutation({
  args: {
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
  },
  returns: v.id("organization"),
  handler: async (ctx, args) => {
    if (
      args.name === undefined &&
      args.description === undefined &&
      args.logo === undefined
    ) {
      return ctx.organizationId;
    }

    const updates: {
      name?: string;
      description?: string;
      logo?: string;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      updates.name = validateString(args.name, "Salon name", {
        min: 2,
        max: 100,
      });
    }
    if (args.description !== undefined) {
      updates.description = validateString(args.description, "Description", {
        max: 500,
      });
    }
    if (args.logo !== undefined) {
      updates.logo = validateUrl(args.logo, "Logo");
    }

    await ctx.db.patch(ctx.organizationId, updates);

    return ctx.organizationId;
  },
});

export const updateSettings = ownerMutation({
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

    if (args.phone !== undefined && args.phone !== "")
      validatePhone(args.phone);
    if (args.email !== undefined && args.email !== "")
      validateEmail(args.email);

    const updates: Partial<Doc<"organizationSettings">> & {
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };
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
