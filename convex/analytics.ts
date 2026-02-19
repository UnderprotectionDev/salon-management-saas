import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import { addDays } from "./lib/dateTime";
import { orgQuery } from "./lib/functions";
import { dashboardStatsValidator } from "./lib/validators";

/**
 * Get dashboard statistics for a given date.
 * Role-based: members only see their own staff appointments.
 */
export const getDashboardStats = orgQuery({
  args: { date: v.string() },
  returns: dashboardStatsValidator,
  handler: async (ctx, args) => {
    const isStaffOnly = ctx.member.role === "staff";
    const staffFilter = isStaffOnly ? ctx.staff?._id : undefined;

    // If staff member has no associated staff profile, return empty stats
    if (isStaffOnly && !staffFilter) {
      return {
        todayTotal: 0,
        todayCompleted: 0,
        todayUpcoming: 0,
        todayNoShows: 0,
        todayWalkIns: 0,
        todayTotalChange: 0,
        monthlyRevenue: 0,
        monthlyRevenueChange: 0,
      };
    }

    // Today's appointments
    const todayAppts = await ctx.db
      .query("appointments")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", args.date),
      )
      .collect();

    const filtered = staffFilter
      ? todayAppts.filter((a) => a.staffId === staffFilter)
      : todayAppts;

    const todayTotal = filtered.length;
    const todayCompleted = filtered.filter(
      (a) => a.status === "completed",
    ).length;
    const todayUpcoming = filtered.filter(
      (a) =>
        a.status === "pending" ||
        a.status === "confirmed" ||
        a.status === "checked_in",
    ).length;
    const todayNoShows = filtered.filter((a) => a.status === "no_show").length;
    const todayWalkIns = filtered.filter((a) => a.source === "walk_in").length;

    // Last week same day for comparison
    const lastWeekDate = addDays(args.date, -7);
    const lastWeekAppts = await ctx.db
      .query("appointments")
      .withIndex("by_org_date", (q) =>
        q.eq("organizationId", ctx.organizationId).eq("date", lastWeekDate),
      )
      .collect();

    const lastWeekFiltered = staffFilter
      ? lastWeekAppts.filter((a) => a.staffId === staffFilter)
      : lastWeekAppts;

    const lastWeekTotal = lastWeekFiltered.length;
    const todayTotalChange =
      lastWeekTotal > 0
        ? Math.round(((todayTotal - lastWeekTotal) / lastWeekTotal) * 100)
        : 0;

    // Monthly revenue - current month
    const monthStart = `${args.date.substring(0, 7)}-01`;
    const monthEnd = getMonthEnd(args.date);
    const monthlyRevenue = await computeMonthlyRevenue(
      ctx.db,
      ctx.organizationId,
      monthStart,
      monthEnd,
      staffFilter,
    );

    // Last month revenue for comparison
    const lastMonthStart = getLastMonthStart(args.date);
    const lastMonthEnd = getLastMonthEnd(args.date);
    const lastMonthRevenue = await computeMonthlyRevenue(
      ctx.db,
      ctx.organizationId,
      lastMonthStart,
      lastMonthEnd,
      staffFilter,
    );

    const monthlyRevenueChange =
      lastMonthRevenue > 0
        ? Math.round(
            ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100,
          )
        : 0;

    return {
      todayTotal,
      todayCompleted,
      todayUpcoming,
      todayNoShows,
      todayWalkIns,
      todayTotalChange,
      monthlyRevenue,
      monthlyRevenueChange,
    };
  },
});

// =============================================================================
// Helpers
// =============================================================================

function getMonthEnd(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function getLastMonthStart(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getLastMonthEnd(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const lastDay = new Date(year, month - 1, 0).getDate();
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

async function computeMonthlyRevenue(
  db: DatabaseReader,
  organizationId: Id<"organization">,
  startDate: string,
  endDate: string,
  staffId?: Id<"staff">,
): Promise<number> {
  // Single range query instead of per-day loop (was N+1, now 1 query)
  const allAppts = await db
    .query("appointments")
    .withIndex("by_org_date", (q) =>
      q
        .eq("organizationId", organizationId)
        .gte("date", startDate)
        .lte("date", endDate),
    )
    .collect();

  let total = 0;
  for (const appt of allAppts) {
    if (appt.status === "completed") {
      if (!staffId || appt.staffId === staffId) {
        total += appt.total ?? 0;
      }
    }
  }

  return total;
}
