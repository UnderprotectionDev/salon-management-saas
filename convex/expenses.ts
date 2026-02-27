import { ConvexError, v } from "convex/values";
import { DATE_FORMAT_REGEX } from "./lib/constants";
import {
  ErrorCode,
  internalMutation,
  ownerMutation,
  ownerQuery,
} from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  approvalStatusValidator,
  expenseCategoryValidator,
  expenseDocValidator,
  paymentMethodValidator,
  recurrenceValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

export const list = ownerQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    category: v.optional(v.string()),
  },
  returns: v.array(expenseDocValidator),
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

    let query = ctx.db
      .query("expenses")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      );

    const expenses = await query.collect();

    if (args.category) {
      return expenses.filter((e) => e.category === args.category);
    }

    return expenses;
  },
});

export const get = ownerQuery({
  args: { id: v.id("expenses") },
  returns: v.union(expenseDocValidator, v.null()),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.id);
    if (!expense || expense.organizationId !== ctx.organizationId) return null;
    return expense;
  },
});

// =============================================================================
// Mutations
// =============================================================================

export const create = ownerMutation({
  args: {
    date: v.string(),
    category: expenseCategoryValidator,
    subcategory: v.optional(v.string()),
    amount: v.number(),
    paymentMethod: paymentMethodValidator,
    description: v.optional(v.string()),
    recurrence: recurrenceValidator,
    vendor: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    taxIncluded: v.boolean(),
  },
  returns: v.id("expenses"),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "createExpense", { key: ctx.organizationId, throws: true });

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
        message: "Cannot add expense to a closed day",
      });
    }

    // Find staff for createdBy
    const staff = ctx.staff;
    if (!staff) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff profile not found",
      });
    }

    return ctx.db.insert("expenses", {
      organizationId: ctx.organizationId,
      date: args.date,
      category: args.category,
      subcategory: args.subcategory,
      amount: args.amount,
      paymentMethod: args.paymentMethod,
      description: args.description,
      recurrence: args.recurrence,
      vendor: args.vendor,
      invoiceNumber: args.invoiceNumber,
      receiptStorageId: args.receiptStorageId,
      taxIncluded: args.taxIncluded,
      approvalStatus: "approved",
      createdBy: staff._id,
    });
  },
});

export const update = ownerMutation({
  args: {
    id: v.id("expenses"),
    date: v.optional(v.string()),
    category: v.optional(expenseCategoryValidator),
    subcategory: v.optional(v.string()),
    amount: v.optional(v.number()),
    paymentMethod: v.optional(paymentMethodValidator),
    description: v.optional(v.string()),
    recurrence: v.optional(recurrenceValidator),
    vendor: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    taxIncluded: v.optional(v.boolean()),
    approvalStatus: v.optional(approvalStatusValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.id);
    if (!expense || expense.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Expense not found",
      });
    }

    // Check if day is closed
    const dateToCheck = args.date ?? expense.date;
    const closing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", dateToCheck),
      )
      .first();
    if (closing?.isClosed) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot modify expense on a closed day",
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
  args: { id: v.id("expenses") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.id);
    if (!expense || expense.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Expense not found",
      });
    }

    const closing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", expense.date),
      )
      .first();
    if (closing?.isClosed) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot delete expense on a closed day",
      });
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

export const bulkDelete = ownerMutation({
  args: { ids: v.array(v.id("expenses")) },
  returns: v.number(),
  handler: async (ctx, args) => {
    let deleted = 0;
    for (const id of args.ids) {
      const expense = await ctx.db.get(id);
      if (!expense || expense.organizationId !== ctx.organizationId) continue;

      const closing = await ctx.db
        .query("dailyClosing")
        .withIndex("by_org_date", (q) =>
          q.eq("organizationId", ctx.organizationId).eq("date", expense.date),
        )
        .first();
      if (closing?.isClosed) continue;

      await ctx.db.delete(id);
      deleted++;
    }
    return deleted;
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
const EXPENSE_EDITABLE_FIELDS = ["category", "subcategory", "amount", "paymentMethod", "description", "vendor", "invoiceNumber", "taxIncluded"] as const;

export const updateField = ownerMutation({
  args: {
    id: v.id("expenses"),
    field: v.string(),
    value: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(EXPENSE_EDITABLE_FIELDS as readonly string[]).includes(args.field)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Field '${args.field}' cannot be edited inline`,
      });
    }

    const expense = await ctx.db.get(args.id);
    if (!expense || expense.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Expense not found",
      });
    }

    const closing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", expense.organizationId).eq("date", expense.date),
      )
      .first();
    if (closing?.isClosed) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Cannot edit expenses for a closed day",
      });
    }

    await ctx.db.patch(args.id, { [args.field]: args.value });
    return null;
  },
});

// =============================================================================
// Internal: Recurring expense generation (cron)
// =============================================================================

export const generateRecurring = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const today = new Date();
    const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
    const dayOfWeek = today.getUTCDay(); // 0=Sun
    const dayOfMonth = today.getUTCDate();
    // Get all organizations
    const orgs = await ctx.db.query("organization").collect();
    let generated = 0;

    for (const org of orgs) {
      const recurring = await ctx.db
        .query("expenses")
        .withIndex("by_org_recurrence", (q) => q.eq("organizationId", org._id))
        .collect();

      // Filter to templates (non one_time, no recurringParentId = is a template)
      const templates = recurring.filter(
        (e) => e.recurrence !== "one_time" && !e.recurringParentId,
      );

      for (const template of templates) {
        let shouldGenerate = false;

        if (template.recurrence === "weekly" && dayOfWeek === 1) {
          shouldGenerate = true;
        } else if (template.recurrence === "monthly" && dayOfMonth === 1) {
          shouldGenerate = true;
        } else if (
          template.recurrence === "yearly" &&
          dayOfMonth === 1 &&
          today.getUTCMonth() === 0
        ) {
          shouldGenerate = true;
        }

        if (!shouldGenerate) continue;

        // Check if already generated today
        const existing = await ctx.db
          .query("expenses")
          .withIndex("by_org_date", (q) =>
            q.eq("organizationId", org._id).eq("date", todayStr),
          )
          .collect();

        const alreadyExists = existing.some(
          (e) => e.recurringParentId === template._id,
        );
        if (alreadyExists) continue;

        await ctx.db.insert("expenses", {
          organizationId: org._id,
          date: todayStr,
          category: template.category,
          subcategory: template.subcategory,
          amount: template.amount,
          paymentMethod: template.paymentMethod,
          description: template.description,
          recurrence: "one_time",
          vendor: template.vendor,
          invoiceNumber: undefined,
          receiptStorageId: undefined,
          taxIncluded: template.taxIncluded,
          approvalStatus: "approved",
          createdBy: template.createdBy,
          recurringParentId: template._id,
        });
        generated++;
      }
    }

    return generated;
  },
});
