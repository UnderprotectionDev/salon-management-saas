import { ConvexError, v } from "convex/values";
import { DATE_FORMAT_REGEX } from "./lib/constants";
import { ErrorCode, ownerMutation, ownerQuery } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  dailyClosingDocValidator,
  dailyClosingVirtualValidator,
} from "./lib/validators";

// =============================================================================
// Queries
// =============================================================================

export const getForDate = ownerQuery({
  args: { date: v.string() },
  returns: v.union(dailyClosingDocValidator, dailyClosingVirtualValidator),
  handler: async (ctx, args) => {
    if (!DATE_FORMAT_REGEX.test(args.date)) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Date must be YYYY-MM-DD",
      });
    }

    // Check if a closed record already exists
    const existing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .first();

    if (existing) return existing;

    // Compute live data from appointments + additionalRevenue + expenses
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .collect();

    const completedAppointments = appointments.filter(
      (a) => a.status === "completed",
    );

    const additionalRev = await ctx.db
      .query("additionalRevenue")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .collect();

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .collect();

    const { revenueCash, revenueCard, revenueTransfer, revenueMobile, revenueGiftCard, totalRevenue, totalExpenses } =
      computeDayRevenue(completedAppointments, additionalRev, expenses);

    // Get previous day's closing balance as opening
    const prevDate = getPreviousDate(args.date);
    const prevClosing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", prevDate),
      )
      .first();
    const openingBalance = prevClosing?.calculatedClosingBalance ?? 0;

    const calculatedClosingBalance =
      openingBalance + totalRevenue - totalExpenses;

    // Return a virtual record (not persisted until closed)
    return {
      _id: "" as any, // Placeholder for virtual record
      _creationTime: 0,
      organizationId: ctx.organizationId,
      date: args.date,
      openingBalance,
      revenueCash,
      revenueCard,
      revenueTransfer,
      revenueMobile,
      revenueGiftCard,
      totalRevenue,
      totalExpenses,
      calculatedClosingBalance,
      isClosed: false,
    };
  },
});

export const list = ownerQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(dailyClosingDocValidator),
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

    return ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();
  },
});

// =============================================================================
// Mutations
// =============================================================================

export const updateCashCount = ownerMutation({
  args: {
    date: v.string(),
    actualCashCount: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!DATE_FORMAT_REGEX.test(args.date)) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Date must be YYYY-MM-DD",
      });
    }

    const existing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .first();

    if (existing) {
      if (existing.isClosed) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Day is already closed",
        });
      }
      await ctx.db.patch(existing._id, {
        actualCashCount: args.actualCashCount,
        variance: args.actualCashCount - existing.calculatedClosingBalance,
      });
    }
    // If no record exists yet, it will be created when closeDay is called
    return null;
  },
});

export const closeDay = ownerMutation({
  args: {
    date: v.string(),
    actualCashCount: v.optional(v.number()),
  },
  returns: v.id("dailyClosing"),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "closeDay", { key: ctx.organizationId, throws: true });

    if (!DATE_FORMAT_REGEX.test(args.date)) {
      throw new ConvexError({
        code: ErrorCode.INVALID_INPUT,
        message: "Date must be YYYY-MM-DD",
      });
    }

    const staff = ctx.staff;
    if (!staff) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff profile not found",
      });
    }

    // Check if already closed
    const existing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .first();

    if (existing?.isClosed) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Day is already closed",
      });
    }

    // Compute all revenue and expenses for the day
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .collect();

    const completedAppointments = appointments.filter(
      (a) => a.status === "completed",
    );

    const additionalRev = await ctx.db
      .query("additionalRevenue")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .collect();

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .collect();

    const { revenueCash, revenueCard, revenueTransfer, revenueMobile, revenueGiftCard, totalRevenue, totalExpenses } =
      computeDayRevenue(completedAppointments, additionalRev, expenses);

    const prevDate = getPreviousDate(args.date);
    const prevClosing = await ctx.db
      .query("dailyClosing")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", prevDate),
      )
      .first();
    const openingBalance = prevClosing?.calculatedClosingBalance ?? 0;
    const calculatedClosingBalance =
      openingBalance + totalRevenue - totalExpenses;

    const variance =
      args.actualCashCount !== undefined
        ? args.actualCashCount - calculatedClosingBalance
        : undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        openingBalance,
        revenueCash,
        revenueCard,
        revenueTransfer,
        revenueMobile,
        revenueGiftCard,
        totalRevenue,
        totalExpenses,
        calculatedClosingBalance,
        actualCashCount: args.actualCashCount,
        variance,
        isClosed: true,
        closedAt: Date.now(),
        closedBy: staff._id,
      });
      return existing._id;
    }

    return ctx.db.insert("dailyClosing", {
      organizationId: ctx.organizationId,
      date: args.date,
      openingBalance,
      revenueCash,
      revenueCard,
      revenueTransfer,
      revenueMobile,
      revenueGiftCard,
      totalRevenue,
      totalExpenses,
      calculatedClosingBalance,
      actualCashCount: args.actualCashCount,
      variance,
      isClosed: true,
      closedAt: Date.now(),
      closedBy: staff._id,
    });
  },
});

// =============================================================================
// Helpers
// =============================================================================

function computeDayRevenue(
  completedAppointments: Array<{ paymentMethod?: string; total: number }>,
  additionalRev: Array<{ paymentMethod: string; amount: number }>,
  expenses: Array<{ amount: number }>,
) {
  let revenueCash = 0;
  let revenueCard = 0;
  let revenueTransfer = 0;
  let revenueMobile = 0;
  let revenueGiftCard = 0;

  for (const appt of completedAppointments) {
    const method = appt.paymentMethod ?? "cash";
    const amount = appt.total;
    switch (method) {
      case "cash":
        revenueCash += amount;
        break;
      case "credit":
      case "debit":
        revenueCard += amount;
        break;
      case "transfer":
        revenueTransfer += amount;
        break;
      case "mobile":
        revenueMobile += amount;
        break;
      case "gift_card":
        revenueGiftCard += amount;
        break;
      default:
        revenueCash += amount;
    }
  }

  for (const rev of additionalRev) {
    switch (rev.paymentMethod) {
      case "cash":
        revenueCash += rev.amount;
        break;
      case "credit":
      case "debit":
        revenueCard += rev.amount;
        break;
      case "transfer":
        revenueTransfer += rev.amount;
        break;
      case "mobile":
        revenueMobile += rev.amount;
        break;
      case "gift_card":
        revenueGiftCard += rev.amount;
        break;
    }
  }

  const totalRevenue =
    revenueCash + revenueCard + revenueTransfer + revenueMobile + revenueGiftCard;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { revenueCash, revenueCard, revenueTransfer, revenueMobile, revenueGiftCard, totalRevenue, totalExpenses };
}

function getPreviousDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
