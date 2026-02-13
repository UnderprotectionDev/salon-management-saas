import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import { ensureUniqueCode } from "./lib/confirmation";
import {
  dateTimeToEpoch,
  isOverlapping,
  timeStringToMinutes,
} from "./lib/dateTime";
import {
  authedMutation,
  authedQuery,
  ErrorCode,
  orgMutation,
  orgQuery,
  publicQuery,
} from "./lib/functions";
import { isValidTurkishPhone } from "./lib/phone";
import { rateLimiter } from "./lib/rateLimits";
import { getDatesBetween, resolveSchedule } from "./lib/scheduleResolver";
import {
  appointmentSourceValidator,
  appointmentStatusValidator,
  appointmentWithDetailsValidator,
  cancelledByValidator,
  publicAppointmentValidator,
  userAppointmentDetailValidator,
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
    appointment.staffId ? ctx.db.get(appointment.staffId) : null,
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
    staffName: staff?.name ?? "Deleted staff",
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
// Helper: Validate slot availability for a staff member
// =============================================================================

async function validateSlotAvailability(
  ctx: { db: DatabaseReader },
  params: {
    staffId: Id<"staff">;
    date: string;
    startTime: number;
    endTime: number;
    excludeAppointmentId?: Id<"appointments">;
  },
) {
  const { staffId, date, startTime, endTime, excludeAppointmentId } = params;

  // Verify staff schedule
  const staff = await ctx.db.get(staffId);
  if (!staff || staff.status !== "active") {
    throw new ConvexError({
      code: ErrorCode.NOT_FOUND,
      message: "Staff member not found or inactive",
    });
  }

  const override = await ctx.db
    .query("scheduleOverrides")
    .withIndex("by_staff_date", (q) =>
      q.eq("staffId", staffId).eq("date", date),
    )
    .first();

  const overtimeEntries = await ctx.db
    .query("staffOvertime")
    .withIndex("by_staff_date", (q) =>
      q.eq("staffId", staffId).eq("date", date),
    )
    .collect();

  const resolved = resolveSchedule({
    date,
    defaultSchedule: staff.defaultSchedule ?? undefined,
    override: override ?? null,
    overtimeEntries,
  });

  // Build working windows
  const windows: Array<{ start: number; end: number }> = [];
  if (resolved.available && resolved.effectiveStart && resolved.effectiveEnd) {
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
    (w) => startTime >= w.start && endTime <= w.end,
  );
  if (!fitsInWindow) {
    throw new ConvexError({
      code: ErrorCode.VALIDATION_ERROR,
      message: "Selected time is outside staff working hours",
    });
  }

  // Check for conflicting appointments
  const existingAppts = await ctx.db
    .query("appointments")
    .withIndex("by_staff_date", (q) =>
      q.eq("staffId", staffId).eq("date", date),
    )
    .collect();
  const activeAppts = existingAppts.filter(
    (a) =>
      a.status !== "cancelled" &&
      a.status !== "no_show" &&
      a._id !== excludeAppointmentId,
  );
  for (const appt of activeAppts) {
    if (isOverlapping(startTime, endTime, appt.startTime, appt.endTime)) {
      throw new ConvexError({
        code: ErrorCode.ALREADY_EXISTS,
        message: "This time slot is no longer available",
      });
    }
  }

  return staff;
}

// =============================================================================
// Public API (Customer-facing)
// =============================================================================

/**
 * Create a new appointment (authenticated booking).
 * Rate limited. Validates slot availability, lock ownership, and staff schedule.
 */
export const create = authedMutation({
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

    // 2. Check subscription status — block if suspended or canceled
    const orgSettings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
    if (
      orgSettings?.subscriptionStatus === "suspended" ||
      orgSettings?.subscriptionStatus === "canceled" ||
      orgSettings?.subscriptionStatus === "pending_payment"
    ) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message:
          "This salon's subscription is inactive. Bookings are currently unavailable.",
      });
    }

    // 3. Validate slot lock ownership
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

    // 3. Validate staff schedule + slot availability
    const staff = await validateSlotAvailability(ctx, {
      staffId: args.staffId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
    });

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
      if (
        args.customer.email &&
        existingCustomer.email !== args.customer.email
      ) {
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

    // 12. Notify all staff about new booking
    await ctx.scheduler.runAfter(0, internal.notifications.notifyAllStaff, {
      organizationId: args.organizationId,
      type: "new_booking" as const,
      title: "New Booking",
      message: `${args.customer.name} booked for ${args.date} at ${formatMinutesShort(args.startTime)}`,
      appointmentId,
    });

    // 13. Send booking confirmation email (async, non-blocking)
    await ctx.scheduler.runAfter(0, internal.email.sendBookingConfirmation, {
      appointmentId,
      organizationId: args.organizationId,
    });

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
      source: enriched.source,
      confirmationCode: enriched.confirmationCode,
      staffName: enriched.staffName,
      staffImageUrl: enriched.staffImageUrl,
      staffId: enriched.staffId,
      customerName: enriched.customerName,
      customerPhone: enriched.customerPhone,
      customerNotes: enriched.customerNotes,
      cancelledAt: enriched.cancelledAt,
      rescheduleCount: enriched.rescheduleCount,
      total: enriched.total,
      services: enriched.services.map((s) => ({
        serviceId: s.serviceId,
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
          appt.staffId ? ctx.db.get(appt.staffId) : null,
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
          staffName: staff?.name ?? "Deleted staff",
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
    const isStaffOnly = ctx.member.role === "staff";
    const staffFilter = isStaffOnly ? ctx.staff?._id : undefined;

    let appointments: Doc<"appointments">[];

    if (isStaffOnly && staffFilter) {
      // Staff: only their own appointments
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_staff_date", (q) => q.eq("staffId", staffFilter))
        .collect();
      appointments = appointments.filter(
        (a) => a.organizationId === ctx.organizationId,
      );
      if (args.statusFilter) {
        appointments = appointments.filter(
          (a) => a.status === args.statusFilter,
        );
      }
    } else if (args.statusFilter) {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_status", (q) =>
          q
            .eq("organizationId", ctx.organizationId)
            .eq("status", args.statusFilter!),
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
    // Staff can only create appointments for themselves
    const isStaffOnly = ctx.member.role === "staff";
    if (isStaffOnly && ctx.staff?._id !== args.staffId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You can only create appointments for yourself",
      });
    }

    // Check subscription status — block if suspended or canceled
    const orgSettings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
      .first();
    if (
      orgSettings?.subscriptionStatus === "suspended" ||
      orgSettings?.subscriptionStatus === "canceled" ||
      orgSettings?.subscriptionStatus === "pending_payment"
    ) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message:
          "Subscription required. Please update your billing to create appointments.",
      });
    }

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

    // Notify all staff about new booking
    await ctx.scheduler.runAfter(0, internal.notifications.notifyAllStaff, {
      organizationId: ctx.organizationId,
      type: "new_booking" as const,
      title: "New Booking",
      message: `${customer.name} booked (${args.source}) for ${args.date} at ${formatMinutesShort(args.startTime)}`,
      appointmentId,
    });

    // Send booking confirmation email (async, non-blocking)
    await ctx.scheduler.runAfter(0, internal.email.sendBookingConfirmation, {
      appointmentId,
      organizationId: ctx.organizationId,
    });

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
    // Staff can only see their own appointments
    const isStaffOnly = ctx.member.role === "staff";
    const effectiveStaffId =
      isStaffOnly && ctx.staff?._id ? ctx.staff._id : args.staffId;

    let appointments: Doc<"appointments">[];
    if (effectiveStaffId) {
      const staffAppts = await ctx.db
        .query("appointments")
        .withIndex("by_staff_date", (q) =>
          q.eq("staffId", effectiveStaffId).eq("date", args.date),
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
 * Get appointments for a date range (enriched with customer, staff, services).
 * Useful for calendar week view.
 */
export const getByDateRange = orgQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    staffId: v.optional(v.id("staff")),
  },
  returns: v.array(appointmentWithDetailsValidator),
  handler: async (ctx, args) => {
    // Staff can only see their own appointments
    const isStaffOnly = ctx.member.role === "staff";
    const effectiveStaffId =
      isStaffOnly && ctx.staff?._id ? ctx.staff._id : args.staffId;

    const dates = getDatesBetween(args.startDate, args.endDate);
    const allAppts: Doc<"appointments">[] = [];

    for (const date of dates) {
      let dayAppts: Doc<"appointments">[];
      if (effectiveStaffId) {
        const staffAppts = await ctx.db
          .query("appointments")
          .withIndex("by_staff_date", (q) =>
            q.eq("staffId", effectiveStaffId).eq("date", date),
          )
          .collect();
        dayAppts = staffAppts.filter(
          (a) => a.organizationId === ctx.organizationId,
        );
      } else {
        dayAppts = await ctx.db
          .query("appointments")
          .withIndex("by_org_date", (q) =>
            q.eq("organizationId", ctx.organizationId).eq("date", date),
          )
          .collect();
      }
      allAppts.push(...dayAppts);
    }

    allAppts.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.startTime - b.startTime;
    });

    return Promise.all(allAppts.map((appt) => enrichAppointment(ctx, appt)));
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
    // Staff can only see their own appointments
    const isStaffOnly = ctx.member.role === "staff";
    if (isStaffOnly && ctx.staff?._id !== appointment.staffId) {
      return null;
    }
    return enrichAppointment(ctx, appointment);
  },
});

/**
 * Get appointments for a specific customer (for Activity tab).
 * Returns most recent first with staff name and services.
 */
export const getByCustomer = orgQuery({
  args: {
    customerId: v.id("customers"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("appointments"),
      date: v.string(),
      startTime: v.number(),
      endTime: v.number(),
      status: appointmentStatusValidator,
      staffName: v.string(),
      total: v.number(),
      paymentStatus: v.optional(
        v.union(
          v.literal("pending"),
          v.literal("paid"),
          v.literal("partial"),
          v.literal("refunded"),
        ),
      ),
      services: v.array(
        v.object({
          serviceName: v.string(),
          duration: v.number(),
          price: v.number(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    // Verify customer belongs to this org before fetching appointments
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.organizationId !== ctx.organizationId) {
      return [];
    }

    const maxResults = Math.min(args.limit ?? 50, 200);

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .take(maxResults);

    // Batch fetch staff names
    const staffIds = [
      ...new Set(
        appointments
          .map((a) => a.staffId)
          .filter((id): id is Id<"staff"> => id != null),
      ),
    ];
    const staffDocs = await Promise.all(staffIds.map((id) => ctx.db.get(id)));
    const staffMap = new Map(
      staffDocs
        .filter((s): s is NonNullable<typeof s> => s != null)
        .map((s) => [s._id, s.name]),
    );

    // Batch fetch appointment services
    const results = await Promise.all(
      appointments.map(async (apt) => {
        const apptServices = await ctx.db
          .query("appointmentServices")
          .withIndex("by_appointment", (q) => q.eq("appointmentId", apt._id))
          .collect();

        return {
          _id: apt._id,
          date: apt.date,
          startTime: apt.startTime,
          endTime: apt.endTime,
          status: apt.status,
          staffName: apt.staffId
            ? (staffMap.get(apt.staffId) ?? "Deleted staff")
            : "Deleted staff",
          total: apt.total,
          paymentStatus: apt.paymentStatus,
          services: apptServices.map((s) => ({
            serviceName: s.serviceName,
            duration: s.duration,
            price: s.price,
          })),
        };
      }),
    );

    return results;
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

    // Staff can only update their own appointments
    const isStaffOnly = ctx.member.role === "staff";
    if (isStaffOnly && ctx.staff?._id !== appointment.staffId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You can only update your own appointments",
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
    const appointmentEpoch = dateTimeToEpoch(
      appointment.date,
      appointment.startTime,
    );

    // Check-in: only allowed 15 minutes before appointment start
    if (args.status === "checked_in") {
      const fifteenMinBefore = appointmentEpoch - 15 * 60 * 1000;
      if (now < fifteenMinBefore) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message:
            "Check-in is only allowed 15 minutes before appointment time",
        });
      }
    }

    // No-show: only allowed after appointment start time
    if (args.status === "no_show") {
      if (now < appointmentEpoch) {
        throw new ConvexError({
          code: ErrorCode.VALIDATION_ERROR,
          message:
            "No-show can only be marked after the appointment start time",
        });
      }
    }
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.status === "confirmed") updates.confirmedAt = now;
    if (args.status === "checked_in") updates.checkedInAt = now;
    if (args.status === "completed") updates.completedAt = now;
    if (args.status === "no_show") updates.noShowAt = now;

    await ctx.db.patch(args.appointmentId, updates);

    // Notify on no_show
    if (args.status === "no_show" && appointment.staffId) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          organizationId: ctx.organizationId,
          recipientStaffId: appointment.staffId,
          type: "no_show" as const,
          title: "No-Show",
          message: `Customer did not show up for ${appointment.date} at ${formatMinutesShort(appointment.startTime)}`,
          appointmentId: args.appointmentId,
        },
      );
    }

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

    // Staff can only cancel their own appointments
    const isStaffOnly = ctx.member.role === "staff";
    if (isStaffOnly && ctx.staff?._id !== appointment.staffId) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You can only cancel your own appointments",
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

    // Notify assigned staff about cancellation
    if (appointment.staffId) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          organizationId: ctx.organizationId,
          recipientStaffId: appointment.staffId,
          type: "cancellation" as const,
          title: "Appointment Cancelled",
          message: `Appointment on ${appointment.date} at ${formatMinutesShort(appointment.startTime)} was cancelled`,
          appointmentId: args.appointmentId,
        },
      );
    }

    // Send cancellation email (async, non-blocking)
    await ctx.scheduler.runAfter(0, internal.email.sendCancellationEmail, {
      appointmentId: args.appointmentId,
      organizationId: ctx.organizationId,
    });

    return { success: true };
  },
});

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

    // Notify assigned staff about reschedule
    await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
      organizationId: ctx.organizationId,
      recipientStaffId: targetStaffId,
      type: "reschedule" as const,
      title: "Appointment Rescheduled",
      message: `Appointment moved to ${args.newDate} at ${formatMinutesShort(args.newStartTime)}`,
      appointmentId: appointment._id,
    });

    return { success: true };
  },
});

// =============================================================================
// User Appointment Actions (Authenticated)
// =============================================================================

/**
 * Get a single appointment for the authenticated user.
 * Verifies ownership via customer.userId. Enriched with org/staff/service IDs.
 */
export const getForUser = authedQuery({
  args: { appointmentId: v.id("appointments") },
  returns: v.union(userAppointmentDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;

    // Verify ownership via customer record
    const customer = await ctx.db.get(appointment.customerId);
    if (!customer || customer.userId !== ctx.user._id) return null;

    const [org, staff] = await Promise.all([
      ctx.db.get(appointment.organizationId),
      appointment.staffId ? ctx.db.get(appointment.staffId) : null,
    ]);

    const apptServices = await ctx.db
      .query("appointmentServices")
      .withIndex("by_appointment", (q) =>
        q.eq("appointmentId", appointment._id),
      )
      .collect();

    return {
      _id: appointment._id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      confirmationCode: appointment.confirmationCode,
      staffName: staff?.name ?? "Deleted staff",
      staffImageUrl: staff?.imageUrl,
      staffId: appointment.staffId,
      total: appointment.total,
      organizationId: appointment.organizationId,
      organizationName: org?.name ?? "Unknown",
      organizationSlug: org?.slug ?? "",
      organizationLogo: org?.logo,
      customerNotes: appointment.customerNotes,
      cancelledAt: appointment.cancelledAt,
      rescheduleCount: appointment.rescheduleCount,
      services: apptServices.map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        duration: s.duration,
        price: s.price,
      })),
    };
  },
});

/**
 * Cancel an appointment as the authenticated user.
 * Identity via customer.userId — no phone verification needed.
 * Enforces 2-hour cancellation policy.
 */
export const cancelByUser = authedMutation({
  args: {
    appointmentId: v.id("appointments"),
    reason: v.optional(v.string()),
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

    // Rate limit (before ownership check to prevent enumeration)
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "cancelBooking", {
      key: appointment.organizationId,
    });
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Cancellation limit exceeded. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000)} seconds.`,
      });
    }

    // Verify ownership via customer record
    const customer = await ctx.db.get(appointment.customerId);
    if (!customer || customer.userId !== ctx.user._id) {
      throw new ConvexError({
        code: ErrorCode.FORBIDDEN,
        message: "You do not have permission to cancel this appointment",
      });
    }

    // Only allow cancellation of non-terminal statuses
    const terminalStatuses = ["completed", "cancelled", "no_show"];
    if (terminalStatuses.includes(appointment.status)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Cannot cancel a ${appointment.status} appointment`,
      });
    }

    // Enforce 2-hour cancellation policy
    const appointmentEpoch = dateTimeToEpoch(
      appointment.date,
      appointment.startTime,
    );
    const twoHoursBefore = appointmentEpoch - 2 * 60 * 60 * 1000;
    if (Date.now() > twoHoursBefore) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          "Appointments can only be cancelled at least 2 hours before the start time",
      });
    }

    const now = Date.now();
    await ctx.db.patch(appointment._id, {
      status: "cancelled",
      cancelledAt: now,
      cancelledBy: "customer",
      cancellationReason: args.reason,
      updatedAt: now,
    });

    // Notify assigned staff
    if (appointment.staffId) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          organizationId: appointment.organizationId,
          recipientStaffId: appointment.staffId,
          type: "cancellation" as const,
          title: "Customer Cancelled",
          message: `${customer.name} cancelled their appointment on ${appointment.date} at ${formatMinutesShort(appointment.startTime)}`,
          appointmentId: appointment._id,
        },
      );
    }

    // Send cancellation email
    await ctx.scheduler.runAfter(0, internal.email.sendCancellationEmail, {
      appointmentId: appointment._id,
      organizationId: appointment.organizationId,
    });

    return { success: true };
  },
});

/**
 * Reschedule an appointment as the authenticated user.
 * Identity via customer.userId — no phone verification needed.
 * Enforces 2-hour policy. Cannot change staff.
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

    // Rate limit (before ownership check to prevent enumeration)
    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "rescheduleBooking",
      { key: appointment.organizationId },
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

    // Enforce 2-hour policy
    const appointmentEpoch = dateTimeToEpoch(
      appointment.date,
      appointment.startTime,
    );
    const twoHoursBefore = appointmentEpoch - 2 * 60 * 60 * 1000;
    if (Date.now() > twoHoursBefore) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message:
          "Appointments can only be rescheduled at least 2 hours before the start time",
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

    // Notify assigned staff (staffId guaranteed non-null by guard above)
    if (appointment.staffId) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          organizationId: appointment.organizationId,
          recipientStaffId: appointment.staffId,
          type: "reschedule" as const,
          title: "Customer Rescheduled",
          message: `${customer.name} rescheduled to ${args.newDate} at ${formatMinutesShort(args.newStartTime)}`,
          appointmentId: appointment._id,
        },
      );
    }

    return { success: true };
  },
});

// =============================================================================
// Helpers
// =============================================================================

function formatMinutesShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
