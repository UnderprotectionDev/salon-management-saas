import { Triggers } from "convex-helpers/server/triggers";
import { internal } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { formatMinutesShort } from "./dateTime";

export const triggers = new Triggers<DataModel>();

// =============================================================================
// Appointment Triggers
// =============================================================================
// Automatically send notifications and emails when appointments change.
// All notification/email logic lives here — mutations should NOT call
// ctx.scheduler.runAfter() for notifications directly.

triggers.register("appointments", async (ctx, change) => {
  const { operation, oldDoc, newDoc } = change;

  // -------------------------------------------------------------------------
  // INSERT → new_booking notification + confirmation email
  // -------------------------------------------------------------------------
  if (operation === "insert" && newDoc) {
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

    // Confirmed (pending → confirmed)
    if (statusChanged && newDoc.status === "confirmed") {
      const customer = await ctx.db.get(newDoc.customerId);
      const customerName = customer?.name ?? "Customer";

      if (newDoc.staffId) {
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.createNotification,
          {
            organizationId: newDoc.organizationId,
            recipientStaffId: newDoc.staffId,
            type: "status_change" as const,
            title: "Appointment Confirmed",
            message: `${customerName}'s appointment on ${newDoc.date} at ${formatMinutesShort(newDoc.startTime)} has been confirmed`,
            appointmentId: newDoc._id,
          },
        );
      }
      return;
    }

    // Cancelled
    if (statusChanged && newDoc.status === "cancelled") {
      const customer = await ctx.db.get(newDoc.customerId);
      const customerName = customer?.name ?? "Customer";
      const cancelledByLabel =
        newDoc.cancelledBy === "customer"
          ? `${customerName} cancelled`
          : "Appointment Cancelled";

      if (newDoc.staffId) {
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
      }

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

      if (newDoc.staffId) {
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
      }
      return;
    }

    // No-show
    if (statusChanged && newDoc.status === "no_show" && newDoc.staffId) {
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
