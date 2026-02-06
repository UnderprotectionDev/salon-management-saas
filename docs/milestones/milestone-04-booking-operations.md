[PRD]
# Sprint 4: Booking Engine - Operations

## Overview

Sprint 4 completes the booking system with operational workflows: online booking wizard for customers, walk-in quick booking for staff, check-in/checkout operations, cancellations, rescheduling, and no-show tracking.

**Problem Statement:** Appointments need full lifecycle management from creation through completion, with different flows for online customers vs walk-in clients.

**Solution:** Multi-step booking wizard with OTP verification, walk-in quick form for staff, and comprehensive appointment status management.

## Goals

- Complete 7-step online booking wizard with customer info collection
- Implement OTP verification for phone number validation
- Build walk-in quick booking form for staff
- Create check-in and checkout operations
- Implement cancellation with 2-hour policy
- Add no-show marking and rescheduling

## Quality Gates

**Backend Stories (Convex):**
- `bunx convex dev` - Type generation and schema validation
- `bun run lint` - Biome linting
- All mutations use custom wrappers
- All functions have `returns:` validators

**Frontend Stories (React/Next.js):**
- `bun run lint` - Biome linting
- `bun run build` - Production build verification
- Manual E2E testing of booking wizard (all 7 steps)
- OTP flow tested with valid/invalid codes

**Full-Stack Stories:**
- All backend + frontend quality gates
- Complete booking flow works end-to-end
- Walk-in booking creates appointment instantly
- Status transitions work correctly

## Dependencies

**Requires completed:**
- Sprint 3: Booking Engine Core (slot availability, appointment creation)
- Sprint 2: Customers (customer records)

**Provides foundation for:**
- Sprint 5: Dashboard (displays appointments with status)
- Sprint 7: Email Notifications (triggers on booking/cancellation)

## User Stories

### US-010: Online Booking Wizard

**Description:** As a customer, I want to book an appointment through a guided multi-step process, so that I can easily schedule my visit.

**Complexity:** High

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Step 1: Service selection (multi-select)
- [ ] Step 2: Staff selection (or "any available")
- [ ] Step 3: Date selection (calendar, 30 days ahead)
- [ ] Step 4: Time slot selection (grid view)
- [ ] Step 5: Customer information (name, phone, email)
- [ ] Step 6: OTP verification (phone)
- [ ] Step 7: Booking confirmation (appointment details + confirmation code)
- [ ] Progress indicator shows current step
- [ ] Back button allows navigation to previous steps
- [ ] Form state persists across steps (Zustand or React Context)
- [ ] Slot lock is created on step 4, released if user abandons

**Technical Notes:**
- Files to create:
  - `src/app/[slug]/book/page.tsx` - Wizard container
  - `src/modules/booking/components/BookingWizard.tsx` - Step orchestrator
  - `src/modules/booking/steps/` - Individual step components
  - `src/modules/booking/hooks/useBookingState.ts` - Form state management
- Existing patterns:
  - TanStack Form for customer info step
  - Zod validation for phone/email
  - shadcn/ui components (Stepper, Card, Button)
- Slot lock TTL reminder: Show countdown timer in step 5-6

### US-011: OTP Verification

**Description:** As a salon owner, I want to verify customer phone numbers via OTP, so that I can confirm appointment authenticity and reduce no-shows.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] System generates 6-digit OTP code when customer enters phone
- [ ] OTP is sent via SMS (mock for MVP, real SMS in Sprint 7 enhancement)
- [ ] OTP expires after 5 minutes
- [ ] Customer can request resend (max 3 attempts)
- [ ] Customer enters OTP in input field
- [ ] System validates OTP matches and is not expired
- [ ] Invalid OTP shows error message
- [ ] After 3 failed attempts, customer must restart
- [ ] Successful OTP verification transitions appointment from "pending" to "confirmed" status

**Technical Notes:**
- Files to create:
  - `convex/otp.ts` - OTP generation, validation, cleanup
  - `src/modules/booking/components/OTPInput.tsx` - 6-digit input
- For MVP: Log OTP to console (no real SMS)
- Database: `otpCodes` table with TTL index
- Rate limiting: `sendOTP` (5/hour per phone number)

### US-012: Walk-In Quick Booking

**Description:** As a staff member, I want to quickly book walk-in customers without the full wizard, so that I can handle in-person arrivals efficiently.

**Complexity:** Low

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Single-form view with all fields (customer, service, staff, time)
- [ ] Defaults: current staff, current time
- [ ] Customer lookup by phone (autocomplete)
- [ ] Creates customer if phone not found
- [ ] Creates appointment with status "confirmed" (skip pending)
- [ ] No OTP verification required
- [ ] Accessible from dashboard quick actions

**Technical Notes:**
- Files to create:
  - `src/modules/booking/components/WalkInForm.tsx`
  - `convex/appointments.ts` - Add `createWalkIn` mutation
- Use `orgMutation` (staff only)
- Auto-populate staff and time from context

### US-013: Reserved

> **Note:** US-013 is reserved for future booking-related features (e.g., appointment notes, custom fields). Numbering preserved for consistency.

### US-014: Check-In & Checkout

**Description:** As a staff member, I want to mark appointments as checked-in and completed, so that I can track appointment status throughout the day.

**Complexity:** Low

**Type:** Backend + UI

**Acceptance Criteria:**
- [ ] Staff can mark "confirmed" appointment as "checked_in"
- [ ] Staff can mark "checked_in" appointment as "completed"
- [ ] Check-in allowed 15 minutes before appointment
- [ ] Checkout records actual completion time
- [ ] Status transitions are validated (no skipping states)

**Technical Notes:**
- Files to modify:
  - `convex/appointments.ts` - Add `checkIn`, `checkOut` mutations
  - Add buttons to appointment detail modal
- Validators: Check appointment status before transition

### US-015: Cancellation & No-Show

**Description:** As a staff member or customer, I want to cancel appointments or mark no-shows, so that I can manage appointment lifecycle accurately.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Customer can cancel appointment up to 2 hours before start time
- [ ] Staff can cancel appointment at any time
- [ ] Cancellation shows confirmation dialog
- [ ] Cancelled appointment releases staff time slot
- [ ] Staff can mark appointment as "no_show" if customer doesn't arrive
- [ ] No-show can only be applied after appointment start time
- [ ] Cancellation reason is optional (free text)

**Technical Notes:**
- Files to modify:
  - `convex/appointments.ts` - Add `cancel`, `markNoShow` mutations
- Add `cancellationReason` field to appointments table
- Policy validation: 2-hour rule enforced in mutation

### US-025: Rescheduling

**Description:** As a customer or staff member, I want to reschedule an appointment to a different time/date, so that I can accommodate schedule changes.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Reschedule shows available slots for same service/staff combination
- [ ] New slot is validated for availability
- [ ] Original slot is released
- [ ] Appointment keeps same confirmation code
- [ ] Reschedule history is tracked (audit log)
- [ ] Customer can reschedule up to 2 hours before appointment
- [ ] Staff can reschedule at any time

**Technical Notes:**
- Files to create:
  - `convex/appointments.ts` - Add `reschedule` mutation
  - `src/modules/appointments/components/RescheduleModal.tsx`
- Reuse slot availability query from Sprint 3
- Add `rescheduledFrom` and `rescheduledTo` fields

## Functional Requirements

- FR-4.1: Appointment status flow: `pending → confirmed → checked_in → completed` (online bookings start at `pending`; walk-in bookings start at `confirmed`)
- FR-4.2: Alternative flows: `pending → cancelled`, `confirmed → no_show`
- FR-4.3: Cancellation policy: 2 hours before start time (customer), anytime (staff)
- FR-4.4: OTP expiration: 5 minutes
- FR-4.5: OTP resend limit: 3 attempts per phone number
- FR-4.6: Walk-in appointments bypass OTP verification
- FR-4.7: Rescheduling preserves confirmation code

## Non-Goals (Out of Scope)

- Real SMS sending (Sprint 7 integration, MVP uses console log)
- Email confirmation (Sprint 7)
- Customer payment/deposits (post-MVP)
- Recurring appointment booking (v2.0)
- Booking via customer portal (Sprint 9)

## Technical Considerations

### State Machine
```
pending ─────> confirmed ─────> checked_in ─────> completed
   │                │                 │
   └─> cancelled    └─> cancelled     └─> cancelled
                    └─> no_show
```

### OTP Security
- Store OTP as hashed value (bcrypt)
- Rate limit OTP generation and validation
- Cleanup expired OTPs via cron (every 10 minutes)

### Cancellation Policy
- Enforce 2-hour rule: `startTime - now() >= 2 hours`
- Staff override: Use `orgMutation` with elevated permissions to bypass policy for admin/owner roles

**Mutation Wrapper Definitions:**
- `orgMutation`: Organization-scoped operations with automatic membership verification
- `adminMutation`: Elevated admin/owner-only operations (e.g., staff management, sensitive settings)

## Success Metrics

- [ ] 95%+ successful booking completion rate (step 1 → 7)
- [ ] OTP verification success rate >90%
- [ ] Walk-in booking takes <30 seconds
- [ ] Zero race conditions in status transitions

## Implementation Order

1. **Booking Wizard** (4-5 hours): Build 7-step flow with state management
2. **OTP System** (2 hours): Backend + frontend integration (console log)
3. **Walk-In Form** (1-2 hours): Quick booking UI + mutation
4. **Status Operations** (2 hours): Check-in, checkout, cancel, no-show
5. **Rescheduling** (2 hours): Slot selection + mutation
6. **Testing** (2 hours): E2E flows, edge cases

## Open Questions

- **Q:** Should we save incomplete bookings (abandoned at step 3)?
  - **A:** No for MVP. User must restart if they abandon.

- **Q:** Should walk-in form allow past times?
  - **A:** Yes, for late check-ins. Validate not more than 4 hours ago.

[/PRD]
