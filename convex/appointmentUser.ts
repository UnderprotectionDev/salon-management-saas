/**
 * User-facing appointment operations (authenticated users).
 * Extracted from appointments.ts for single-responsibility.
 */
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { DELETED_STAFF } from "./appointments_helpers";
import { dateTimeToEpoch } from "./lib/dateTime";
import { MAX_USER_APPOINTMENTS } from "./lib/constants";
import { authedMutation, authedQuery, ErrorCode } from "./lib/functions";
import { rateLimiter } from "./lib/rateLimits";
import {
  userAppointmentDetailValidator,
  userAppointmentValidator,
} from "./lib/validators";

const UNKNOWN_ORG = "Unknown";

// =============================================================================
// User Appointment Queries
// =============================================================================

/**
 * List appointments for the currently authenticated user.
 * Finds customer records linked to the user's ID, then gets their appointments.
 */
export const listForCurrentUser = authedQuery({
  args: {},
  returns: v.array(userAppointmentValidator),
  handler: async (ctx) => {
    // Find customer records linked to this user (limit to 20 orgs)
    const customerRecords = await ctx.db
      .query("customers")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .take(20);

    if (customerRecords.length === 0) {
      return [];
    }

    // Gather appointments from all customer records (limit to 50 per customer)
    const allAppointments: Doc<"appointments">[] = [];
    for (const customer of customerRecords) {
      const appts = await ctx.db
        .query("appointments")
        .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
        .order("desc")
        .take(50);
      allAppointments.push(...appts);
    }

    // Sort by date desc, then startTime asc; cap at 100 for enrichment
    allAppointments.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      return dateCompare !== 0 ? dateCompare : a.startTime - b.startTime;
    });
    const cappedAppointments = allAppointments.slice(0, MAX_USER_APPOINTMENTS);

    // Batch fetch unique org and staff IDs
    const orgIds = [
      ...new Set(cappedAppointments.map((a) => a.organizationId)),
    ];
    const staffIds = [
      ...new Set(
        cappedAppointments
          .map((a) => a.staffId)
          .filter((id): id is Id<"staff"> => id != null),
      ),
    ];

    const [orgDocs, staffDocs, orgSettingsDocs] = await Promise.all([
      Promise.all(orgIds.map((id) => ctx.db.get(id))),
      Promise.all(staffIds.map((id) => ctx.db.get(id))),
      Promise.all(
        orgIds.map((id) =>
          ctx.db
            .query("organizationSettings")
            .withIndex("organizationId", (q) => q.eq("organizationId", id))
            .first(),
        ),
      ),
    ]);

    const orgMap = new Map(
      orgDocs
        .filter((o): o is NonNullable<typeof o> => o != null)
        .map((o) => [o._id, o]),
    );
    const staffMap = new Map(
      staffDocs
        .filter((s): s is NonNullable<typeof s> => s != null)
        .map((s) => [s._id, s]),
    );
    const policyMap = new Map(
      orgIds.map((id, i) => [
        id,
        orgSettingsDocs[i]?.bookingSettings?.cancellationPolicyHours ?? 24,
      ]),
    );

    // Batch fetch appointment services
    const allServices = await Promise.all(
      cappedAppointments.map((a) =>
        ctx.db
          .query("appointmentServices")
          .withIndex("by_appointment", (q) => q.eq("appointmentId", a._id))
          .collect(),
      ),
    );
    const servicesMap = new Map(
      cappedAppointments.map((a, i) => [a._id, allServices[i]]),
    );

    return cappedAppointments.map((appt) => {
      const org = orgMap.get(appt.organizationId);
      const staff = appt.staffId ? staffMap.get(appt.staffId) : null;
      const apptServices = servicesMap.get(appt._id) ?? [];

      return {
        _id: appt._id,
        date: appt.date,
        startTime: appt.startTime,
        endTime: appt.endTime,
        status: appt.status,
        confirmationCode: appt.confirmationCode,
        staffName: staff?.name ?? DELETED_STAFF,
        staffImageUrl: staff?.imageUrl,
        total: appt.total,
        organizationName: org?.name ?? UNKNOWN_ORG,
        organizationSlug: org?.slug ?? "",
        organizationLogo: org?.logo,
        services: apptServices.map((s) => ({
          serviceName: s.serviceName,
          duration: s.duration,
          price: s.price,
        })),
        cancellationPolicyHours: policyMap.get(appt.organizationId) ?? 24,
      };
    });
  },
});

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
      staffName: staff?.name ?? DELETED_STAFF,
      staffImageUrl: staff?.imageUrl,
      staffId: appointment.staffId,
      total: appointment.total,
      organizationId: appointment.organizationId,
      organizationName: org?.name ?? UNKNOWN_ORG,
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

// =============================================================================
// User Appointment Mutations
// =============================================================================

/**
 * Cancel an appointment as the authenticated user.
 * Identity via customer.userId — no phone verification needed.
 * Enforces cancellation policy.
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

    // Rate limit by user ID (not org) to prevent one user's cancellations
    // from affecting all customers in the organization
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "cancelBooking", {
      key: ctx.user._id,
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

    // Read cancellation policy from settings
    const orgSettings = await ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", appointment.organizationId),
      )
      .first();
    const cancellationPolicyHours =
      orgSettings?.bookingSettings?.cancellationPolicyHours ?? 24;
    const timezone = orgSettings?.timezone ?? "UTC";

    // Enforce cancellation policy
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
        message: `Appointments can only be cancelled at least ${cancellationPolicyHours} hours before the start time`,
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

    // Notifications & emails are handled automatically by triggers (convex/lib/triggers.ts)

    return { success: true };
  },
});
