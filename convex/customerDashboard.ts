import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { authedQuery } from "./lib/functions";

/** Parse "YYYY-MM-DD" manually to avoid timezone ambiguity. */
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

/** Get month string in YYYY-MM format for a given timestamp. */
function getMonthStr(timestamp: number): string {
  const date = new Date(timestamp);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export const getCustomerDashboard = authedQuery({
  args: {},
  returns: v.object({
    totalVisits: v.number(),
    thisMonthVisits: v.number(),
    lastVisitDate: v.union(v.string(), v.null()),
    totalSpent: v.number(),
    monthlyAvgSpent: v.number(),
    favoriteServices: v.array(
      v.object({
        serviceName: v.string(),
        count: v.number(),
        totalSpent: v.number(),
      }),
    ),
    monthlySpending: v.array(
      v.object({
        month: v.string(),
        amount: v.number(),
        visits: v.number(),
      }),
    ),
    recentAppointments: v.array(
      v.object({
        appointmentId: v.id("appointments"),
        salonName: v.string(),
        salonSlug: v.string(),
        date: v.string(),
        startTime: v.number(),
        endTime: v.number(),
        status: v.string(),
        services: v.array(v.string()),
        total: v.number(),
      }),
    ),
    salons: v.array(
      v.object({
        organizationId: v.id("organization"),
        name: v.string(),
        slug: v.string(),
        totalVisits: v.number(),
        totalSpent: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const userId = ctx.user._id;

    // Find all customer records for this user across all salons (capped, most recent first)
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    if (customers.length === 0) {
      // No customer records yet
      return {
        totalVisits: 0,
        thisMonthVisits: 0,
        lastVisitDate: null,
        totalSpent: 0,
        monthlyAvgSpent: 0,
        favoriteServices: [],
        monthlySpending: [],
        recentAppointments: [],
        salons: [],
      };
    }

    // Get completed appointments for these customers using compound index (no client-side filter)
    const customerIds = customers.map((c) => c._id);
    const appointmentsByCustomer = await Promise.all(
      customerIds.map(async (customerId) => {
        return ctx.db
          .query("appointments")
          .withIndex("by_customer_status", (q) =>
            q.eq("customerId", customerId).eq("status", "completed"),
          )
          .order("desc")
          .take(200);
      }),
    );
    const allAppointments = appointmentsByCustomer.flat();

    // Fetch organizations for salon info
    const orgIds = [...new Set(allAppointments.map((a) => a.organizationId))];
    const organizations = await Promise.all(
      orgIds.map(async (orgId) => {
        const org = await ctx.db.get(orgId);
        return org;
      }),
    );
    const orgMap = new Map(
      organizations
        .filter((o): o is NonNullable<typeof o> => o !== null)
        .map((o) => [o._id, o]),
    );

    // Calculate aggregates
    const totalVisits = allAppointments.length;
    const totalSpent = allAppointments.reduce((sum, a) => sum + a.total, 0);

    // This month visits
    const now = new Date();
    const thisMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const thisMonthStartStr = formatDateStr(thisMonthStart);
    const thisMonthVisits = allAppointments.filter(
      (a) => a.date >= thisMonthStartStr,
    ).length;

    // Last visit date
    const lastVisitDate =
      allAppointments.length > 0
        ? allAppointments.reduce(
            (latest, a) => (a.date > latest ? a.date : latest),
            allAppointments[0].date,
          )
        : null;

    // Monthly spending (last 12 months)
    const monthlyMap = new Map<string, { amount: number; visits: number }>();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);
    const twelveMonthsAgoEpoch = twelveMonthsAgo.getTime();

    for (const appt of allAppointments) {
      const apptDate = parseDateUTC(appt.date);
      if (apptDate.getTime() >= twelveMonthsAgoEpoch) {
        const month = getMonthStr(apptDate.getTime());
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { amount: 0, visits: 0 });
        }
        const entry = monthlyMap.get(month);
        if (entry) {
          entry.amount += appt.total;
          entry.visits++;
        }
      }
    }

    const monthlySpending = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const monthlyAvgSpent =
      monthlySpending.length > 0
        ? Math.round(
            monthlySpending.reduce((sum, m) => sum + m.amount, 0) /
              monthlySpending.length,
          )
        : 0;

    // Fetch appointmentServices only for recent appointments (cap at 50)
    // to reduce N+1 queries while still covering favorite services + recent display
    const recentForServices = allAppointments
      .sort((a, b) => {
        if (a.date === b.date) return b.startTime - a.startTime;
        return b.date.localeCompare(a.date);
      })
      .slice(0, 50);
    const apptServiceQueries = recentForServices.map(async (appt) => {
      const services = await ctx.db
        .query("appointmentServices")
        .withIndex("by_appointment", (q) => q.eq("appointmentId", appt._id))
        .collect();
      return services;
    });
    const allApptServices = (await Promise.all(apptServiceQueries)).flat();

    // Favorite services (from recent 50 appointments)
    const serviceCountMap = new Map<string, { count: number; spent: number }>();
    for (const svc of allApptServices) {
      if (!serviceCountMap.has(svc.serviceName)) {
        serviceCountMap.set(svc.serviceName, { count: 0, spent: 0 });
      }
      const entry = serviceCountMap.get(svc.serviceName);
      if (entry) {
        entry.count++;
        entry.spent += svc.price;
      }
    }

    const favoriteServices = Array.from(serviceCountMap.entries())
      .map(([serviceName, data]) => ({
        serviceName,
        count: data.count,
        totalSpent: data.spent,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent appointments (last 10, with services) - already sorted in recentForServices
    const recentAppointments = recentForServices.slice(0, 10).map((appt) => {
      const org = orgMap.get(appt.organizationId);
      const apptServices = allApptServices.filter(
        (s) => s.appointmentId === appt._id,
      );
      return {
        appointmentId: appt._id,
        salonName: org?.name ?? "Unknown Salon",
        salonSlug: org?.slug ?? "",
        date: appt.date,
        startTime: appt.startTime,
        endTime: appt.endTime,
        status: appt.status,
        services: apptServices.map((s) => s.serviceName),
        total: appt.total,
      };
    });

    // Salons breakdown
    const salonMap = new Map<
      Id<"organization">,
      { name: string; slug: string; visits: number; spent: number }
    >();
    for (const appt of allAppointments) {
      const org = orgMap.get(appt.organizationId);
      if (!org) continue;
      if (!salonMap.has(appt.organizationId)) {
        salonMap.set(appt.organizationId, {
          name: org.name,
          slug: org.slug,
          visits: 0,
          spent: 0,
        });
      }
      const entry = salonMap.get(appt.organizationId);
      if (entry) {
        entry.visits++;
        entry.spent += appt.total;
      }
    }

    const salons = Array.from(salonMap.entries())
      .map(([organizationId, data]) => ({
        organizationId,
        name: data.name,
        slug: data.slug,
        totalVisits: data.visits,
        totalSpent: data.spent,
      }))
      .sort((a, b) => b.totalVisits - a.totalVisits);

    return {
      totalVisits,
      thisMonthVisits,
      lastVisitDate,
      totalSpent,
      monthlyAvgSpent,
      favoriteServices,
      monthlySpending,
      recentAppointments,
      salons,
    };
  },
});
