import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery } from "./_generated/server";
import {
  batchEnrichAppointments,
  enrichAppointment,
  lookupByConfirmationCode,
  validateSlotAvailability,
} from "./appointments_helpers";
import { ensureUniqueCode } from "./lib/confirmation";
import {
  DATE_FORMAT_REGEX,
  DEFAULT_APPOINTMENT_LIST_LIMIT,
  DELETED_STAFF,
  MAX_APPOINTMENT_LIST_LIMIT,
  MAX_CUSTOMER_NOTES_LENGTH,
  MAX_SERVICES_PER_APPOINTMENT,
} from "./lib/constants";
import {
  dateTimeToEpoch,
  getTodayDateString,
  validateDateString,
} from "./lib/dateTime";
import {
  authedMutation,
  ErrorCode,
  orgMutation,
  orgQuery,
  publicQuery,
} from "./lib/functions";
import { assertBelongsToOrg } from "./lib/helpers";
import { isValidTurkishPhone } from "./lib/phone";
import { rateLimiter } from "./lib/rateLimits";
import {
  appointmentSourceValidator,
  appointmentStatusValidator,
  appointmentWithDetailsValidator,
  cancelledByValidator,
  publicAppointmentValidator,
} from "./lib/validators";

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
    // 1. Rate limit (keyed by user ID, not org)
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "createBooking", {
      key: ctx.user._id,
    });
    if (!ok) {
      throw new ConvexError({
        code: ErrorCode.RATE_LIMITED,
        message: `Booking limit exceeded. Try again in ${Math.ceil((retryAfter ?? 60000) / 1000)} seconds.`,
      });
    }

    // 2. Validate inputs
    if (!DATE_FORMAT_REGEX.test(args.date)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid date format. Expected YYYY-MM-DD.",
      });
    }
    if (args.endTime <= args.startTime) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "End time must be after start time.",
      });
    }
    if (args.serviceIds.length > MAX_SERVICES_PER_APPOINTMENT) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: `Maximum ${MAX_SERVICES_PER_APPOINTMENT} services per appointment.`,
      });
    }
    if (
      args.customer.notes &&
      args.customer.notes.length > MAX_CUSTOMER_NOTES_LENGTH
    ) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Customer notes must be 500 characters or less.",
      });
    }

    // 3. Validate organization exists
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Organization not found.",
      });
    }

    // 4. Check subscription status — block if suspended or canceled
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

    // 5. Validate slot lock ownership
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

    // 6. Validate staff schedule + slot availability
    const staff = await validateSlotAvailability(ctx, {
      staffId: args.staffId,
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
    });

    // 7. Verify at least one service selected
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

    // 8. Find or create customer
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

    // 9. Fetch services for pricing
    const services = await Promise.all(
      args.serviceIds.map((id) => ctx.db.get(id)),
    );
    const validServices = services.filter(
      (s): s is Doc<"services"> => s !== null,
    );
    const subtotal = validServices.reduce((sum, s) => sum + s.price, 0);

    // 10. Generate confirmation code
    const confirmationCode = await ensureUniqueCode(
      ctx.db,
      args.organizationId,
    );

    // 11. Create appointment
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

    // 12. Create appointment service records
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

    // 13. Delete the slot lock
    await ctx.db.delete(myLock._id);

    // 14. Notifications & emails are handled automatically by triggers (convex/lib/triggers.ts)

    return { appointmentId, confirmationCode, customerId };
  },
});

/**
 * Look up an appointment by confirmation code (public).
 * Also available as rate-limited HTTP action at /api/appointments/by-confirmation.
 */
export const getByConfirmationCode = publicQuery({
  args: {
    organizationId: v.id("organization"),
    confirmationCode: v.string(),
  },
  returns: v.union(publicAppointmentValidator, v.null()),
  handler: async (ctx, args) => lookupByConfirmationCode(ctx, args),
});

/** Internal version for HTTP action rate limiting. */
export const _getByConfirmationCode = internalQuery({
  args: {
    organizationId: v.id("organization"),
    confirmationCode: v.string(),
  },
  returns: v.union(publicAppointmentValidator, v.null()),
  handler: async (ctx, args) => lookupByConfirmationCode(ctx, args),
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
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.array(appointmentWithDetailsValidator),
  handler: async (ctx, args) => {
    const isStaffOnly = ctx.member.role === "staff";
    const staffFilter = isStaffOnly ? ctx.staff?._id : undefined;

    // Validate date formats if provided
    if (args.startDate && !validateDateString(args.startDate)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid startDate format. Expected YYYY-MM-DD.",
      });
    }
    if (args.endDate && !validateDateString(args.endDate)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid endDate format. Expected YYYY-MM-DD.",
      });
    }

    // Default to last 90 days if no date range specified (prevents unbounded fetches)
    const todayStr = getTodayDateString("Europe/Istanbul");
    const endDate = args.endDate ?? todayStr;
    const startDate =
      args.startDate ??
      (() => {
        // Parse as local date components to avoid UTC offset mismatch
        const [year, month, day] = todayStr.split("-").map(Number);
        const d = new Date(year, month - 1, day);
        d.setDate(d.getDate() - 90);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })();

    let appointments: Doc<"appointments">[];

    if (isStaffOnly && staffFilter) {
      // Staff: fetch org range, then filter by staff in memory
      const orgAppts = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) =>
          q
            .eq("organizationId", ctx.organizationId)
            .gte("date", startDate)
            .lte("date", endDate),
        )
        .collect();
      appointments = orgAppts.filter(
        (a) =>
          a.staffId === staffFilter &&
          (!args.statusFilter || a.status === args.statusFilter),
      );
    } else if (args.statusFilter) {
      // Filter by status first, then date range in memory
      // (by_org_status index doesn't include date, so we still need bounded fetch)
      const statusFilter = args.statusFilter;
      const statusAppts = await ctx.db
        .query("appointments")
        .withIndex("by_org_status", (q) =>
          q.eq("organizationId", ctx.organizationId).eq("status", statusFilter),
        )
        .collect();
      appointments = statusAppts.filter(
        (a) => a.date >= startDate && a.date <= endDate,
      );
    } else {
      appointments = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) =>
          q
            .eq("organizationId", ctx.organizationId)
            .gte("date", startDate)
            .lte("date", endDate),
        )
        .collect();
    }

    // Sort by date desc, then startTime asc
    appointments.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      return dateCompare !== 0 ? dateCompare : a.startTime - b.startTime;
    });

    return batchEnrichAppointments(ctx, appointments);
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

    // Validate customer
    const customer = await ctx.db.get(args.customerId);
    assertBelongsToOrg(customer, ctx.organizationId, "Customer");

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

    const totalDuration = validServices.reduce((sum, s) => sum + s.duration, 0);
    const endTime = args.startTime + totalDuration;
    const subtotal = validServices.reduce((sum, s) => sum + s.price, 0);

    // Validate staff + conflict check (skip schedule check — staff can book outside hours)
    const staff = await validateSlotAvailability(ctx, {
      staffId: args.staffId,
      date: args.date,
      startTime: args.startTime,
      endTime,
      skipScheduleCheck: true,
    });

    // Verify staff belongs to this org
    if (staff.organizationId !== ctx.organizationId) {
      throw new ConvexError({
        code: ErrorCode.NOT_FOUND,
        message: "Staff not found or inactive",
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

    // Notifications & emails are handled automatically by triggers (convex/lib/triggers.ts)

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
    // Validate date format
    if (!validateDateString(args.date)) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid date format. Expected YYYY-MM-DD.",
      });
    }

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

    return batchEnrichAppointments(ctx, appointments);
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
    // Validate date formats
    if (
      !validateDateString(args.startDate) ||
      !validateDateString(args.endDate)
    ) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Invalid date format. Expected YYYY-MM-DD.",
      });
    }

    // Staff can only see their own appointments
    const isStaffOnly = ctx.member.role === "staff";
    const effectiveStaffId =
      isStaffOnly && ctx.staff?._id ? ctx.staff._id : args.staffId;

    // Single range query instead of per-day loop
    let allAppts: Doc<"appointments">[];
    if (effectiveStaffId) {
      // Fetch all org appointments in range, then filter by staffId in memory
      const orgAppts = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) =>
          q
            .eq("organizationId", ctx.organizationId)
            .gte("date", args.startDate)
            .lte("date", args.endDate),
        )
        .collect();
      allAppts = orgAppts.filter((a) => a.staffId === effectiveStaffId);
    } else {
      allAppts = await ctx.db
        .query("appointments")
        .withIndex("by_org_date", (q) =>
          q
            .eq("organizationId", ctx.organizationId)
            .gte("date", args.startDate)
            .lte("date", args.endDate),
        )
        .collect();
    }

    allAppts.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.startTime - b.startTime;
    });

    return batchEnrichAppointments(ctx, allAppts);
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

    const maxResults = Math.min(
      args.limit ?? DEFAULT_APPOINTMENT_LIST_LIMIT,
      MAX_APPOINTMENT_LIST_LIMIT,
    );

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
            ? (staffMap.get(apt.staffId) ?? DELETED_STAFF)
            : DELETED_STAFF,
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
    assertBelongsToOrg(appointment, ctx.organizationId, "Appointment");

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

    // No-show and status change notifications are handled by triggers (convex/lib/triggers.ts)

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
    assertBelongsToOrg(appointment, ctx.organizationId, "Appointment");

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

    // Notifications & emails are handled automatically by triggers (convex/lib/triggers.ts)

    return { success: true };
  },
});
