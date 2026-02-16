# Milestone 7: Email Notifications (Resend)

**Status:** ✅ Complete | **User Stories:** 3

## Goals

- Resend integration with React Email templates
- Booking confirmation email with ICS attachment
- Cancellation notification (customer + staff)
- Staff invitation email (migrate to React Email)

## User Stories

### US-023: Booking Confirmation Email
- Sent immediately after appointment creation
- Includes: Salon name/logo, date/time, services, staff, confirmation code, cancel link
- ICS calendar attachment with location
- Mobile-responsive, org branding
- Files: `convex/email.tsx`, `src/emails/BookingConfirmation.tsx`, `convex/lib/ics.ts`

### ~~US-024: 24-Hour Advance Reminder~~ (Removed)
- **Removed:** Reminder emails were removed from the system. Only appointment creation and cancellation emails are sent.
- ~~Scheduler: daily at 09:00 UTC~~
- Removed files: `src/emails/Reminder24Hour.tsx`, `send24HourRemindersDaily` in `convex/email_helpers.ts`, `send24HourReminder` in `convex/email.tsx`, cron job in `convex/crons.ts`
- Schema fields removed: `reminderSentAt`, `emailReminderSentAt`
- `markReminderSent` mutation removed from `email_helpers.ts`

### US-028: Cancellation Email
- Sent on status -> "cancelled"
- Includes: Reason, original details, "Book again" link
- Sent to customer and staff
- Files: `src/emails/Cancellation.tsx`

### US-029: Staff Invitation Email
- Migrate existing invitation email to React Email
- Includes: Org name/logo, inviter, accept/decline links, expiry
- Files: `src/emails/StaffInvitation.tsx`

## Technical Notes

- Resend API key: `RESEND_API_KEY`
- From: `no-reply@yourdomain.com` (domain verification required)
- Reply-to: Organization email from settings
- Retry: 3 attempts with exponential backoff
- Skip if customer has no email (phone-only)

## Non-Goals

- Email customization per org, unsubscribe, multi-language
- **Reminder emails** - Removed; only booking confirmation and cancellation emails are sent
