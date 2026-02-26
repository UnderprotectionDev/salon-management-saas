import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { formatDateStr, parseDateUTC } from "./lib/dateTime";
import { ErrorCode, orgQuery } from "./lib/functions";
import { revenueReportValidator } from "./lib/validators";
import {
  getAppointmentsForDateRange,
  validateDateRange,
} from "./reportHelpers";
import { ConvexError } from "convex/values";

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
