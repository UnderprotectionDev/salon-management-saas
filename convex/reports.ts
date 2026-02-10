import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import { ErrorCode, adminQuery } from "./lib/functions";
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

export const getRevenueReport = adminQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: revenueReportValidator,
  handler: async (ctx, args) => {
    const dates = validateDateRange(args.startDate, args.endDate);
    const appointments = await getAppointmentsForDateRange(
      ctx.db,
      ctx.organizationId,
      args.startDate,
      args.endDate,
    );

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

    // Pre-fetch all appointment services in one batch
    const completedApptIds = appointments
      .filter((a) => a.status === "completed")
      .map((a) => a._id);

    const allApptServices = await ctx.db
      .query("appointmentServices")
      .withIndex("by_appointment")
      .collect();

    // Build lookup: appointmentId -> services[]
    const apptServiceMap = new Map<
      Id<"appointments">,
      Array<{ serviceId: Id<"services">; serviceName: string; price: number }>
    >();
    for (const s of allApptServices) {
      if (!completedApptIds.includes(s.appointmentId)) continue;
      if (!apptServiceMap.has(s.appointmentId)) {
        apptServiceMap.set(s.appointmentId, []);
      }
      apptServiceMap.get(s.appointmentId)!.push({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        price: s.price,
      });
    }

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

        // Staff breakdown
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

    const prevAppts = await getAppointmentsForDateRange(
      ctx.db,
      ctx.organizationId,
      prevStartStr,
      prevEndStr,
    );
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
    };
  },
});

// =============================================================================
// Staff Performance Report
// =============================================================================

export const getStaffPerformanceReport = adminQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: staffPerformanceReportValidator,
  handler: async (ctx, args) => {
    const dates = validateDateRange(args.startDate, args.endDate);

    // Get active staff
    const staffList = await ctx.db
      .query("staff")
      .withIndex("organizationId_status", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("status", "active"),
      )
      .collect();

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

      // Get overrides and overtime for the entire range
      const overrides = await ctx.db
        .query("scheduleOverrides")
        .withIndex("by_staff_date", (q) => q.eq("staffId", staff._id))
        .collect();
      const rangeOverrides = overrides.filter(
        (o) => o.date >= args.startDate && o.date <= args.endDate,
      );

      const overtimeEntries = await ctx.db
        .query("staffOvertime")
        .withIndex("by_staff_date", (q) => q.eq("staffId", staff._id))
        .collect();
      const rangeOvertime = overtimeEntries.filter(
        (o) => o.date >= args.startDate && o.date <= args.endDate,
      );

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

export const getCustomerReport = adminQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: customerReportValidator,
  handler: async (ctx, args) => {
    validateDateRange(args.startDate, args.endDate);

    // Get all org customers
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .collect();

    const totalActive = customers.filter(
      (c) => (c.totalVisits ?? 0) > 0,
    ).length;

    // Customers created in date range (use UTC to avoid timezone ambiguity)
    const startEpoch = parseDateUTC(args.startDate).getTime();
    const endEpoch =
      parseDateUTC(args.endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
    const newInPeriod = customers.filter(
      (c) => c._creationTime >= startEpoch && c._creationTime <= endEpoch,
    ).length;

    // Get completed appointments in range (single query)
    const appointments = await getAppointmentsForDateRange(
      ctx.db,
      ctx.organizationId,
      args.startDate,
      args.endDate,
    );
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

    return {
      totalActive,
      newInPeriod,
      retentionRate,
      avgAppointmentsPerCustomer,
      monthly,
      topCustomers,
    };
  },
});
