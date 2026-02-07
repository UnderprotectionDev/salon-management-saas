import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import { ensureUniqueCode } from "./lib/confirmation";
import { isOverlapping, timeStringToMinutes } from "./lib/dateTime";
import {
  authedQuery,
  ErrorCode,
  orgMutation,
  orgQuery,
  publicMutation,
  publicQuery,
} from "./lib/functions";
import { isValidTurkishPhone } from "./lib/phone";
import { rateLimiter } from "./lib/rateLimits";
import { resolveSchedule } from "./lib/scheduleResolver";
import {
  appointmentSourceValidator,
  appointmentStatusValidator,
  appointmentWithDetailsValidator,
  cancelledByValidator,
  publicAppointmentValidator,
  userAppointmentValidator,
} from "./lib/validators";

// =============================================================================
// Helper: Enrich appointment with customer, staff, services
// =============================================================================

async function enrichAppointment(
  ctx: { db: DatabaseReader },
  appointment: Doc<"appointments">,
) {
  const [customer, staff] = await Promise.all([
    ctx.db.get(appointment.customerId),
    ctx.db.get(appointment.staffId),
  ]);

  const apptServices = await ctx.db
    .query("appointmentServices")
    .withIndex("by_appointment", (q) => q.eq("appointmentId", appointment._id))
    .collect();

  return {
    ...appointment,
    customerName: customer?.name ?? "Unknown",
    customerPhone: customer?.phone ?? "",
    customerEmail: customer?.email,
    staffName: staff?.name ?? "Unknown",
    staffImageUrl: staff?.imageUrl,
    services: apptServices.map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      duration: s.duration,
      price: s.price,
    })),
  };
}

// =============================================================================
// Public API (Customer-facing)
// =============================================================================

/**
 * Create a new appointment (public booking).
 * Rate limited. Validates slot availability, lock ownership, and staff schedule.
 */
export const create = publicMutation({
  args: {
    organizationId: v.id("organization"),
    staffId: v.id("staff"),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    serviceIds: v.array(v.id("services")),
    customer: v.object({
      name: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
    sessionId: v.string(),
    source: v.optional(appointmentSourceValidator),
  },
  returns: v.object({
    appointmentId: v.id("appointments"),
    confirmationCode: v.string(),
    customerId: v.id("customers"),
  }),
  handler: async (ctx, args) => {
    // 1. Rate limit
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "createBooking", {
      key: args.organizationId,
    });
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Booking limit exceeded. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000)} seconds.`,
      });
    }

    // 2. Validate slot lock ownership
    const locks = await ctx.db
      .query("slotLocks")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const myLock = locks.find(
      (l) =>
        l.staffId === args.staffId &&
        l.date === args.date &&
        l.startTime === args.startTime &&
        l.endTime === args.endTime &&
        l.expiresAt > Date.now(),
    );
    if (!myLock) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          "Slot lock expired or not found. Please select a time slot again.",
      });
    }

    // 3. Verify staff schedule
    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.status !== "active") {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff member not found or inactive",
      });
    }

    const override = await ctx.db
      .query("scheduleOverrides")
      .withIndex("by_staff_date", (q) =>
        q.eq("staffId", args.staffId).eq("date", args.date),
      )
      .first();

    const overtimeEntries = await ctx.db
      .query("staffOvertime")
      .withIndex("by_staff_date", (q) =>
        q.eq("staffId", args.staffId).eq("date", args.date),
      )
      .collect();

    const resolved = resolveSchedule({
      date: args.date,
      defaultSchedule: staff.defaultSchedule ?? undefined,
      override: override ?? null,
      overtimeEntries,
    });

    // Build working windows
    const windows: Array<{ start: number; end: number }> = [];
    if (
      resolved.available &&
      resolved.effectiveStart &&
      resolved.effectiveEnd
    ) {
      windows.push({
        start: timeStringToMinutes(resolved.effectiveStart),
        end: timeStringToMinutes(resolved.effectiveEnd),
      });
    }
    for (const ot of resolved.overtimeWindows) {
      windows.push({
        start: timeStringToMinutes(ot.start),
        end: timeStringToMinutes(ot.end),
      });
    }

    const fitsInWindow = windows.some(
      (w) => args.startTime >= w.start && args.endTime <= w.end,
    );
    if (!fitsInWindow) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Selected time is outside staff working hours",
      });
    }

    // 4. Verify at least one service selected
    if (args.serviceIds.length === 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "At least one service must be selected",
      });
    }

    // Verify staff can perform selected services
    const staffServiceIds = staff.serviceIds ?? [];
    for (const sid of args.serviceIds) {
      if (!staffServiceIds.includes(sid)) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Staff cannot perform one or more selected services",
        });
      }
    }

    // 5. Check for conflicting appointments
    const existingAppts = await ctx.db
      .query("appointments")
      .withIndex("by_staff_date", (q) =>
        q.eq("staffId", args.staffId).eq("date", args.date),
      )
      .collect();
    const activeAppts = existingAppts.filter(
      (a) => a.status !== "cancelled" && a.status !== "no_show",
    );
    for (const appt of activeAppts) {
      if (
        isOverlapping(
          args.startTime,
          args.endTime,
          appt.startTime,
          appt.endTime,
        )
      ) {
        throw new ConvexError({
          code: ErrorCode.ALREADY_EXISTS,
          message: "This time slot is no longer available",
        });
      }
    }

    // 6. Find or create customer
    if (!isValidTurkishPhone(args.customer.phone)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid phone format. Use: +90 5XX XXX XX XX",
      });
    }

    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_org_phone", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("phone", args.customer.phone),
      )
      .first();

    const now = Date.now();
    let customerId: Id<"customers">;
    if (existingCustomer) {
      customerId = existingCustomer._id;
      // Update name/email if different
      const updates: Record<string, unknown> = {};
      if (existingCustomer.name !== args.customer.name) {
        updates.name = args.customer.name;
      }
      if (args.customer.email && existingCustomer.email !== args.customer.email) {
        updates.email = args.customer.email;
      }
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = now;
        await ctx.db.patch(customerId, updates);
      }
    } else {
      customerId = await ctx.db.insert("customers", {
        organizationId: args.organizationId,
        name: args.customer.name,
        phone: args.customer.phone,
        email: args.customer.email,
        source: "online",
        accountStatus: "guest",
        totalVisits: 0,
        totalSpent: 0,
        noShowCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    // 7. Fetch services for pricing
    const services = await Promise.all(
      args.serviceIds.map((id) => ctx.db.get(id)),
    );
    const validServices = services.filter(
      (s): s is Doc<"services"> => s !== null,
    );
    const subtotal = validServices.reduce((sum, s) => sum + s.price, 0);

    // 8. Generate confirmation code
    const confirmationCode = await ensureUniqueCode(
      ctx.db,
      args.organizationId,
    );

    // 9. Create appointment
    const appointmentId = await ctx.db.insert("appointments", {
      organizationId: args.organizationId,
      customerId,
      staffId: args.staffId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      status: "pending",
      source: args.source ?? "online",
      confirmationCode,
      subtotal,
      total: subtotal,
      customerNotes: args.customer.notes,
      createdAt: now,
      updatedAt: now,
    });

    // 10. Create appointment service records
    for (const service of validServices) {
      await ctx.db.insert("appointmentServices", {
        appointmentId,
        serviceId: service._id,
        serviceName: service.name,
        duration: service.duration,
        price: service.price,
        staffId: args.staffId,
      });
    }

    // 11. Delete the slot lock
    await ctx.db.delete(myLock._id);

    return { appointmentId, confirmationCode, customerId };
  },
});

/**
 * Look up an appointment by confirmation code (public).
 * Returns a limited view excluding sensitive fields.
 */
export const getByConfirmationCode = publicQuery({
  args: {
    organizationId: v.id("organization"),
    confirmationCode: v.string(),
  },
  returns: v.union(publicAppointmentValidator, v.null()),
  handler: async (ctx, args) => {
    const appointment = await ctx.db
      .query("appointments")
      .withIndex("by_confirmation", (q) =>
        q.eq("confirmationCode", args.confirmationCode),
      )
      .first();

    if (!appointment || appointment.organizationId !== args.organizationId) {
      return null;
    }

    const enriched = await enrichAppointment(ctx, appointment);

    return {
      _id: enriched._id,
      date: enriched.date,
      startTime: enriched.startTime,
      endTime: enriched.endTime,
      status: enriched.status,
      confirmationCode: enriched.confirmationCode,
      staffName: enriched.staffName,
      staffImageUrl: enriched.staffImageUrl,
      customerName: enriched.customerName,
      customerNotes: enriched.customerNotes,
      total: enriched.total,
      services: enriched.services.map((s) => ({
        serviceName: s.serviceName,
        duration: s.duration,
        price: s.price,
      })),
    };
  },
});

/**
 * List appointments for the currently authenticated user.
 * Finds customer records linked to the user's ID, then gets their appointments.
 */
export const listForCurrentUser = authedQuery({
  args: {},
  returns: v.array(userAppointmentValidator),
  handler: async (ctx) => {
    // Find all customer records linked to this user
    const customerRecords = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    if (customerRecords.length === 0) {
      return [];
    }

    // Gather appointments from all customer records
    const allAppointments: Doc<"appointments">[] = [];
    for (const customer of customerRecords) {
      const appts = await ctx.db
        .query("appointments")
        .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
        .collect();
      allAppointments.push(...appts);
    }

    // Sort by date desc, then startTime asc
    allAppointments.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      return dateCompare !== 0 ? dateCompare : a.startTime - b.startTime;
    });

    // Enrich with org info, staff, services
    const enriched = await Promise.all(
      allAppointments.map(async (appt) => {
        const [org, staff] = await Promise.all([
          ctx.db.get(appt.organizationId),
          ctx.db.get(appt.staffId),
        ]);

        const apptServices = await ctx.db
          .query("appointmentServices")
          .withIndex("by_appointment", (q) => q.eq("appointmentId", appt._id))
          .collect();

        return {
          _id: appt._id,
          date: appt.date,
          startTime: appt.startTime,
          endTime: appt.endTime,
          status: appt.status,
          confirmationCode: appt.confirmationCode,
          staffName: staff?.name ?? "Unknown",
          staffImageUrl: staff?.imageUrl,
          total: appt.total,
          organizationName: org?.name ?? "Unknown",
          organizationSlug: org?.slug ?? "",
          organizationLogo: org?.logo,
          services: apptServices.map((s) => ({
            serviceName: s.serviceName,
            duration: s.duration,
            price: s.price,
          })),
        };
      }),
    );

    return enriched;
  },
});

// =============================================================================
// Admin API (Staff-facing)
// =============================================================================

/**
 * List all appointments for the organization (enriched).
 * Supports optional status filter. Sorted by date desc, startTime asc.
 */
export const list = orgQuery({
  args: {
    statusFilter: v.optional(appointmentStatusValidator),
  },
  returns: v.array(appointmentWithDetailsValidator),
  handler: async (ctx, args) => {
    let appointments: Doc<"appointments">[];

    const { statusFilter } = args;
    if (statusFilter) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", ctx.organizationId).eq("status", statusFilter),
        )
        .collect();
    } else {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", ctx.organizationId),
        )
        .collect();
    }

    // Sort by date desc, then startTime asc
    appointments.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      return dateCompare !== 0 ? dateCompare : a.startTime - b.startTime;
    });

    return Promise.all(
      appointments.map((appt) => enrichAppointment(ctx, appt)),
    );
  },
});

/**
 * Create appointment by staff (walk-in, phone, etc.)
 * No slot lock required. endTime calculated from services.
 */
export const createByStaff = orgMutation({
  args: {
    staffId: v.id("staff"),
    date: v.string(),
    startTime: v.number(),
    serviceIds: v.array(v.id("services")),
    customerId: v.id("customers"),
    source: v.union(
      v.literal("walk_in"),
      v.literal("phone"),
      v.literal("staff"),
    ),
    customerNotes: v.optional(v.string()),
    staffNotes: v.optional(v.string()),
  },
  returns: v.object({
    appointmentId: v.id("appointments"),
    confirmationCode: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate staff
    const staff = await ctx.db.get(args.staffId);
    if (
      !staff ||
      staff.organizationId !== ctx.organizationId ||
      staff.status !== "active"
    ) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff not found or inactive",
      });
    }

    // Validate customer
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Customer not found",
      });
    }

    // Validate at least one service
    if (args.serviceIds.length === 0) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "At least one service must be selected",
      });
    }

    // Fetch services and calculate duration/pricing
    const services = await Promise.all(
      args.serviceIds.map((id) => ctx.db.get(id)),
    );
    const validServices = services.filter(
      (s): s is Doc<"services"> =>
        s !== null &&
        s.organizationId === ctx.organizationId &&
        s.status === "active",
    );
    if (validServices.length !== args.serviceIds.length) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "One or more services not found or inactive",
      });
    }

    // Verify staff can perform selected services
    const staffServiceIds = staff.serviceIds ?? [];
    for (const sid of args.serviceIds) {
      if (!staffServiceIds.includes(sid)) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message: "Staff cannot perform one or more selected services",
        });
      }
    }

    const totalDuration = validServices.reduce((sum, s) => sum + s.duration, 0);
    const endTime = args.startTime + totalDuration;
    const subtotal = validServices.reduce((sum, s) => sum + s.price, 0);

    // Check for conflicting appointments
    const existingAppts = await ctx.db
      .query("appointments")
      .withIndex("by_staff_date", (q) =>
        q.eq("staffId", args.staffId).eq("date", args.date),
      )
      .collect();
    const activeAppts = existingAppts.filter(
      (a) => a.status !== "cancelled" && a.status !== "no_show",
    );
    for (const appt of activeAppts) {
      if (
        isOverlapping(args.startTime, endTime, appt.startTime, appt.endTime)
      ) {
        throw new ConvexError({
          code: ErrorCode.ALREADY_EXISTS,
          message: "Time slot conflicts with an existing appointment",
        });
      }
    }

    const now = Date.now();
    const confirmationCode = await ensureUniqueCode(ctx.db, ctx.organizationId);

    const appointmentId = await ctx.db.insert("appointments", {
      organizationId: ctx.organizationId,
      customerId: args.customerId,
      staffId: args.staffId,
      date: args.date,
      startTime: args.startTime,
      endTime,
      status: "confirmed",
      source: args.source,
      confirmationCode,
      confirmedAt: now,
      subtotal,
      total: subtotal,
      customerNotes: args.customerNotes,
      staffNotes: args.staffNotes,
      createdAt: now,
      updatedAt: now,
    });

    // Create appointment service records
    for (const service of validServices) {
      await ctx.db.insert("appointmentServices", {
        appointmentId,
        serviceId: service._id,
        serviceName: service.name,
        duration: service.duration,
        price: service.price,
        staffId: args.staffId,
      });
    }

    return { appointmentId, confirmationCode };
  },
});

/**
 * Get appointments for a date (enriched with customer, staff, services).
 */
export const getByDate = orgQuery({
  args: {
    date: v.string(),
    staffId: v.optional(v.id("staff")),
  },
  returns: v.array(appointmentWithDetailsValidator),
  handler: async (ctx, args) => {
    let appointments: Doc<"appointments">[];
    if (args.staffId) {
      const staffAppts = await ctx.db
        .query("appointments")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", args.staffId!).eq("date", args.date),
        )
        .collect();
      // Filter by org
      appointments = staffAppts.filter(
        (a) => a.organizationId === ctx.organizationId,
      );
    } else {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) =>
          q.eq("organizationId", ctx.organizationId).eq("date", args.date),
        )
        .collect();
    }

    // Sort by startTime
    appointments.sort((a, b) => a.startTime - b.startTime);

    const enriched = await Promise.all(
      appointments.map((appt) => enrichAppointment(ctx, appt)),
    );

    return enriched;
  },
});

/**
 * Get a single appointment by ID (enriched).
 */
export const get = orgQuery({
  args: { appointmentId: v.id("appointments") },
  returns: v.union(appointmentWithDetailsValidator, v.null()),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment || appointment.organizationId !== ctx.organizationId) {
      return null;
    }
    return enrichAppointment(ctx, appointment);
  },
});

/**
 * Update appointment status (staff action).
 * Valid transitions: pending->confirmed, confirmed->checked_in,
 * checked_in->in_progress, in_progress->completed, any->no_show
 */
export const updateStatus = orgMutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.union(
      v.literal("confirmed"),
      v.literal("checked_in"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("no_show"),
    ),
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

    if (
      appointment.status === "cancelled" ||
      appointment.status === "completed"
    ) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Cannot change status from ${appointment.status}`,
      });
    }

    // Valid status transitions
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "no_show"],
      confirmed: ["checked_in", "no_show"],
      checked_in: ["in_progress", "no_show"],
      in_progress: ["completed", "no_show"],
    };

    const allowed = validTransitions[appointment.status] ?? [];
    if (!allowed.includes(args.status)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Cannot transition from ${appointment.status} to ${args.status}`,
      });
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "confirmed") updates.confirmedAt = now;
    if (args.status === "checked_in") updates.checkedInAt = now;
    if (args.status === "completed") updates.completedAt = now;
    if (args.status === "no_show") updates.noShowAt = now;

    await ctx.db.patch(args.appointmentId, updates);

    // Update customer stats on completed / no_show
    if (args.status === "completed" || args.status === "no_show") {
      const customer = await ctx.db.get(appointment.customerId);
      if (customer) {
        if (args.status === "completed") {
          await ctx.db.patch(customer._id, {
            totalVisits: (customer.totalVisits ?? 0) + 1,
            totalSpent: (customer.totalSpent ?? 0) + appointment.total,
            lastVisitDate: appointment.date,
            updatedAt: now,
          });
        } else if (args.status === "no_show") {
          await ctx.db.patch(customer._id, {
            noShowCount: (customer.noShowCount ?? 0) + 1,
            updatedAt: now,
          });
        }
      }
    }

    return { success: true };
  },
});

/**
 * Cancel an appointment.
 */
export const cancel = orgMutation({
  args: {
    appointmentId: v.id("appointments"),
    reason: v.optional(v.string()),
    cancelledBy: cancelledByValidator,
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

    if (
      appointment.status === "cancelled" ||
      appointment.status === "completed"
    ) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Cannot cancel a ${appointment.status} appointment`,
      });
    }

    // Rate limit
    const { ok } = await rateLimiter.limit(ctx, "cancelBooking", {
      key: ctx.organizationId,
    });
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: "Cancellation limit exceeded. Please try again later.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      cancelledAt: now,
      cancelledBy: args.cancelledBy,
      cancellationReason: args.reason,
      updatedAt: now,
    });

    return { success: true };
  },
});
