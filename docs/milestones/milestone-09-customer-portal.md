# Milestone 9: Customer Portal

**Status:** Pending | **User Stories:** 6

## Goals

- Magic link authentication for customers
- Appointment history (active + past)
- Self-service rescheduling with slot selection
- Self-service cancellation (2-hour policy)
- "Book again" for repeat visits
- Customer profile settings

## User Stories

### US-026: Magic Link Authentication
- Customer enters email/phone → magic link email
- Token: UUID, 15-min TTL, single-use
- Session: 30-day cookie (HttpOnly, Secure)
- Separate from staff auth (Better Auth customer component)
- URL: `/{slug}/portal/auth?token={token}`
- Rate limit: 5/hour per email
- Files: `convex/customerAuth.ts`, `src/app/[slug]/portal/login/page.tsx`, `src/emails/MagicLink.tsx`

### US-027: Appointment History
- Active tab: upcoming + pending appointments
- Past tab: completed + cancelled + no-show
- Each card: Date, Time, Services, Staff, Status, Confirmation code
- Active → "Reschedule" and "Cancel" buttons
- Past → "Book Again" button
- Files: `src/app/[slug]/portal/appointments/page.tsx`

### US-027.1: Self-Service Rescheduling
- Reschedule modal with current details
- New date (30 days ahead) + time slot selection
- Same slot availability logic as initial booking
- Optional: keep same staff or "any available"
- 2-hour policy enforced
- Reuses `appointments.reschedule` mutation

### US-027.2: Self-Service Cancellation
- Confirmation dialog with 2-hour policy notice
- Optional cancellation reason
- Reuses `appointments.cancel` mutation

### US-027.3: Book Again
- "Book Again" on past appointments
- Redirects to booking wizard with pre-filled service + staff
- Query params: `?services={ids}&staff={id}&customer={id}`
- Customer starts at step 3 (date & time)

### US-038: Customer Profile Settings
- Edit: Name, Phone, Email
- Phone/email validation (same as booking)
- Shows account info (creation date, total appointments)
- Customer can only edit own profile
- Files: `src/app/[slug]/portal/profile/page.tsx`

## URL Structure

```
/{slug}/portal/login           # Magic link entry
/{slug}/portal/auth?token=...  # Token validation
/{slug}/portal/appointments    # History
/{slug}/portal/reschedule/[id] # Reschedule flow
/{slug}/portal/profile         # Profile settings
```

## Non-Goals

- Reviews/ratings, loyalty program, payment storage, social login, 2FA, family accounts
