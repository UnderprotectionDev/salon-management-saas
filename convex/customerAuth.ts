import { ConvexError, v } from "convex/values";
import { authedMutation, authedQuery, ErrorCode } from "./lib/functions";
import { isValidTurkishPhone } from "./lib/phone";
import { rateLimiter } from "./lib/rateLimits";
import { customerProfileValidator } from "./lib/validators";

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
      .take(50);

    // Batch-fetch unique orgs to avoid N+1
    const orgIds = [...new Set(customers.map((c) => c.organizationId))];
    const orgDocs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
    const orgMap = new Map(
      orgDocs
        .filter((o): o is NonNullable<typeof o> => o !== null)
        .map((o) => [o._id, o]),
    );

    return customers.map((c) => {
      const org = orgMap.get(c.organizationId);
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
    });
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
    // Rate limit to prevent phone/email enumeration
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "updateCustomerProfile",
      { key: ctx.user._id },
    );
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Too many updates. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000)} seconds.`,
      });
    }

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
    // Rate limit to prevent probing
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "linkCustomerToUser",
      {
        key: ctx.user._id,
      },
    );
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Too many requests. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000)} seconds.`,
      });
    }

    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      return { success: false };
    }

    // Verify the user's email or phone matches the customer record
    // This prevents cross-tenant linking by ensuring only the actual customer can link
    const userEmail = ctx.user.email;
    const emailMatches =
      userEmail &&
      customer.email &&
      userEmail.toLowerCase() === customer.email.toLowerCase();
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
