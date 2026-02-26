/**
 * Shared helpers for appointment operations.
 * Extracted from appointments.ts to reduce file size and improve reusability.
 */
import { ConvexError } from "convex/values";
import { getAll } from "convex-helpers/server/relationships";
import type { Doc, Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";
import { isOverlapping, timeStringToMinutes } from "./lib/dateTime";
import { ErrorCode } from "./lib/functions";
import { resolveSchedule } from "./lib/scheduleResolver";

export const DELETED_CUSTOMER = "Deleted Customer";
export const DELETED_STAFF = "Deleted Staff";

/** Enrich a single appointment with linked customer, staff, and service data. */
export async function enrichAppointment(
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
    customerName: customer?.name ?? DELETED_CUSTOMER,
    customerPhone: customer?.phone ?? "",
    customerEmail: customer?.email,
    staffName: staff?.name ?? DELETED_STAFF,
    staffImageUrl: staff?.imageUrl,
    services: apptServices.map((s) => ({
      serviceId: s.serviceId,
      serviceName: s.serviceName,
      duration: s.duration,
      price: s.price,
    })),
  };
}

/** Batch enrich appointments — avoids N+1 by pre-fetching all linked data into Maps. */
export async function batchEnrichAppointments(
  ctx: { db: DatabaseReader },
  appointments: Doc<"appointments">[],
) {
  if (appointments.length === 0) return [];

  const customerIds = [...new Set(appointments.map((a) => a.customerId))];
  const staffIds = [
    ...new Set(
      appointments
        .map((a) => a.staffId)
        .filter((id): id is Id<"staff"> => id != null),
    ),
  ];

  const [customerDocs, staffDocs] = await Promise.all([
    getAll(ctx.db, customerIds),
    getAll(ctx.db, staffIds),
  ]);

  const customerMap = new Map(
    customerDocs
      .filter((c): c is NonNullable<typeof c> => c != null)
      .map((c) => [c._id, c]),
  );
  const staffMap = new Map(
    staffDocs
      .filter((s): s is NonNullable<typeof s> => s != null)
      .map((s) => [s._id, s]),
  );

  const allServices = await Promise.all(
    appointments.map((a) =>
      ctx.db
        .query("appointmentServices")
        .withIndex("by_appointment", (q) => q.eq("appointmentId", a._id))
        .collect(),
    ),
  );
  const servicesMap = new Map(
    appointments.map((a, i) => [a._id, allServices[i]]),
  );

  return appointments.map((appt) => {
    const customer = customerMap.get(appt.customerId);
    const staff = appt.staffId ? staffMap.get(appt.staffId) : null;
    const apptServices = servicesMap.get(appt._id) ?? [];

    return {
      ...appt,
      customerName: customer?.name ?? DELETED_CUSTOMER,
      customerPhone: customer?.phone ?? "",
      customerEmail: customer?.email,
      staffName: staff?.name ?? DELETED_STAFF,
      staffImageUrl: staff?.imageUrl,
      services: apptServices.map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        duration: s.duration,
        price: s.price,
      })),
    };
  });
}

/**
 * Validate that a time slot is available for a staff member.
 * Checks: staff exists & active, working hours (unless skipped), no conflicting appointments.
 */
export async function validateSlotAvailability(
  ctx: { db: DatabaseReader },
  params: {
    staffId: Id<"staff">;
    date: string;
    startTime: number;
    endTime: number;
    excludeAppointmentId?: Id<"appointments">;
    skipScheduleCheck?: boolean;
  },
) {
  const {
    staffId,
    date,
    startTime,
    endTime,
    excludeAppointmentId,
    skipScheduleCheck,
  } = params;

  const staff = await ctx.db.get(staffId);
  if (!staff || staff.status !== "active") {
    throw new ConvexError({
      code: ErrorCode.NOT_FOUND,
      message: "Staff member not found or inactive",
    });
  }

  if (!skipScheduleCheck) {
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
      (w) => startTime >= w.start && endTime <= w.end,
    );
    if (!fitsInWindow) {
      throw new ConvexError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Selected time is outside staff working hours",
      });
    }
  }

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

/** Shared logic for confirmation code lookup. */
export async function lookupByConfirmationCode(
  ctx: { db: DatabaseReader },
  args: { organizationId: Id<"organization">; confirmationCode: string },
) {
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(args.confirmationCode)) {
    return null;
  }

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
}
