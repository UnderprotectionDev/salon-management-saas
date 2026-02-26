import { ConvexError, v } from "convex/values";
import { timeStringToMinutes } from "./lib/dateTime";
import { ErrorCode, orgQuery } from "./lib/functions";
import { resolveSchedule } from "./lib/scheduleResolver";
import { staffPerformanceReportValidator } from "./lib/validators";
import {
  getAppointmentsForDateRange,
  validateDateRange,
} from "./reportHelpers";

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
