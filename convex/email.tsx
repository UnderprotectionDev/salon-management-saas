"use node";

import { render } from "@react-email/components";
import { v } from "convex/values";
import { Resend } from "resend";
import BookingConfirmation from "../src/emails/BookingConfirmation";
import Cancellation from "../src/emails/Cancellation";
import Reminder24Hour from "../src/emails/Reminder24Hour";
import StaffInvitation from "../src/emails/StaffInvitation";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// =============================================================================
// Helpers
// =============================================================================

function createResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
}

function getSiteUrl(): string {
  return process.env.SITE_URL || "http://localhost:3000";
}

async function sendEmailWithRetry(
  resend: Resend,
  params: {
    from: string;
    to: string[];
    subject: string;
    html: string;
  },
  maxRetries = 3,
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send(params);
      if (result.error) throw new Error(result.error.message);
      return { success: true };
    } catch (error) {
      if (attempt === maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) =>
        setTimeout(resolve, 2 ** (attempt - 1) * 1000),
      );
    }
  }
  // Unreachable: loop always returns on success or final attempt
  throw new Error("Unreachable: max retries exceeded");
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateReadable(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[month - 1]} ${day}, ${year}`;
}

function buildAddressString(
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null,
): string | undefined {
  if (!address) return undefined;
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postalCode,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

// =============================================================================
// Email Actions
// =============================================================================

/**
 * Send booking confirmation email to customer.
 * Called via ctx.scheduler.runAfter(0) from appointments.create/createByStaff.
 */
export const sendBookingConfirmation = internalAction({
  args: {
    appointmentId: v.id("appointments"),
    organizationId: v.id("organization"),
  },
  handler: async (ctx, args) => {
    // 1. Fetch appointment
    const appointment = await ctx.runQuery(
      internal.email_helpers.getAppointmentData,
      { appointmentId: args.appointmentId },
    );
    if (!appointment) {
      console.error(
        `[email] Appointment ${args.appointmentId} not found, skipping confirmation`,
      );
      return;
    }

    // 2. Skip if already sent (idempotency)
    if (appointment.confirmationSentAt) {
      console.log(
        `[email] Confirmation already sent for ${args.appointmentId}`,
      );
      return;
    }

    // 3. Fetch customer
    const customer = await ctx.runQuery(internal.email_helpers.getCustomer, {
      customerId: appointment.customerId,
    });
    if (!customer?.email) {
      console.log("[email] Skipping confirmation - customer has no email");
      return;
    }

    // 4. Fetch org + settings
    const org = await ctx.runQuery(internal.email_helpers.getOrganization, {
      organizationId: args.organizationId,
    });
    const orgSettings = await ctx.runQuery(
      internal.email_helpers.getOrganizationSettings,
      { organizationId: args.organizationId },
    );

    // 5. Fetch appointment services
    const services = await ctx.runQuery(
      internal.email_helpers.getAppointmentServices,
      { appointmentId: args.appointmentId },
    );

    // 6. Fetch staff
    const staff = await ctx.runQuery(internal.email_helpers.getStaff, {
      staffId: appointment.staffId,
    });

    const orgName = org?.name ?? "Salon";
    const orgSlug = org?.slug ?? "";
    const siteUrl = getSiteUrl();

    // 7. Render email
    const html = await render(
      <BookingConfirmation
        organizationName={orgName}
        organizationLogo={org?.logo}
        customerName={customer.name}
        confirmationCode={appointment.confirmationCode}
        date={formatDateReadable(appointment.date)}
        startTime={formatMinutesToTime(appointment.startTime)}
        endTime={formatMinutesToTime(appointment.endTime)}
        services={services.map((s) => ({
          name: s.serviceName,
          duration: s.duration,
          price: s.price,
        }))}
        staffName={staff?.name ?? "Staff"}
        total={appointment.total}
        customerNotes={appointment.customerNotes}
        viewUrl={`${siteUrl}/${orgSlug}/appointment/${appointment.confirmationCode}`}
        address={buildAddressString(orgSettings?.address)}
      />,
    );

    // 8. Send with retry
    const resend = createResendClient();
    const result = await sendEmailWithRetry(resend, {
      from: `${orgName} <${getFromEmail()}>`,
      to: [customer.email],
      subject: `Booking Confirmed - ${orgName}`,
      html,
    });

    // 9. Mark as sent
    if (result.success) {
      await ctx.runMutation(internal.email_helpers.markConfirmationSent, {
        appointmentId: args.appointmentId,
      });
    } else {
      console.error(`[email] Failed to send confirmation: ${result.error}`);
    }
  },
});

/**
 * Send 24-hour reminder email to customer.
 * Called from daily cron job via scheduler.
 */
export const send24HourReminder = internalAction({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.runQuery(
      internal.email_helpers.getAppointmentData,
      { appointmentId: args.appointmentId },
    );
    if (!appointment) return;

    // Skip if already sent (idempotency)
    if (appointment.reminderSentAt) {
      console.log(`[email] Reminder already sent for ${args.appointmentId}`);
      return;
    }

    // Skip if cancelled/completed
    if (
      appointment.status === "cancelled" ||
      appointment.status === "completed" ||
      appointment.status === "no_show"
    ) {
      return;
    }

    const customer = await ctx.runQuery(internal.email_helpers.getCustomer, {
      customerId: appointment.customerId,
    });
    if (!customer?.email) return;

    const org = await ctx.runQuery(internal.email_helpers.getOrganization, {
      organizationId: appointment.organizationId,
    });
    const services = await ctx.runQuery(
      internal.email_helpers.getAppointmentServices,
      { appointmentId: args.appointmentId },
    );
    const staff = await ctx.runQuery(internal.email_helpers.getStaff, {
      staffId: appointment.staffId,
    });

    const orgName = org?.name ?? "Salon";
    const orgSlug = org?.slug ?? "";
    const siteUrl = getSiteUrl();

    const html = await render(
      <Reminder24Hour
        organizationName={orgName}
        organizationLogo={org?.logo}
        customerName={customer.name}
        confirmationCode={appointment.confirmationCode}
        date={formatDateReadable(appointment.date)}
        startTime={formatMinutesToTime(appointment.startTime)}
        endTime={formatMinutesToTime(appointment.endTime)}
        services={services.map((s) => ({
          name: s.serviceName,
          duration: s.duration,
        }))}
        staffName={staff?.name ?? "Staff"}
        viewUrl={`${siteUrl}/${orgSlug}/appointment/${appointment.confirmationCode}`}
      />,
    );

    const resend = createResendClient();
    const result = await sendEmailWithRetry(resend, {
      from: `${orgName} <${getFromEmail()}>`,
      to: [customer.email],
      subject: `Reminder: Appointment Tomorrow at ${formatMinutesToTime(appointment.startTime)} - ${orgName}`,
      html,
    });

    if (result.success) {
      await ctx.runMutation(internal.email_helpers.markReminderSent, {
        appointmentId: args.appointmentId,
      });
    } else {
      console.error(`[email] Failed to send reminder: ${result.error}`);
    }
  },
});

/**
 * Send cancellation email to customer (and optionally staff).
 * Called from cancel mutation.
 */
export const sendCancellationEmail = internalAction({
  args: {
    appointmentId: v.id("appointments"),
    organizationId: v.id("organization"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.runQuery(
      internal.email_helpers.getAppointmentData,
      { appointmentId: args.appointmentId },
    );
    if (!appointment) return;

    const customer = await ctx.runQuery(internal.email_helpers.getCustomer, {
      customerId: appointment.customerId,
    });
    const org = await ctx.runQuery(internal.email_helpers.getOrganization, {
      organizationId: args.organizationId,
    });
    const services = await ctx.runQuery(
      internal.email_helpers.getAppointmentServices,
      { appointmentId: args.appointmentId },
    );
    const staff = await ctx.runQuery(internal.email_helpers.getStaff, {
      staffId: appointment.staffId,
    });

    const orgName = org?.name ?? "Salon";
    const orgSlug = org?.slug ?? "";
    const siteUrl = getSiteUrl();
    const serviceNames = services.map((s) => s.serviceName);
    const resend = createResendClient();

    // Send to customer if they have an email
    if (customer?.email) {
      const customerHtml = await render(
        <Cancellation
          organizationName={orgName}
          organizationLogo={org?.logo}
          recipientName={customer.name}
          recipientType="customer"
          appointmentDate={formatDateReadable(appointment.date)}
          appointmentTime={formatMinutesToTime(appointment.startTime)}
          services={serviceNames}
          cancelledBy={appointment.cancelledBy ?? "system"}
          cancellationReason={appointment.cancellationReason}
          bookAgainUrl={`${siteUrl}/${orgSlug}/book`}
        />,
      );

      const result = await sendEmailWithRetry(resend, {
        from: `${orgName} <${getFromEmail()}>`,
        to: [customer.email],
        subject: `Appointment Cancelled - ${orgName}`,
        html: customerHtml,
      });

      if (!result.success) {
        console.error(
          `[email] Failed to send cancellation to customer: ${result.error}`,
        );
      }
    }

    // Send to staff if they have an email
    if (staff?.email) {
      const staffHtml = await render(
        <Cancellation
          organizationName={orgName}
          organizationLogo={org?.logo}
          recipientName={staff.name}
          recipientType="staff"
          appointmentDate={formatDateReadable(appointment.date)}
          appointmentTime={formatMinutesToTime(appointment.startTime)}
          services={serviceNames}
          cancelledBy={appointment.cancelledBy ?? "system"}
          cancellationReason={appointment.cancellationReason}
        />,
      );

      const result = await sendEmailWithRetry(resend, {
        from: `${orgName} <${getFromEmail()}>`,
        to: [staff.email],
        subject: `Appointment Cancelled - ${orgName}`,
        html: staffHtml,
      });

      if (!result.success) {
        console.error(
          `[email] Failed to send cancellation to staff: ${result.error}`,
        );
      }
    }
  },
});

/**
 * Send staff invitation email.
 * Called from invitations.create mutation.
 */
export const sendInvitationEmail = internalAction({
  args: {
    invitationId: v.id("invitation"),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.runQuery(
      internal.email_helpers.getInvitation,
      { invitationId: args.invitationId },
    );
    if (!invitation) {
      console.error(`[email] Invitation ${args.invitationId} not found`);
      return;
    }

    const org = await ctx.runQuery(internal.email_helpers.getOrganization, {
      organizationId: invitation.organizationId,
    });

    // Get inviter name
    const inviter = await ctx.runQuery(internal.email_helpers.getUserName, {
      userId: invitation.invitedBy,
    });

    const orgName = org?.name ?? "Salon";
    const siteUrl = getSiteUrl();

    const html = await render(
      <StaffInvitation
        organizationName={orgName}
        organizationLogo={org?.logo}
        inviteeName={invitation.name}
        inviterName={inviter ?? "Team"}
        role={invitation.role}
        acceptUrl={`${siteUrl}/sign-in`}
        expiresInDays={
          invitation.expiresAt
            ? Math.max(
                1,
                Math.ceil(
                  (invitation.expiresAt - Date.now()) / (1000 * 60 * 60 * 24),
                ),
              )
            : 7
        }
      />,
    );

    const resend = createResendClient();
    const result = await sendEmailWithRetry(resend, {
      from: `${orgName} <${getFromEmail()}>`,
      to: [invitation.email],
      subject: `You're invited to join ${orgName}`,
      html,
    });

    if (!result.success) {
      console.error(`[email] Failed to send invitation email: ${result.error}`);
    }
  },
});
