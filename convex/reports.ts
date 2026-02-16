import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import { ErrorCode, orgQuery } from "./lib/functions";
import { getDatesBetween, resolveSchedule } from "./lib/scheduleResolver";
import {
  customerReportValidator,
  revenueReportValidator,
  staffPerformanceReportValidator,
} from "./lib/validators";

// =============================================================================
// Helpers
// =============================================================================

function timeStringToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Parse "YYYY-MM-DD" manually to avoid timezone ambiguity with new Date(). */
function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Format a UTC Date to "YYYY-MM-DD". */
function formatDateStr(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function getAppointmentsForDateRange(
  db: DatabaseReader,
  organizationId: Id<"organization">,
  startDate: string,
  endDate: string,
) {
  return db
    .query("appointments")
    .withIndex("by_org_date", (q) =>
      q
        .eq("organizationId", organizationId)
        .gte("date", startDate)
        .lte("date", endDate),
    )
    .collect();
}

function validateDateRange(startDate: string, endDate: string) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: "Date must be in YYYY-MM-DD format",
    });
  }
  if (startDate > endDate) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: "Start date must be before end date",
    });
  }
  const dates = getDatesBetween(startDate, endDate);
  if (dates.length > 366) {
    throw new ConvexError({
      code: ErrorCode.INVALID_INPUT,
      message: "Date range cannot exceed 1 year",
    });
  }
  return dates;
}

// =============================================================================
// Revenue Report
// =============================================================================

export const getRevenueReport = orgQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: revenueReportValidator,
  handler: async (ctx, args) => {
    const isStaffOnly = ctx.member.role === "staff";
    if (isStaffOnly && !ctx.staff) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Staff record not found for current user",
      });
    }
    const staffFilter = isStaffOnly ? ctx.staff!._id : undefined;

    const dates = validateDateRange(args.startDate, args.endDate);
    let appointments = await getAppointmentsForDateRange(
      ctx.db,
      ctx.organizationId,
      args.startDate,
      args.endDate,
    );

    // Staff: filter to only their appointments
    if (staffFilter) {
      appointments = appointments.filter((a) => a.staffId === staffFilter);
    }

    // Daily aggregation
    const dailyMap: Record<
      string,
      { revenue: number; appointments: number; completed: number }
    > = {};
    for (const d of dates) {
      dailyMap[d] = { revenue: 0, appointments: 0, completed: 0 };
    }

    // Service & Staff aggregation
    const serviceMap: Map<
      Id<"services">,
      { serviceName: string; appointments: number; revenue: number }
    > = new Map();
    const staffMap: Map<
      Id<"staff">,
      { staffName: string; appointments: number; revenue: number }
    > = new Map();

    // Hourly distribution (9:00-21:00, startTime in minutes from midnight)
    const hourlyMap: Map<number, number> = new Map();

    let totalRevenue = 0;
    let expectedRevenue = 0;
    let totalAppointments = 0;
    let completedAppointments = 0;

    // Status breakdown counters
    const statusBreakdown = {
      pending: 0,
      confirmed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
    };

    // Fetch appointment services only for completed appointments (index-scoped)
    const completedApptIds = new Set(
      appointments.filter((a) => a.status === "completed").map((a) => a._id),
    );

    // Build lookup: appointmentId -> services[]
    const apptServiceMap = new Map<
      Id<"appointments">,
      Array<{ serviceId: Id<"services">; serviceName: string; price: number }>
    >();
    const serviceQueries = Array.from(completedApptIds).map(async (apptId) => {
      const services = await ctx.db
        .query("appointmentServices")
        .withIndex("by_appointment", (q) => q.eq("appointmentId", apptId))
        .collect();
      apptServiceMap.set(
        apptId,
        services.map((s) => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          price: s.price,
        })),
      );
    });
    await Promise.all(serviceQueries);

    // Pre-fetch all org staff for name lookup
    const allStaff = await ctx.db
      .query("staff")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();
    const staffNameMap = new Map<string, string>();
    for (const s of allStaff) {
      staffNameMap.set(s._id as string, s.name);
    }

    for (const appt of appointments) {
      totalAppointments++;

      // Track hourly distribution (hour from startTime)
      const hour = Math.floor(appt.startTime / 60);
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);

      // Count status breakdown
      switch (appt.status) {
        case "pending":
          statusBreakdown.pending++;
          break;
        case "confirmed":
          statusBreakdown.confirmed++;
          break;
        case "checked_in":
        case "in_progress":
          statusBreakdown.inProgress++;
          break;
        case "completed":
          statusBreakdown.completed++;
          break;
        case "cancelled":
          statusBreakdown.cancelled++;
          break;
        case "no_show":
          statusBreakdown.noShow++;
          break;
      }

      if (appt.status === "cancelled") continue;

      if (dailyMap[appt.date]) {
        dailyMap[appt.date].appointments++;
      }

      // Expected revenue: pending/confirmed/checked_in/in_progress
      if (
        appt.status === "pending" ||
        appt.status === "confirmed" ||
        appt.status === "checked_in" ||
        appt.status === "in_progress"
      ) {
        expectedRevenue += appt.total;
      }

      if (appt.status === "completed") {
        completedAppointments++;
        totalRevenue += appt.total;
        if (dailyMap[appt.date]) {
          dailyMap[appt.date].revenue += appt.total;
          dailyMap[appt.date].completed++;
        }

        // Staff breakdown (skip if staff was deleted)
        if (!appt.staffId) {
          // Still counted in totals, but not in per-staff breakdown
        } else {
          if (!staffMap.has(appt.staffId)) {
            staffMap.set(appt.staffId, {
              staffName: staffNameMap.get(appt.staffId as string) ?? "Unknown",
              appointments: 0,
              revenue: 0,
            });
          }
          const staffEntry = staffMap.get(appt.staffId)!;
          staffEntry.appointments++;
          staffEntry.revenue += appt.total;
        }

        // Service breakdown
        const services = apptServiceMap.get(appt._id) ?? [];
        for (const svc of services) {
          if (!serviceMap.has(svc.serviceId)) {
            serviceMap.set(svc.serviceId, {
              serviceName: svc.serviceName,
              appointments: 0,
              revenue: 0,
            });
          }
          const svcEntry = serviceMap.get(svc.serviceId)!;
          svcEntry.appointments++;
          svcEntry.revenue += svc.price;
        }
      }
    }

    // Previous period comparison
    const periodLength = dates.length;
    const prevStart = parseDateUTC(args.startDate);
    prevStart.setUTCDate(prevStart.getUTCDate() - periodLength);
    const prevEnd = parseDateUTC(args.startDate);
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
    const prevStartStr = formatDateStr(prevStart);
    const prevEndStr = formatDateStr(prevEnd);

    let prevAppts = await getAppointmentsForDateRange(
      ctx.db,
      ctx.organizationId,
      prevStartStr,
      prevEndStr,
    );
    if (staffFilter) {
      prevAppts = prevAppts.filter((a) => a.staffId === staffFilter);
    }
    let prevRevenue = 0;
    for (const appt of prevAppts) {
      if (appt.status === "completed") {
        prevRevenue += appt.total;
      }
    }

    const revenueChange =
      prevRevenue > 0
        ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100)
        : 0;

    const avgPerAppointment =
      completedAppointments > 0
        ? Math.round(totalRevenue / completedAppointments)
        : 0;

    const nonCancelled = totalAppointments - statusBreakdown.cancelled;
    const completionRate =
      nonCancelled > 0
        ? Math.round((completedAppointments / nonCancelled) * 100)
        : 0;
    const cancellationRate =
      totalAppointments > 0
        ? Math.round((statusBreakdown.cancelled / totalAppointments) * 100)
        : 0;

    return {
      totalRevenue,
      expectedRevenue,
      totalAppointments,
      completedAppointments,
      avgPerAppointment,
      revenueChange,
      completionRate,
      cancellationRate,
      statusBreakdown,
      daily: dates.map((d) => ({
        date: d,
        revenue: dailyMap[d].revenue,
        appointments: dailyMap[d].appointments,
        completed: dailyMap[d].completed,
      })),
      byService: Array.from(serviceMap.entries())
        .map(([id, data]) => ({
          serviceId: id,
          ...data,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      byStaff: Array.from(staffMap.entries())
        .map(([id, data]) => ({
          staffId: id,
          ...data,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      hourlyDistribution: Array.from(hourlyMap.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour),
    };
  },
});

// =============================================================================
// Staff Performance Report
// =============================================================================

export const getStaffPerformanceReport = orgQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: staffPerformanceReportValidator,
  handler: async (ctx, args) => {
    const isStaffOnly = ctx.member.role === "staff";
    if (isStaffOnly && !ctx.staff) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "Staff record not found for current user",
      });
    }
    const staffFilter = isStaffOnly ? ctx.staff!._id : undefined;

    const dates = validateDateRange(args.startDate, args.endDate);

    // Get active staff (staff only sees themselves)
    let staffList = await ctx.db
      .query("staff")
      .withIndex("organizationId_status", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("status", "active"),
      )
      .collect();

    if (staffFilter) {
      staffList = staffList.filter((s) => s._id === staffFilter);
    }

    // Batch-fetch all org appointments for the date range (single query)
    const allAppointments = await getAppointmentsForDateRange(
      ctx.db,
      ctx.organizationId,
      args.startDate,
      args.endDate,
    );

    // Group appointments by staffId
    const apptsByStaff = new Map<string, typeof allAppointments>();
    for (const appt of allAppointments) {
      const key = appt.staffId as string;
      if (!apptsByStaff.has(key)) {
        apptsByStaff.set(key, []);
      }
      apptsByStaff.get(key)!.push(appt);
    }

    const result = [];

    for (const staff of staffList) {
      let totalAppointments = 0;
      let completed = 0;
      let noShows = 0;
      let cancelled = 0;
      let revenue = 0;
      let appointmentMinutes = 0;
      let scheduledMinutes = 0;

      // Get overrides and overtime for the date range (bounded by index)
      const rangeOverrides = await ctx.db
        .query("scheduleOverrides")
        .withIndex("by_staff_date", (q) =>
          q
            .eq("staffId", staff._id)
            .gte("date", args.startDate)
            .lte("date", args.endDate),
        )
        .collect();

      const rangeOvertime = await ctx.db
        .query("staffOvertime")
        .withIndex("by_staff_date", (q) =>
          q
            .eq("staffId", staff._id)
            .gte("date", args.startDate)
            .lte("date", args.endDate),
        )
        .collect();

      // Calculate scheduled minutes per date
      for (const dateStr of dates) {
        const dayOverride =
          rangeOverrides.find((o) => o.date === dateStr) ?? null;
        const dayOvertime = rangeOvertime.filter((o) => o.date === dateStr);

        const resolved = resolveSchedule({
          date: dateStr,
          defaultSchedule: staff.defaultSchedule,
          override: dayOverride,
          overtimeEntries: dayOvertime,
        });

        if (
          resolved.available &&
          resolved.effectiveStart &&
          resolved.effectiveEnd
        ) {
          scheduledMinutes +=
            timeStringToMinutes(resolved.effectiveEnd) -
            timeStringToMinutes(resolved.effectiveStart);
        }
        for (const ot of resolved.overtimeWindows) {
          scheduledMinutes +=
            timeStringToMinutes(ot.end) - timeStringToMinutes(ot.start);
        }
      }

      // Process staff appointments from pre-fetched data
      const staffAppts = apptsByStaff.get(staff._id as string) ?? [];
      for (const appt of staffAppts) {
        if (appt.status === "cancelled") {
          cancelled++;
          continue;
        }
        totalAppointments++;
        if (appt.status === "completed") {
          completed++;
          revenue += appt.total;
          appointmentMinutes += appt.endTime - appt.startTime;
        } else if (appt.status === "no_show") {
          noShows++;
        }
      }

      const utilization =
        scheduledMinutes > 0
          ? Math.round((appointmentMinutes / scheduledMinutes) * 100)
          : 0;

      result.push({
        staffId: staff._id,
        staffName: staff.name,
        totalAppointments,
        completed,
        noShows,
        cancelled,
        revenue,
        scheduledMinutes,
        appointmentMinutes,
        utilization,
      });
    }

    return {
      staff: result.sort((a, b) => b.revenue - a.revenue),
    };
  },
});

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

    // totalActive will be computed after customerStats is built (unique customers in current period)

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
    const totalActive = uniqueCustomers; // Active = unique customers with completed appointments in period
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

    // Previous period comparison (same logic as revenue report)
    const periodLength =
      (parseDateUTC(args.endDate).getTime() -
        parseDateUTC(args.startDate).getTime()) /
      (24 * 60 * 60 * 1000);
    const prevStart = parseDateUTC(args.startDate);
    prevStart.setUTCDate(prevStart.getUTCDate() - periodLength);
    const prevEnd = parseDateUTC(args.startDate);
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
    const prevStartStr = formatDateStr(prevStart);
    const prevEndStr = formatDateStr(prevEnd);
    const prevStartEpoch = prevStart.getTime();
    const prevEndEpoch = prevEnd.getTime() + 24 * 60 * 60 * 1000 - 1;

    // Previous period active = unique customers with completed appointments in prev period
    // (not all-time active, which would always equal current totalActive)
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

    // Build customer stats up to the end of previous period (not current period)
    const allHistoricalAppts = await getAppointmentsForDateRange(
      ctx.db,
      ctx.organizationId,
      "2020-01-01", // Far past date to get all historical data
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

    const prevReturningCount = prevCompleted.filter((a) => {
      const custId = a.customerId as string;
      const historicalCount = prevPeriodCustomerStats.get(custId) || 0;
      return historicalCount >= 2;
    }).length;
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
