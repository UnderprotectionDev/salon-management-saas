/**
 * Test script to debug customer dashboard
 *
 * Usage:
 * 1. Go to Convex Dashboard → Functions
 * 2. Find "testCustomerDashboard.debug"
 * 3. Run it (no args needed)
 * 4. Check the result
 */

import { v } from "convex/values";
import { authedQuery } from "./lib/functions";

export const debug = authedQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = ctx.user._id;

    // Step 1: Check if user has customer records
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    console.log(
      `Found ${customers.length} customer records for user ${userId}`,
    );

    if (customers.length === 0) {
      return {
        status: "NO_CUSTOMER_RECORDS",
        message:
          "User has no customer records. User must book an appointment at a salon first.",
        userId,
        customers: [],
        appointments: [],
      };
    }

    // Step 2: Check appointments for each customer
    const customerIds = customers.map((c) => c._id);
    const allAppointments = [];

    for (const customerId of customerIds) {
      const appts = await ctx.db
        .query("appointments")
        .withIndex("by_customer", (q) => q.eq("customerId", customerId))
        .collect();

      console.log(`Customer ${customerId}: ${appts.length} total appointments`);

      const completed = appts.filter((a) => a.status === "completed");
      console.log(`  - ${completed.length} completed`);

      allAppointments.push(...appts);
    }

    const completedAppts = allAppointments.filter(
      (a) => a.status === "completed",
    );

    if (completedAppts.length === 0) {
      return {
        status: "NO_COMPLETED_APPOINTMENTS",
        message: "User has customer records but no completed appointments yet.",
        userId,
        customerCount: customers.length,
        totalAppointments: allAppointments.length,
        completedAppointments: 0,
        appointmentStatuses: allAppointments.map((a) => ({
          id: a._id,
          status: a.status,
          date: a.date,
        })),
      };
    }

    return {
      status: "SUCCESS",
      message: "User has completed appointments. Dashboard should show data.",
      userId,
      customerCount: customers.length,
      totalAppointments: allAppointments.length,
      completedAppointments: completedAppts.length,
      customers: customers.map((c) => ({
        id: c._id,
        name: c.name,
        organizationId: c.organizationId,
      })),
    };
  },
});
