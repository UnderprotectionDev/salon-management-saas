import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { formatDateStr, parseDateUTC } from "./lib/dateTime";
import { ErrorCode, orgQuery } from "./lib/functions";
import { customerReportValidator } from "./lib/validators";
import {
  getAppointmentsForDateRange,
  validateDateRange,
} from "./reportHelpers";

// =============================================================================
// Customer Report
// =============================================================================

export const getCustomerReport = orgQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: customerReportValidator,
  handler: async (ctx, args) => {
    const isStaffOnly = ctx.member.role === "staff";
    if (isStaffOnly && !ctx.staff) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Staff record not found for current user",
      });
    }
    const staffFilter = isStaffOnly ? ctx.staff!._id : undefined;

    validateDateRange(args.startDate, args.endDate);

    // Get all org customers
    let customers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();

    // Get completed appointments in range (single query)
    let appointments = await getAppointmentsForDateRange(
      ctx.db,
      ctx.organizationId,
      args.startDate,
      args.endDate,
    );

    // Staff: filter appointments to their own, and customers to those they've served
    if (staffFilter) {
      appointments = appointments.filter((a) => a.staffId === staffFilter);
      const staffCustomerIds = new Set(
        appointments.map((a) => a.customerId as string),
      );
      customers = customers.filter((c) =>
        staffCustomerIds.has(c._id as string),
      );
    }

    // Customers created in date range (use UTC to avoid timezone ambiguity)
    const startEpoch = parseDateUTC(args.startDate).getTime();
    const endEpoch =
      parseDateUTC(args.endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
    const newInPeriod = customers.filter(
      (c) => c._creationTime >= startEpoch && c._creationTime <= endEpoch,
    ).length;

    const completedAppts = appointments.filter((a) => a.status === "completed");

    // Build customer lookup map for O(1) access
    const customerMap = new Map<string, { name: string; phone: string }>();
    for (const c of customers) {
      customerMap.set(c._id as string, { name: c.name, phone: c.phone });
    }

    // Build customer stats map
    const customerStats = new Map<
      string,
      {
        name: string;
        phone: string;
        appointments: number;
        revenue: number;
        lastDate: string | null;
      }
    >();

    for (const appt of completedAppts) {
      const custId = appt.customerId as string;
      if (!customerStats.has(custId)) {
        const customer = customerMap.get(custId);
        customerStats.set(custId, {
          name: customer?.name ?? "Unknown",
          phone: customer?.phone ?? "",
          appointments: 0,
          revenue: 0,
          lastDate: null,
        });
      }
      const stats = customerStats.get(custId)!;
      stats.appointments++;
      stats.revenue += appt.total;
      if (!stats.lastDate || appt.date > stats.lastDate) {
        stats.lastDate = appt.date;
      }
    }

    // Retention: customers with 2+ completed appointments / total unique customers
    const uniqueCustomers = customerStats.size;
    const totalActive = uniqueCustomers;
    const returningCount = Array.from(customerStats.values()).filter(
      (s) => s.appointments >= 2,
    ).length;
    const retentionRate =
      uniqueCustomers > 0
        ? Math.round((returningCount / uniqueCustomers) * 100)
        : 0;

    const totalAppts = Array.from(customerStats.values()).reduce(
      (sum, s) => sum + s.appointments,
      0,
    );
    const avgAppointmentsPerCustomer =
      uniqueCustomers > 0
        ? Math.round((totalAppts / uniqueCustomers) * 10) / 10
        : 0;

    // Top 10 customers by revenue
    const topCustomers = Array.from(customerStats.entries())
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([id, stats]) => ({
        customerId: id as Id<"customers">,
        name: stats.name,
        phone: stats.phone,
        appointments: stats.appointments,
        revenue: stats.revenue,
        lastVisitDate: stats.lastDate,
      }));

    // Monthly new vs returning breakdown (unique customers per month)
    const existingCustomerIds = new Set(
      customers
        .filter((c) => c._creationTime < startEpoch)
        .map((c) => c._id as string),
    );

    const monthlyUniqueMap = new Map<
      string,
      { newSet: Set<string>; returningSet: Set<string> }
    >();

    for (const appt of completedAppts) {
      const month = appt.date.substring(0, 7); // "YYYY-MM"
      if (!monthlyUniqueMap.has(month)) {
        monthlyUniqueMap.set(month, {
          newSet: new Set(),
          returningSet: new Set(),
        });
      }
      const entry = monthlyUniqueMap.get(month)!;
      const custId = appt.customerId as string;
      if (existingCustomerIds.has(custId)) {
        entry.returningSet.add(custId);
      } else {
        entry.newSet.add(custId);
      }
    }

    const monthly = Array.from(monthlyUniqueMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, entry]) => ({
        month,
        newCustomers: entry.newSet.size,
        returningCustomers: entry.returningSet.size,
      }));

    // Previous period comparison
    const periodLength =
      (parseDateUTC(args.endDate).getTime() -
        parseDateUTC(args.startDate).getTime()) /
        (24 * 60 * 60 * 1000) +
      1;
    const prevStart = parseDateUTC(args.startDate);
    prevStart.setUTCDate(prevStart.getUTCDate() - periodLength);
    const prevEnd = parseDateUTC(args.startDate);
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
    const prevStartStr = formatDateStr(prevStart);
    const prevEndStr = formatDateStr(prevEnd);
    const prevStartEpoch = prevStart.getTime();
    const prevEndEpoch = prevEnd.getTime() + 24 * 60 * 60 * 1000 - 1;

    const prevNewInPeriod = customers.filter(
      (c) =>
        c._creationTime >= prevStartEpoch && c._creationTime <= prevEndEpoch,
    ).length;

    let prevAppointments = await getAppointmentsForDateRange(
      ctx.db,
      ctx.organizationId,
      prevStartStr,
      prevEndStr,
    );
    if (staffFilter) {
      prevAppointments = prevAppointments.filter(
        (a) => a.staffId === staffFilter,
      );
    }
    const prevCompleted = prevAppointments.filter(
      (a) => a.status === "completed",
    );
    const prevUniqueCustomerIds = new Set(
      prevCompleted.map((a) => a.customerId as string),
    );
    const prevUniqueCustomers = prevUniqueCustomerIds.size;
    const prevTotalActive = prevUniqueCustomerIds.size;

    // Build customer stats up to the end of previous period
    const allHistoricalAppts = await getAppointmentsForDateRange(
      ctx.db,
      ctx.organizationId,
      "2020-01-01",
      prevEndStr,
    );
    const historicalCompletedAppts = allHistoricalAppts.filter(
      (a) => a.status === "completed",
    );
    const prevPeriodCustomerStats = new Map<string, number>();
    for (const appt of historicalCompletedAppts) {
      const custId = appt.customerId as string;
      prevPeriodCustomerStats.set(
        custId,
        (prevPeriodCustomerStats.get(custId) || 0) + 1,
      );
    }

    const prevReturningCount = new Set(
      prevCompleted
        .filter((a) => {
          const custId = a.customerId as string;
          const historicalCount = prevPeriodCustomerStats.get(custId) || 0;
          return historicalCount >= 2;
        })
        .map((a) => a.customerId as string),
    ).size;
    const prevRetentionRate =
      prevUniqueCustomers > 0
        ? Math.round((prevReturningCount / prevUniqueCustomers) * 100)
        : 0;

    const totalActiveChange =
      prevTotalActive > 0
        ? Math.round(((totalActive - prevTotalActive) / prevTotalActive) * 100)
        : 0;
    const newInPeriodChange =
      prevNewInPeriod > 0
        ? Math.round(((newInPeriod - prevNewInPeriod) / prevNewInPeriod) * 100)
        : 0;
    const retentionRateChange =
      prevRetentionRate > 0
        ? Math.round(
            ((retentionRate - prevRetentionRate) / prevRetentionRate) * 100,
          )
        : 0;

    return {
      totalActive,
      totalActiveChange,
      newInPeriod,
      newInPeriodChange,
      retentionRate,
      retentionRateChange,
      avgAppointmentsPerCustomer,
      monthly,
      topCustomers,
    };
  },
});
