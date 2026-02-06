[PRD]
# Sprint 9: Customer Portal

## Overview

Sprint 9 builds the customer-facing self-service portal with magic link authentication, appointment history, rescheduling, and cancellation capabilities.

**Problem Statement:** Customers need a way to view their appointments, reschedule, and cancel without contacting the salon, reducing administrative burden on staff.

**Solution:** Customer portal with passwordless magic link authentication, appointment history view, self-service rescheduling (with slot availability), and cancellation (respecting 2-hour policy).

## Goals

- Implement magic link authentication for customers
- Build appointment history page (active and past)
- Enable self-service rescheduling with slot selection
- Enable self-service cancellation (2-hour policy)
- Add "Book again" functionality for repeat visits
- Build customer profile settings page

## Quality Gates

**Backend Stories (Convex):**
- `bunx convex dev` - Type generation
- `bun run lint` - Biome linting
- All mutations use custom wrappers
- Magic link tokens are secure (crypto.randomBytes)
- Token expiration enforced (15-minute TTL)

**Frontend Stories (React/Next.js):**
- `bun run lint` - Biome linting
- `bun run build` - Production build verification
- Manual testing: Magic link login flow works
- Manual testing: Reschedule flow completes successfully

**Full-Stack Stories:**
- All backend + frontend quality gates
- Customer can log in via magic link
- Customer can view appointment history
- Customer can reschedule appointment (respecting 2-hour policy)
- Customer can cancel appointment (respecting 2-hour policy)

## Dependencies

**Requires completed:**
- Sprint 4: Booking Operations (appointment lifecycle, reschedule/cancel mutations)
- Sprint 7: Email Notifications (magic link email)
- Sprint 3: Booking Engine Core (slot availability for rescheduling)

**Provides foundation for:**
- Future customer features (loyalty programs, reviews) - v2.0

## User Stories

### US-026: Magic Link Authentication

**Description:** As a customer, I want to log in to the customer portal using a magic link sent to my email, so that I can access my appointments without a password.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Customer enters email or phone on login page
- [ ] System sends magic link email to customer's address
- [ ] Magic link includes secure token (UUID)
- [ ] Token expires after 15 minutes
- [ ] Clicking magic link logs customer in and redirects to portal home
- [ ] Invalid or expired token shows error message
- [ ] Customer session persists for 30 days (cookie)

**Technical Notes:**
- Files to create:
  - `convex/customerAuth.ts` - Magic link generation, validation
  - `src/app/[slug]/portal/login/page.tsx` - Login page
  - `src/emails/MagicLink.tsx` - React Email template
- Database: `magicLinkTokens` table with TTL index
- Token format: `crypto.randomUUID()` (36 characters)
- Magic link URL: `{SITE_URL}/{slug}/portal/auth?token={token}`
- Session: Store customerId in cookie (HttpOnly, Secure)
- Use Better Auth customer session (separate from staff auth)

### US-027: Appointment History

**Description:** As a customer, I want to view my past and upcoming appointments, so that I can keep track of my salon visits.

**Complexity:** Low

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Portal home page shows active appointments (upcoming + pending)
- [ ] Each appointment card shows: Date, Time, Service(s), Staff, Status, Confirmation code
- [ ] Active appointments have "Reschedule" and "Cancel" buttons
- [ ] Past appointments tab shows completed and cancelled appointments
- [ ] Past appointments have "Book Again" button
- [ ] Appointments are sorted by date (newest first)

**Technical Notes:**
- Files to create:
  - `convex/customers.ts` - Add `getAppointmentHistory` query
  - `src/app/[slug]/portal/appointments/page.tsx` - Appointments list
  - `src/modules/portal/components/AppointmentCard.tsx`
- Query: Filter by customerId, order by startTime DESC
- Split active (status IN ['pending', 'confirmed', 'checked_in']) vs past (status IN ['completed', 'cancelled', 'no_show'])

### US-027.1: Self-Service Rescheduling

**Description:** As a customer, I want to reschedule my appointment to a different time, so that I can accommodate changes in my schedule.

**Complexity:** High

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Clicking "Reschedule" opens reschedule modal
- [ ] Modal shows current appointment details
- [ ] Customer can select new date (30 days ahead)
- [ ] Customer can select new time slot (same service/duration)
- [ ] New slot availability uses same logic as initial booking (Sprint 3)
- [ ] Customer can select "any available staff" or keep same staff
- [ ] Rescheduling respects 2-hour policy (cannot reschedule within 2 hours of start)
- [ ] Confirming reschedule updates appointment and sends confirmation email

**Technical Notes:**
- Files to create:
  - `src/app/[slug]/portal/reschedule/[id]/page.tsx` - Reschedule flow
  - `src/modules/portal/components/RescheduleModal.tsx`
- Reuse slot availability query from Sprint 3
- Reuse `appointments.reschedule` mutation from Sprint 4
- Policy check: `startTime - now() >= 2 hours`

### US-027.2: Self-Service Cancellation

**Description:** As a customer, I want to cancel my appointment, so that I can free up the time slot if I cannot attend.

**Complexity:** Low

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Clicking "Cancel" opens confirmation dialog
- [ ] Dialog shows cancellation policy (2-hour rule)
- [ ] Dialog asks for optional cancellation reason
- [ ] Cancellation respects 2-hour policy (cannot cancel within 2 hours of start)
- [ ] Confirming cancellation updates appointment status and sends email
- [ ] Cancelled appointment disappears from active list, appears in past list

**Technical Notes:**
- Files to create:
  - `src/modules/portal/components/CancelModal.tsx`
- Reuse `appointments.cancel` mutation from Sprint 4
- Add `cancelledByCustomer` flag to distinguish from staff cancellations

### US-027.3: Book Again

**Description:** As a customer, I want to quickly rebook a past appointment, so that I can repeat a service I enjoyed.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] "Book Again" button on past appointments
- [ ] Clicking redirects to booking wizard with pre-filled service and staff
- [ ] Customer selects new date and time
- [ ] Customer confirms booking (reuses existing customer record)
- [ ] New appointment is created with same services and staff preference

**Technical Notes:**
- Files to modify:
  - `src/app/[slug]/book/page.tsx` - Accept query params for pre-fill
- Query params: `?services={ids}&staff={id}&customer={id}`
- Pre-fill steps 1-2, customer starts at step 3 (date selection)

### US-038: Customer Profile Settings

**Description:** As a customer, I want to update my contact information, so that I receive accurate communications.

**Complexity:** Low

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Customer can edit: Name, Phone, Email
- [ ] Changes update customer record in database
- [ ] Phone and email validation (same as booking flow)
- [ ] Profile page shows account info (creation date, total appointments)

**Technical Notes:**
- Files to create:
  - `src/app/[slug]/portal/profile/page.tsx` - Profile page
  - `convex/customers.ts` - Add `updateProfile` mutation
- Use TanStack Form + Zod validation
- Customer can only edit their own profile (check customerId)

## Functional Requirements

- FR-9.1: Magic link token TTL is 15 minutes
- FR-9.2: Customer session TTL is 30 days
- FR-9.3: Rescheduling respects 2-hour policy (same as cancellation)
- FR-9.4: "Book again" pre-fills services and staff from past appointment
- FR-9.5: Customer portal uses same URL structure: `/{slug}/portal/*`
- FR-9.6: Customer cannot access other customers' appointments (strict isolation)

## Non-Goals (Out of Scope)

- Customer reviews/ratings - v2.0
- Customer loyalty program - v2.0
- Customer payment methods storage - Post-MVP (requires PCI compliance)
- Notification preferences (opt-in/out) - Post-MVP
- Multiple profiles per email (family accounts) - v2.0
- Social login (Google, Facebook) - Post-MVP
- Two-factor authentication - Post-MVP

## Technical Considerations

### Authentication Architecture
- Separate auth system from staff (Better Auth customer component)
- Customer sessions use different cookie name: `customer_session`
- Customer context provider: `useCustomer()` hook
- Middleware checks customer session for `/portal/*` routes

### Security
- Magic link tokens are single-use (delete after login)
- Tokens are cryptographically secure (crypto.randomUUID)
- Customer can only access their own appointments (filter by customerId)
- Rate limiting on magic link generation (5/hour per email)

### URL Structure
```
/{slug}/portal/login           # Magic link entry
/{slug}/portal/auth?token=...  # Magic link validation
/{slug}/portal/appointments    # Appointment history
/{slug}/portal/reschedule/[id] # Reschedule flow
/{slug}/portal/profile         # Customer profile settings
```

### Email Integration
- Magic link email uses React Email template (Sprint 7)
- Send via Resend action
- Email subject: "Your login link for {Organization Name}"

## Success Metrics

- [ ] Magic link login success rate >90%
- [ ] Average time to reschedule <60 seconds
- [ ] Self-service cancellation rate >50% (vs calling salon)
- [ ] "Book again" conversion rate >30%
- [ ] Zero unauthorized access incidents (customer A accessing customer B's data)

## Implementation Order

1. **Magic Link Backend** (3 hours): Token generation, validation, customer session
2. **Magic Link Frontend** (2 hours): Login page, email template
3. **Customer Portal Layout** (1 hour): Portal-specific layout with navigation
4. **Appointment History Backend** (1 hour): Customer appointments query
5. **Appointment History Frontend** (2 hours): Active/past tabs, appointment cards
6. **Reschedule Flow** (3 hours): Slot selection, validation, confirmation
7. **Cancellation Flow** (1 hour): Modal, policy check, confirmation
8. **Book Again** (2 hours): Pre-fill query params, booking wizard integration
9. **Profile Settings** (2 hours): Edit form, validation, update mutation
10. **Testing** (2 hours): E2E customer flows, security testing

## Open Questions

- **Q:** Should magic link work multiple times or be single-use?
  - **A:** Single-use. Delete token after successful login.

- **Q:** What if customer email changes (phone-only to email)?
  - **A:** Allow customer to add email in profile settings.

- **Q:** Should we show staff notes in customer portal?
  - **A:** No, staff notes are internal only.

- **Q:** Should customer see pricing in portal?
  - **A:** Yes, show service prices and total appointment cost.

[/PRD]
