import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { orgQuery } from "./lib/functions";
import { appointmentServiceDocValidator } from "./lib/validators";

/**
 * Create appointment service records (junction table).
 * Internal mutation — called from appointment creation.
 */
export const createForAppointment = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    services: v.array(
      v.object({
        serviceId: v.id("services"),
        serviceName: v.string(),
        duration: v.number(),
        price: v.number(),
        staffId: v.id("staff"),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const service of args.services) {
      await ctx.db.insert("appointmentServices", {
        appointmentId: args.appointmentId,
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        duration: service.duration,
        price: service.price,
        staffId: service.staffId,
      });
    }
    return null;
  },
});

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
