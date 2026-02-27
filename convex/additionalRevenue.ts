import { ConvexError, v } from "convex/values";
import { DATE_FORMAT_REGEX } from "./lib/constants";
import {
  ErrorCode,
  ownerMutation,
  ownerQuery,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  additionalRevenueDocValidator,
  additionalRevenueTypeValidator,
  paymentMethodValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

export const list = ownerQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    type: v.optional(additionalRevenueTypeValidator),
  },
  returns: v.array(additionalRevenueDocValidator),
  handler: async (ctx, args) => {
    if (
      !DATE_FORMAT_REGEX.test(args.startDate) ||
      !DATE_FORMAT_REGEX.test(args.endDate)
    ) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Date must be YYYY-MM-DD",
      });
    }

    const items = await ctx.db
      .query("additionalRevenue")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    if (args.type) {
      return items.filter((i) => i.type === args.type);
    }
    return items;
  },
});

// =============================================================================
// Mutations
// =============================================================================

export const create = ownerMutation({
  args: {
    date: v.string(),
    type: additionalRevenueTypeValidator,
    amount: v.number(),
    paymentMethod: paymentMethodValidator,
    staffId: v.optional(v.id("staff")),
    customerId: v.optional(v.id("customers")),
    description: v.optional(v.string()),
  },
  returns: v.id("additionalRevenue"),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "createAdditionalRevenue", {
      key: ctx.organizationId,
      throws: true,
    });

    if (!DATE_FORMAT_REGEX.test(args.date)) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Date must be YYYY-MM-DD",
      });
    }
    if (args.amount < 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Amount cannot be negative",
      });
    }

    // Check if day is closed
    const closing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .first();
    if (closing?.isClosed) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot add revenue to a closed day",
      });
    }

    return ctx.db.insert("additionalRevenue", {
      organizationId: ctx.organizationId,
      ...args,
    });
  },
});

export const update = ownerMutation({
  args: {
    id: v.id("additionalRevenue"),
    date: v.optional(v.string()),
    type: v.optional(additionalRevenueTypeValidator),
    amount: v.optional(v.number()),
    paymentMethod: v.optional(paymentMethodValidator),
    staffId: v.optional(v.id("staff")),
    customerId: v.optional(v.id("customers")),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item || item.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Revenue entry not found",
      });
    }

    const dateToCheck = args.date ?? item.date;
    const closing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", dateToCheck),
      )
      .first();
    if (closing?.isClosed) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot modify revenue on a closed day",
      });
    }

    if (args.amount !== undefined && args.amount < 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Amount cannot be negative",
      });
    }

    const { id, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined),
    );
    await ctx.db.patch(args.id, filtered);
    return null;
  },
});

export const remove = ownerMutation({
  args: { id: v.id("additionalRevenue") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item || item.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Revenue entry not found",
      });
    }

    const closing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", item.date),
      )
      .first();
    if (closing?.isClosed) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot delete revenue on a closed day",
      });
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

// =============================================================================
// Inline Field Update (client debounces, server writes directly)
// =============================================================================

/**
 * Frontend debounces cell edits client-side (800ms) then calls this once.
 * Validates closed-day and writes the field directly.
 * Used with withOptimisticUpdate on the client for instant UI feedback.
 */
const REVENUE_EDITABLE_FIELDS = ["type", "amount", "paymentMethod", "staffId", "customerId", "description"] as const;

export const updateField = ownerMutation({
  args: {
    id: v.id("additionalRevenue"),
    field: v.string(),
    value: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(REVENUE_EDITABLE_FIELDS as readonly string[]).includes(args.field)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Field '${args.field}' cannot be edited inline`,
      });
    }

    const item = await ctx.db.get(args.id);
    if (!item || item.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Revenue entry not found",
      });
    }

    const closing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", item.organizationId).eq("date", item.date),
      )
      .first();
    if (closing?.isClosed) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot edit revenue for a closed day",
      });
    }

    await ctx.db.patch(args.id, { [args.field]: args.value });
    return null;
  },
});
