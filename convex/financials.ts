import { ConvexError, v } from "convex/values";
import { DATE_FORMAT_REGEX } from "./lib/constants";
import { ErrorCode, ownerQuery } from "./lib/functions";
import {
  commissionPayoutValidator,
  financialDashboardValidator,
} from "./lib/validators";

// =============================================================================
// Dashboard Stats
// =============================================================================

export const getDashboardStats = ownerQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: financialDashboardValidator,
  handler: async (ctx, args) => {
    if (!DATE_FORMAT_REGEX.test(args.startDate) || !DATE_FORMAT_REGEX.test(args.endDate)) {
      throw new ConvexError({ code: ErrorCode.INVALID_INPUT, message: "Date must be YYYY-MM-DD" });
    }

    // Get completed appointments for revenue
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    const completedAppointments = appointments.filter(
      (a) => a.status === "completed",
    );
    const appointmentRevenue = completedAppointments.reduce(
      (sum, a) => sum + a.total,
      0,
    );

    // Get additional revenue
    const additionalRev = await ctx.db
      .query("additionalRevenue")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();
    const additionalRevTotal = additionalRev.reduce(
      (sum, r) => sum + r.amount,
      0,
    );

    const totalRevenue = appointmentRevenue + additionalRevTotal;

    // Get expenses
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const netProfitLoss = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? Math.round((netProfitLoss / totalRevenue) * 100) : 0;

    // Calculate number of days in range
    const start = new Date(`${args.startDate}T00:00:00Z`);
    const end = new Date(`${args.endDate}T00:00:00Z`);
    const dayCount = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );
    const dailyAvgRevenue = Math.round(totalRevenue / dayCount);

    // Cash flow (cash-only transactions)
    const cashExpenses = expenses
      .filter((e) => e.paymentMethod === "cash")
      .reduce((sum, e) => sum + e.amount, 0);

    let cashRevenue = 0;
    for (const appt of completedAppointments) {
      if (appt.paymentMethod === "cash" || !appt.paymentMethod) {
        cashRevenue += appt.total;
      }
    }
    for (const rev of additionalRev) {
      if (rev.paymentMethod === "cash") {
        cashRevenue += rev.amount;
      }
    }
    const cashFlow = cashRevenue - cashExpenses;

    // Monthly chart data (last 6 months from endDate)
    const monthlyChart: Array<{
      month: string;
      revenue: number;
      expenses: number;
    }> = [];

    // Build monthly buckets from the date range data
    const monthBuckets: Record<string, { revenue: number; expenses: number }> =
      {};

    for (const appt of completedAppointments) {
      const month = appt.date.substring(0, 7); // "YYYY-MM"
      if (!monthBuckets[month])
        monthBuckets[month] = { revenue: 0, expenses: 0 };
      monthBuckets[month].revenue += appt.total;
    }
    for (const rev of additionalRev) {
      const month = rev.date.substring(0, 7);
      if (!monthBuckets[month])
        monthBuckets[month] = { revenue: 0, expenses: 0 };
      monthBuckets[month].revenue += rev.amount;
    }
    for (const exp of expenses) {
      const month = exp.date.substring(0, 7);
      if (!monthBuckets[month])
        monthBuckets[month] = { revenue: 0, expenses: 0 };
      monthBuckets[month].expenses += exp.amount;
    }

    const sortedMonths = Object.keys(monthBuckets).sort();
    for (const month of sortedMonths) {
      monthlyChart.push({
        month,
        revenue: monthBuckets[month].revenue,
        expenses: monthBuckets[month].expenses,
      });
    }

    return {
      totalRevenue,
      totalExpenses,
      netProfitLoss,
      profitMargin,
      dailyAvgRevenue,
      cashFlow,
      monthlyChart,
    };
  },
});

// =============================================================================
// Commission Report
// =============================================================================

export const getCommissionReport = ownerQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(commissionPayoutValidator),
  handler: async (ctx, args) => {
    if (!DATE_FORMAT_REGEX.test(args.startDate) || !DATE_FORMAT_REGEX.test(args.endDate)) {
      throw new ConvexError({ code: ErrorCode.INVALID_INPUT, message: "Date must be YYYY-MM-DD" });
    }

    // Get all commission settings for this org
    const settings = await ctx.db
      .query("commissionSettings")
      .withIndex("by_org", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();

    if (settings.length === 0) return [];

    // Get completed appointments in range
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_org_date", (q) =>
        q
          .eq("organizationId", ctx.organizationId)
          .gte("date", args.startDate)
          .lte("date", args.endDate),
      )
      .collect();

    const completed = appointments.filter((a) => a.status === "completed");

    // Group revenue by staff
    const staffRevenue: Record<string, number> = {};
    for (const appt of completed) {
      if (appt.staffId) {
        const key = appt.staffId as string;
        staffRevenue[key] = (staffRevenue[key] ?? 0) + appt.total;
      }
    }

    // Calculate commissions
    const payouts: Array<{
      staffId: (typeof settings)[0]["staffId"];
      staffName: string;
      totalRevenue: number;
      commissionRate: number;
      commissionAmount: number;
      model: "fixed" | "tiered";
    }> = [];

    for (const setting of settings) {
      const staff = await ctx.db.get(setting.staffId);
      if (!staff) continue;

      const revenue = staffRevenue[setting.staffId] ?? 0;
      let commissionAmount = 0;
      let effectiveRate = 0;

      if (setting.model === "fixed" && setting.fixedRate !== undefined) {
        effectiveRate = setting.fixedRate;
        commissionAmount = Math.round((revenue * setting.fixedRate) / 100);
      } else if (setting.model === "tiered" && setting.tiers) {
        // Apply tiered commission (sort descending by minRevenue to match highest tier first)
        const sortedTiers = [...setting.tiers].sort((a, b) => b.minRevenue - a.minRevenue);
        for (const tier of sortedTiers) {
          if (revenue >= tier.minRevenue) {
            if (!tier.maxRevenue || revenue <= tier.maxRevenue) {
              effectiveRate = tier.rate;
              commissionAmount = Math.round((revenue * tier.rate) / 100);
              break;
            }
          }
        }
      }

      payouts.push({
        staffId: setting.staffId,
        staffName: staff.name,
        totalRevenue: revenue,
        commissionRate: effectiveRate,
        commissionAmount,
        model: setting.model,
      });
    }

    return payouts;
  },
});
