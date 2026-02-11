import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export const triggers = new Triggers<DataModel>();

// =============================================================================
// Appointment Triggers
// =============================================================================
// Automatically send notifications and emails when appointments change.
// This replaces ~12 manual ctx.scheduler.runAfter() calls in appointments.ts.

triggers.register("appointments", async (ctx, change) => {
  const { operation, oldDoc, newDoc } = change;

  // -------------------------------------------------------------------------
  // INSERT → new_booking notification + confirmation email
  // -------------------------------------------------------------------------
  if (operation === "insert" && newDoc) {
    // Fetch customer name for notification message
    const customer = await ctx.db.get(newDoc.customerId);
    const customerName = customer?.name ?? "Customer";

    await ctx.scheduler.runAfter(0, internal.notifications.notifyAllStaff, {
      organizationId: newDoc.organizationId,
      type: "new_booking" as const,
      title: "New Booking",
      message: `${customerName} booked for ${newDoc.date} at ${formatMinutesShort(newDoc.startTime)}`,
      appointmentId: newDoc._id,
    });

    await ctx.scheduler.runAfter(0, internal.email.sendBookingConfirmation, {
      appointmentId: newDoc._id,
      organizationId: newDoc.organizationId,
    });
    return;
  }

  // -------------------------------------------------------------------------
  // UPDATE → status changes + reschedule
  // -------------------------------------------------------------------------
  if (operation === "update" && oldDoc && newDoc) {
    const statusChanged = oldDoc.status !== newDoc.status;

    // Cancelled
    if (statusChanged && newDoc.status === "cancelled") {
      const customer = await ctx.db.get(newDoc.customerId);
      const customerName = customer?.name ?? "Customer";
      const cancelledByLabel =
        newDoc.cancelledBy === "customer"
          ? `${customerName} cancelled`
          : "Appointment Cancelled";

      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          organizationId: newDoc.organizationId,
          recipientStaffId: newDoc.staffId,
          type: "cancellation" as const,
          title: cancelledByLabel,
          message: `Appointment on ${newDoc.date} at ${formatMinutesShort(newDoc.startTime)} was cancelled`,
          appointmentId: newDoc._id,
        },
      );

      await ctx.scheduler.runAfter(0, internal.email.sendCancellationEmail, {
        appointmentId: newDoc._id,
        organizationId: newDoc.organizationId,
      });
      return;
    }

    // Rescheduled (rescheduleCount increased)
    if ((newDoc.rescheduleCount ?? 0) > (oldDoc.rescheduleCount ?? 0)) {
      const customer = await ctx.db.get(newDoc.customerId);
      const customerName = customer?.name ?? "Customer";
      const rescheduledByCustomer =
        newDoc.rescheduleHistory?.at(-1)?.rescheduledBy === "customer";

      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          organizationId: newDoc.organizationId,
          recipientStaffId: newDoc.staffId,
          type: "reschedule" as const,
          title: rescheduledByCustomer
            ? "Customer Rescheduled"
            : "Appointment Rescheduled",
          message: `${customerName} rescheduled to ${newDoc.date} at ${formatMinutesShort(newDoc.startTime)}`,
          appointmentId: newDoc._id,
        },
      );
      return;
    }

    // No-show
    if (statusChanged && newDoc.status === "no_show") {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          organizationId: newDoc.organizationId,
          recipientStaffId: newDoc.staffId,
          type: "no_show" as const,
          title: "No-Show",
          message: `Customer did not show up for ${newDoc.date} at ${formatMinutesShort(newDoc.startTime)}`,
          appointmentId: newDoc._id,
        },
      );
    }
  }
});

// =============================================================================
// Helpers
// =============================================================================

function formatMinutesShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
