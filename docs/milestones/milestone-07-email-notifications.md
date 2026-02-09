# Milestone 7: Email Notifications (Resend)

**Status:** Pending | **User Stories:** 5

## Goals

- Resend integration with React Email templates
- Booking confirmation email with ICS attachment
- 24-hour advance reminder (daily cron at 09:00 UTC)
- Cancellation notification (customer + staff)
- Staff invitation email (migrate to React Email)
- Payment failure email (M6 integration)

## User Stories

### US-023: Booking Confirmation Email
- Sent immediately after appointment creation
- Includes: Salon name/logo, date/time, services, staff, confirmation code, cancel link
- ICS calendar attachment with location
- Mobile-responsive, org branding
- Files: `convex/email.ts`, `src/emails/BookingConfirmation.tsx`, `convex/lib/ics.ts`

### US-024: 24-Hour Advance Reminder
- Scheduler: daily at 09:00 UTC
- Finds appointments starting in 24h, status pending/confirmed
- Includes reschedule + cancel links
- Retry: up to 3 attempts
- Files: `src/emails/Reminder.tsx`, `convex/schedulers.ts`, `convex/crons.ts`

### US-028: Cancellation Email
- Sent on status → "cancelled"
- Includes: Reason, original details, "Book again" link
- Sent to customer and staff
- Files: `src/emails/Cancellation.tsx`

### US-029: Staff Invitation Email
- Migrate existing invitation email to React Email
- Includes: Org name/logo, inviter, accept/decline links, expiry
- Files: `src/emails/StaffInvitation.tsx`

### US-044: Payment Failure Email
- Sent on `payment.failed` webhook
- Includes: Failure reason, grace period end, "Update payment" link
- Sent on Day 1, 3, 5, 7 of grace period
- Files: `src/emails/PaymentFailed.tsx`

## Technical Notes

- Resend API key: `RESEND_API_KEY`
- From: `no-reply@yourdomain.com` (domain verification required)
- Reply-to: Organization email from settings
- Retry: 3 attempts with exponential backoff
- Skip if customer has no email (phone-only)

## Non-Goals

- WhatsApp notifications, email customization per org, unsubscribe, multi-language
