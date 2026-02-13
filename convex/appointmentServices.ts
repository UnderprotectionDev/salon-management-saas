import { v } from "convex/values";
import { orgQuery } from "./lib/functions";
import { appointmentServiceDocValidator } from "./lib/validators";

/**
 * Get services for an appointment.
 */
export const getByAppointment = orgQuery({
  args: { appointmentId: v.id("appointments") },
  returns: v.array(appointmentServiceDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointmentServices")
      .withIndex("by_appointment", (q) =>
        q.eq("appointmentId", args.appointmentId),
      )
      .collect();
  },
});
