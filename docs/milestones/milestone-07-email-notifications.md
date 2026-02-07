[PRD]

# Milestone 7: Email Notifications (Resend)

## Overview

Milestone7 integrates Resend for email notifications with React Email templates. Covers booking confirmations, reminders, cancellations, staff invitations, and payment failure alerts.

**Problem Statement:** Users need email notifications for important events (bookings, reminders, payment issues) to stay informed and reduce no-shows.

**Solution:** Resend integration with React Email templates, scheduler for 24-hour advance reminders, and webhook triggers for transactional emails.

## Goals

- Integrate Resend for email delivery
- Create React Email templates for all notification types
- Send booking confirmation immediately after creation
- Schedule 24-hour advance reminders
- Send cancellation notifications
- Send payment failure emails (Milestone6 integration)
- Include ICS calendar attachments for appointments

## Quality Gates

**Backend Stories (Convex):**

- `bunx convex dev` - Type generation
- `bun run lint` - Biome linting
- All email actions handle errors gracefully
- Email templates render correctly in preview

**Frontend Stories (React Email):**

- `bun run lint` - Biome linting on email templates
- Email preview in browser: `npm run email:dev` (if using React Email tooling)
- Test emails sent to real addresses (Gmail, Outlook)
- Responsive design tested on mobile

**Full-Stack Stories:**

- All backend + frontend quality gates
- Booking confirmation sent within 10 seconds
- Reminder scheduler runs daily at 09:00
- Email delivery rate >95% (Resend dashboard)

## Dependencies

**Requires completed:**

- Milestone4: Booking Operations (appointment lifecycle triggers)
- Milestone6: SaaS Billing (payment failure triggers)
- Milestone1.5: Invitations (invitation emails)

**Provides foundation for:**

- Milestone9: Customer Portal (magic link emails)

## User Stories

### US-023: Booking Confirmation Email

**Description:** As a customer, I want to receive an email confirmation after booking, so that I have a record of my appointment details.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [ ] Email sent immediately after appointment creation
- [ ] Email includes: Salon name/logo, Appointment date/time, Services, Staff name, Confirmation code, Cancellation link
- [ ] Email includes ICS calendar attachment
- [ ] Email is mobile-responsive
- [ ] Email uses organization's branding (logo from settings)
- [ ] Email sent to customer's email address (if provided)

**Technical Notes:**

- Files to create:
  - `convex/email.ts` - Resend action wrapper
  - `src/emails/BookingConfirmation.tsx` - React Email template
  - `convex/lib/ics.ts` - ICS file generator
- Trigger: After `appointments.create` mutation succeeds
- Use Convex action (external API call)
- Resend API: `emails.send`
- ICS format: `BEGIN:VCALENDAR...END:VCALENDAR`

### US-024: 24-Hour Advance Reminder

**Description:** As a customer, I want to receive a reminder 24 hours before my appointment, so that I don't forget.

**Complexity:** Medium

**Type:** Backend + Email Template

**Acceptance Criteria:**

- [ ] Reminder sent exactly 24 hours before appointment start time
- [ ] Reminder includes: Appointment details, Reschedule link, Cancellation link
- [ ] Scheduler runs daily at 09:00 UTC
- [ ] Scheduler finds all appointments starting in 24 hours
- [ ] No reminder sent for cancelled/completed appointments
- [ ] Failed sends are retried (up to 3 attempts)

**Technical Notes:**

- Files to create:
  - `src/emails/Reminder.tsx` - React Email template
  - `convex/schedulers.ts` - Reminder scheduler
  - `convex/crons.ts` - Add daily cron job
- Cron schedule: `0 9 * * *` (09:00 UTC daily)
- Query: `startTime BETWEEN now()+23h AND now()+25h`
- Store sent reminder IDs to prevent duplicates

### US-028: Cancellation Email

**Description:** As a customer, I want to receive an email when my appointment is cancelled, so that I'm aware of the change.

**Complexity:** Low

**Type:** Email Template

**Acceptance Criteria:**

- [ ] Email sent when appointment status changes to "cancelled"
- [ ] Email includes: Cancellation reason (if provided), Original appointment details, "Book again" link
- [ ] Email tone is empathetic and helpful
- [ ] Email sent to customer and staff member

**Technical Notes:**

- Files to create:
  - `src/emails/Cancellation.tsx` - React Email template
- Trigger: After `appointments.cancel` mutation succeeds
- Send to both customer and assigned staff

### US-029: Staff Invitation Email

**Description:** As a staff member, I want to receive an email invitation when added to an organization, so that I can accept and join.

**Complexity:** Low

**Type:** Email Template (already implemented in Milestone1.5, enhance with React Email)

**Acceptance Criteria:**

- [ ] Email sent when invitation is created
- [ ] Email includes: Organization name/logo, Inviter name, Accept/decline links, Expiration date
- [ ] Accept link includes invitation token
- [ ] Email uses React Email template (migrate from existing)

**Technical Notes:**

- Files to modify:
  - `convex/invitations.ts` - Replace email sending with React Email
- Files to create:
  - `src/emails/StaffInvitation.tsx` - React Email template
- Accept link: `{SITE_URL}/invitations/accept?token={token}`

### US-044: Payment Failure Email

**Description:** As a salon owner, I want to receive an email when subscription payment fails, so that I can update my payment method.

**Complexity:** Low

**Type:** Email Template

**Acceptance Criteria:**

- [ ] Email sent when `payment.failed` webhook received
- [ ] Email includes: Failure reason, Grace period end date, "Update payment" link (Polar portal)
- [ ] Email sent on Day 1, 3, 5, 7 of grace period
- [ ] Email tone is urgent but professional

**Technical Notes:**

- Files to create:
  - `src/emails/PaymentFailed.tsx` - React Email template
- Trigger: Milestone6 webhook handler + grace period cron
- Link to Polar customer portal (from Milestone6)

## Functional Requirements

- FR-7.1: All emails must be mobile-responsive
- FR-7.2: All emails must include organization logo (if set)
- FR-7.3: ICS attachments must include location (salon address)
- FR-7.4: Email retry logic: 3 attempts with exponential backoff
- FR-7.5: Reminder scheduler runs daily at 09:00 UTC
- FR-7.6: Email delivery tracking via Resend webhooks (optional)

## Non-Goals (Out of Scope)

- WhatsApp notifications (out of scope)
- Email customization/templates per organization (all use default)
- Email unsubscribe functionality (transactional emails exempt)
- Email analytics dashboard (use Resend dashboard)
- Multi-language emails (all English for MVP)

## Technical Considerations

### Resend Setup

- Environment variable: `RESEND_API_KEY`
- From address: `no-reply@yourdomain.com` (requires domain verification)
- Reply-to: Organization email (from settings)

### Email Template Best Practices

- Plain text fallback for all HTML emails
- Inline CSS (email clients don't support external styles)
- Max width: 600px (mobile-friendly)
- Avoid JavaScript (not supported)
- Test in Gmail, Outlook, Apple Mail

### ICS Calendar Format

```ics
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:appointment-{id}@yourdomain.com
DTSTAMP:{createdAt}
DTSTART:{startTime}
DTEND:{endTime}
SUMMARY:{serviceName}
LOCATION:{salonAddress}
DESCRIPTION:{serviceDescription}
END:VEVENT
END:VCALENDAR
```

### Scheduler Logic

- Run daily at 09:00 UTC (adjust for timezone)
- Find appointments: `startTime BETWEEN now()+23h AND now()+25h`
- Filter: `status IN ['pending', 'confirmed']`
- Store sent reminder IDs in `emailLogs` table

### Error Handling

- Resend API errors: Log and retry
- Invalid email addresses: Log but don't crash
- Missing customer email: Skip (phone-only customers)

## Success Metrics

- [ ] Email delivery rate >95% (Resend dashboard)
- [ ] Booking confirmation sent within 10 seconds
- [ ] Reminder open rate >40%
- [ ] Reminder click-through rate >20%
- [ ] Zero failed scheduler runs

## Implementation Order

1. **Resend Setup** (1 hour): Install SDK, configure API key, verify domain
2. **Email Action Wrapper** (1 hour): `convex/email.ts` with error handling
3. **React Email Templates** (4 hours): Create all 5 templates
4. **ICS Generator** (1 hour): `convex/lib/ics.ts`
5. **Booking Confirmation** (1 hour): Trigger from appointment creation
6. **Cancellation Email** (1 hour): Trigger from cancellation mutation
7. **Reminder Scheduler** (2 hours): Cron job + scheduler logic
8. **Payment Failure Email** (1 hour): Integrate with Milestone6 webhooks
9. **Staff Invitation** (1 hour): Migrate existing email to React Email
10. **Testing** (2 hours): Send test emails, verify delivery, check spam

## Open Questions

- **Q:** Should we send reminders for walk-in appointments?
  - **A:** No, walk-ins are created close to appointment time.

- **Q:** What if customer doesn't have an email?
  - **A:** Skip email sending (phone-only customers). Log skip event.

- **Q:** Should we send email to staff when assigned to appointment?
  - **A:** Not for MVP. Staff sees appointments in dashboard.

- **Q:** Should cancellation email include rebooking link?
  - **A:** Yes, link to public booking page with pre-filled salon slug.

[/PRD]
