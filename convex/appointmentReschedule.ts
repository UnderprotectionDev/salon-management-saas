/**
 * Appointment reschedule operations.
 * Extracted from appointments.ts for single-responsibility.
 */
import { ConvexError, v } from "convex/values";
import { validateSlotAvailability } from "./appointments_helpers";
import { dateTimeToEpoch } from "./lib/dateTime";
import { authedMutation, ErrorCode, orgMutation } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";

// =============================================================================
// Staff Reschedule
// =============================================================================

/**
 * Reschedule an appointment (staff action).
 * Changes date/time, optionally changes staff.
 * Keeps same confirmation code.
 */
export const reschedule = orgMutation({
  args: {
    appointmentId: v.id("appointments"),
    newDate: v.string(),
    newStartTime: v.number(),
    newEndTime: v.number(),
    newStaffId: v.optional(v.id("staff")),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Appointment not found",
      });
    }

    // Staff can only reschedule their own appointments
    const isStaffOnly = ctx.member.role === "staff";
    if (isStaffOnly && ctx.staff?._id !== appointment.staffId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You can only reschedule your own appointments",
      });
    }

    // Only pending/confirmed can be rescheduled
    if (
      appointment.status !== "pending" &&
      appointment.status !== "confirmed"
    ) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Cannot reschedule a ${appointment.status} appointment`,
      });
    }

    const targetStaffId = args.newStaffId ?? appointment.staffId;
    if (!targetStaffId) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          "Cannot reschedule: no staff assigned. Please select a new staff member.",
      });
    }

    // Validate slot availability (exclude self from conflict check)
    const staff = await validateSlotAvailability(ctx, {
      staffId: targetStaffId,
      date: args.newDate,
      startTime: args.newStartTime,
      endTime: args.newEndTime,
      excludeAppointmentId: appointment._id,
    });

    // If changing staff, verify new staff can perform all services
    if (args.newStaffId && args.newStaffId !== appointment.staffId) {
      const apptServices = await ctx.db
        .query("appointmentServices")
        .withIndex("by_appointment", (q) =>
          q.eq("appointmentId", appointment._id),
        )
        .collect();

      const staffServiceIds = staff.serviceIds ?? [];
      for (const as of apptServices) {
        if (!staffServiceIds.includes(as.serviceId)) {
          throw new ConvexError({
            code: ErrorCode.VALIDATION_ERROR,
            message: "New staff member cannot perform all booked services",
          });
        }
      }

      // Update appointment service records with new staffId
      for (const as of apptServices) {
        await ctx.db.patch(as._id, { staffId: args.newStaffId });
      }
    }

    const now = Date.now();
    const historyEntry = {
      fromDate: appointment.date,
      fromStartTime: appointment.startTime,
      fromEndTime: appointment.endTime,
      toDate: args.newDate,
      toStartTime: args.newStartTime,
      toEndTime: args.newEndTime,
      rescheduledBy: "staff" as const,
      rescheduledAt: now,
    };

    await ctx.db.patch(appointment._id, {
      date: args.newDate,
      startTime: args.newStartTime,
      endTime: args.newEndTime,
      staffId: targetStaffId,
      rescheduledAt: now,
      rescheduleCount: (appointment.rescheduleCount ?? 0) + 1,
      rescheduleHistory: [
        ...(appointment.rescheduleHistory ?? []),
        historyEntry,
      ],
      updatedAt: now,
    });

    // Notifications are handled automatically by triggers (convex/lib/triggers.ts)

    return { success: true };
  },
});

// =============================================================================
// User Reschedule (Authenticated)
// =============================================================================

/**
 * Reschedule an appointment as the authenticated user.
 * Identity via customer.userId — no phone verification needed.
 * Enforces cancellation policy. Cannot change staff.
 */
export const rescheduleByUser = authedMutation({
  args: {
    appointmentId: v.id("appointments"),
    newDate: v.string(),
    newStartTime: v.number(),
    newEndTime: v.number(),
    sessionId: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Appointment not found",
      });
    }

    // Rate limit by user ID (not org) to prevent one user's reschedules
    // from affecting all customers in the organization
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "rescheduleBooking",
      { key: ctx.user._id },
    );
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Reschedule limit exceeded. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000)} seconds.`,
      });
    }

    // Verify ownership via customer record
    const customer = await ctx.db.get(appointment.customerId);
    if (!customer || customer.userId !== ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You do not have permission to reschedule this appointment",
      });
    }

    // Only pending/confirmed can be rescheduled
    if (
      appointment.status !== "pending" &&
      appointment.status !== "confirmed"
    ) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Cannot reschedule a ${appointment.status} appointment`,
      });
    }

    // Read cancellation policy from settings (also applies to reschedule)
    const orgSettings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", appointment.organizationId),
      )
      .first();
    const cancellationPolicyHours =
      orgSettings?.bookingSettings?.cancellationPolicyHours ?? 24;
    const timezone = orgSettings?.timezone ?? "Europe/Istanbul";

    // Enforce reschedule policy
    const appointmentEpoch = dateTimeToEpoch(
      appointment.date,
      appointment.startTime,
      timezone,
    );
    const policyBefore =
      appointmentEpoch - cancellationPolicyHours * 60 * 60 * 1000;
    if (Date.now() > policyBefore) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Appointments can only be rescheduled at least ${cancellationPolicyHours} hours before the start time`,
      });
    }

    // Validate slot lock ownership
    const locks = await ctx.db
      .query("slotLocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const myLock = locks.find(
      (l) =>
        l.staffId === appointment.staffId &&
        l.date === args.newDate &&
        l.startTime === args.newStartTime &&
        l.endTime === args.newEndTime &&
        l.expiresAt > Date.now(),
    );
    if (!myLock) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          "Slot lock expired or not found. Please select a time slot again.",
      });
    }

    // Validate slot availability
    if (!appointment.staffId) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          "Cannot reschedule: no staff assigned. Please contact the salon.",
      });
    }
    await validateSlotAvailability(ctx, {
      staffId: appointment.staffId,
      date: args.newDate,
      startTime: args.newStartTime,
      endTime: args.newEndTime,
      excludeAppointmentId: appointment._id,
    });

    const now = Date.now();
    const historyEntry = {
      fromDate: appointment.date,
      fromStartTime: appointment.startTime,
      fromEndTime: appointment.endTime,
      toDate: args.newDate,
      toStartTime: args.newStartTime,
      toEndTime: args.newEndTime,
      rescheduledBy: "customer" as const,
      rescheduledAt: now,
    };

    await ctx.db.patch(appointment._id, {
      date: args.newDate,
      startTime: args.newStartTime,
      endTime: args.newEndTime,
      rescheduledAt: now,
      rescheduleCount: (appointment.rescheduleCount ?? 0) + 1,
      rescheduleHistory: [
        ...(appointment.rescheduleHistory ?? []),
        historyEntry,
      ],
      updatedAt: now,
    });

    // Delete the slot lock
    await ctx.db.delete(myLock._id);

    // Notifications are handled automatically by triggers (convex/lib/triggers.ts)

    return { success: true };
  },
});
