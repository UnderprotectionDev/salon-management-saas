[PRD]

# Milestone 4: Booking Engine - Operations ✅ COMPLETED

## Overview

Milestone 4 completes the booking system with operational workflows: online booking wizard for customers, walk-in quick booking for staff, check-in/checkout operations, cancellations, rescheduling, and no-show tracking.

**Problem Statement:** Appointments need full lifecycle management from creation through completion, with different flows for online customers vs walk-in clients.

**Solution:** Multi-step booking wizard, walk-in quick form for staff, and comprehensive appointment status management.

## Goals

- [x] Complete 5-step online booking wizard with customer info collection
- [x] Build walk-in quick booking form for staff
- [x] Create check-in and checkout operations
- [x] Implement cancellation with 2-hour policy (customer + staff)
- [x] Add no-show marking and rescheduling (staff + customer self-service)
- [x] Customer self-service cancel/reschedule via confirmation code + phone

## Quality Gates

**Backend Stories (Convex):**

- `bunx convex dev` - Type generation and schema validation
- `bun run lint` - Biome linting
- All mutations use custom wrappers
- All functions have `returns:` validators

**Frontend Stories (React/Next.js):**

- `bun run lint` - Biome linting
- `bun run build` - Production build verification
- Manual E2E testing of booking wizard (all 5 steps)

**Full-Stack Stories:**

- All backend + frontend quality gates
- Complete booking flow works end-to-end
- Walk-in booking creates appointment instantly
- Status transitions work correctly

## Dependencies

**Requires completed:**

- Milestone 3: Booking Engine Core (slot availability, appointment creation)
- Milestone 2: Customers (customer records)

**Provides foundation for:**

- Milestone 5: Dashboard (displays appointments with status)
- Milestone 7: Email Notifications (triggers on booking/cancellation)

## User Stories

### US-010: Online Booking Wizard

**Description:** As a customer, I want to book an appointment through a guided multi-step process, so that I can easily schedule my visit.

**Complexity:** High

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Step 1: Service selection (multi-select)
- [x] Step 2: Staff selection (or "any available")
- [x] Step 3: Date and time selection (calendar + time slot grid in same view)
- [x] Step 4: Customer information (name, phone, email)
- [x] Step 5: Booking confirmation (appointment details + confirmation code)
- [x] Progress indicator shows current step
- [x] Back button allows navigation to previous steps
- [x] Form state persists across steps (React state via `useBookingFlow` hook)
- [x] Slot lock is created on step 3, released if user abandons
- [x] Slot lock countdown timer shown during booking

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
- Slot lock TTL reminder: Show countdown timer in step 4

### US-011: Walk-In Quick Booking

**Description:** As a staff member, I want to quickly book walk-in customers without the full wizard, so that I can handle in-person arrivals efficiently.

**Complexity:** Low

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Single-form view with all fields (customer, service, staff, time)
- [x] Defaults: current staff, nearest quarter hour
- [x] Customer combobox with search by name/phone
- [x] Inline new customer creation (name, phone, email)
- [x] Creates appointment with status "confirmed" (skip pending)
- [x] Accessible from appointments page (admin/owner only)

**Technical Notes:**

- Files to create:
  - `src/modules/booking/components/WalkInForm.tsx`
  - `convex/appointments.ts` - Add `createWalkIn` mutation
- Use `orgMutation` (staff only)
- Auto-populate staff and time from context

### US-012: Reserved

> **Note:** US-012 is reserved for future booking-related features (e.g., appointment notes, custom fields). Numbering preserved for consistency.

### US-013: Check-In & Checkout

**Description:** As a staff member, I want to mark appointments as checked-in and completed, so that I can track appointment status throughout the day.

**Complexity:** Low

**Type:** Backend + UI

**Acceptance Criteria:**

- [x] Staff can update appointment status via dropdown (confirm, check-in, start service, complete)
- [x] Check-in allowed 15 minutes before appointment
- [x] No-show only allowed after appointment start time (frontend filters + backend validation)
- [x] Status transitions validated on backend (`updateStatus` orgMutation)
- [x] Completion/no-show auto-updates customer stats (totalVisits, totalSpent, noShowCount)

**Technical Notes:**

- Files to modify:
  - `convex/appointments.ts` - Add `checkIn`, `checkOut` mutations
  - Add buttons to appointment detail modal
- Validators: Check appointment status before transition

### US-014: Cancellation & No-Show

**Description:** As a staff member or customer, I want to cancel appointments or mark no-shows, so that I can manage appointment lifecycle accurately.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Customer can cancel appointment up to 2 hours before start time (`cancelByCustomer` publicMutation)
- [x] Staff can cancel appointment at any time (`cancel` orgMutation)
- [x] Cancellation shows confirmation dialog with optional reason
- [x] Cancelled appointment releases staff time slot
- [x] Staff can mark appointment as "no_show" (only shown after start time in UI)
- [x] No-show can only be applied after appointment start time (backend validation)
- [x] Cancellation reason is optional (free text)
- [x] Customer self-service cancel via confirmation code + phone verification

**Technical Notes:**

- Files to modify:
  - `convex/appointments.ts` - Add `cancel`, `markNoShow` mutations
- Add `cancellationReason` field to appointments table
- Policy validation: 2-hour rule enforced in mutation

### US-015: Rescheduling

**Description:** As a customer or staff member, I want to reschedule an appointment to a different time/date, so that I can accommodate schedule changes.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Reschedule shows available slots for same service/staff combination
- [x] New slot is validated for availability (`validateSlotAvailability` shared helper)
- [x] Original slot is released
- [x] Appointment keeps same confirmation code
- [x] Reschedule history tracked (`rescheduleHistory` array, `rescheduleCount`, `rescheduledAt`)
- [x] Customer can reschedule up to 2 hours before appointment (`rescheduleByCustomer` publicMutation)
- [x] Staff can reschedule at any time (`reschedule` orgMutation)
- [x] Optional staff change during reschedule (eligible staff filter)
- [x] Rate limited: `rescheduleBooking` (3/hour)

**Technical Notes:**

- Files to create:
  - `convex/appointments.ts` - Add `reschedule` mutation
  - `src/modules/appointments/components/RescheduleModal.tsx`
- Reuse slot availability query from Milestone3
- Add `rescheduledFrom` and `rescheduledTo` fields

## Functional Requirements

- FR-4.1: ✅ Appointment status flow: `pending → confirmed → checked_in → in_progress → completed` (online bookings start at `pending`; walk-in bookings start at `confirmed`)
- FR-4.2: ✅ Alternative flows: any active state → `cancelled`, any active state → `no_show` (after start time)
- FR-4.3: ✅ Cancellation policy: 2 hours before start time (customer), anytime (staff)
- FR-4.4: ✅ Rescheduling preserves confirmation code
- FR-4.5: ✅ Reschedule policy: 2 hours before start time (customer), anytime (staff)
- FR-4.6: ✅ Reschedule history tracked with from/to dates, times, and who rescheduled
- FR-4.7: ✅ Customer self-service identity: confirmation code + phone number verification
- FR-4.8: ✅ No-show can only be marked after appointment start time (frontend + backend)

## Non-Goals (Out of Scope)

- Email confirmation (Milestone7)
- Customer payment/deposits (out of scope)
- Recurring appointment booking (out of scope)
- Booking via customer portal (Milestone9)

## Technical Considerations

### State Machine

```
pending ─────> confirmed ─────> checked_in ─────> completed
   │                │                 │
   └─> cancelled    └─> cancelled     └─> cancelled
                    └─> no_show
```

### Cancellation Policy

- Enforce 2-hour rule: `startTime - now() >= 2 hours`
- Staff override: Use `orgMutation` with elevated permissions to bypass policy for admin/owner roles

**Mutation Wrapper Definitions:**

- `orgMutation`: Organization-scoped operations with automatic membership verification
- `adminMutation`: Elevated admin/owner-only operations (e.g., staff management, sensitive settings)

## Success Metrics

### Milestone 4 Completion Criteria

- [x] Online booking wizard works end-to-end (service → staff → date/time → info → confirm)
- [x] Walk-in booking creates appointment instantly via CreateAppointmentDialog
- [x] Status transitions work correctly with time-based validations
- [x] Customer self-service cancel/reschedule via confirmation code + phone
- [x] Reschedule history tracked and preserved
- [x] Rate limits enforced on booking, cancellation, and rescheduling
- [x] No race conditions in status transitions

## Completion Summary

### Backend Changes

**Modified files:**

| File | Lines | Changes |
|------|-------|---------|
| `convex/appointments.ts` | 1,223 | Added `cancelByCustomer`, `reschedule`, `rescheduleByCustomer` + shared `validateSlotAvailability()` helper + time validations for check-in/no-show |
| `convex/customers.ts` | 609 | Added `searchByPhone` orgQuery (phone prefix autocomplete) |
| `convex/lib/dateTime.ts` | 94 | Added `dateTimeToEpoch()` for policy time checks |
| `convex/lib/rateLimits.ts` | 179 | Added `rescheduleBooking` (3/hour) rate limit |
| `convex/lib/validators.ts` | 731 | Added `publicAppointmentValidator` fields: `source`, `staffId`, `customerPhone`, `cancelledAt`, `rescheduleCount`, `services[].serviceId` |
| `convex/staff.ts` | 447 | Added `listActive` orgQuery for eligible staff filtering |
| `convex/schema.ts` | 492 | Added `noShowAt`, `rescheduledAt`, `rescheduleCount`, `rescheduleHistory` fields to appointments |

**New exported functions (3):**

| Function | Wrapper | Purpose |
|----------|---------|---------|
| `appointments.cancelByCustomer` | `publicMutation` | Customer self-service cancel (confirmation code + phone + 2hr policy) |
| `appointments.reschedule` | `orgMutation` | Staff reschedule with optional staff change |
| `appointments.rescheduleByCustomer` | `publicMutation` | Customer self-service reschedule (confirmation code + phone + 2hr policy) |

**Total appointment functions: 12** (up from 9 in M3)

### Frontend Changes

**New files (4):**

| File | Lines | Purpose |
|------|-------|---------|
| `SlotLockCountdown.tsx` | 56 | Lock expiry countdown timer |
| `RescheduleDialog.tsx` | 211 | Staff reschedule dialog with date/time picker |
| `PublicCancelDialog.tsx` | 122 | Customer self-service cancel dialog |
| `PublicRescheduleDialog.tsx` | 202 | Customer self-service reschedule dialog |

**Modified files:**

| File | Lines | Changes |
|------|-------|---------|
| `CreateAppointmentDialog.tsx` | 459 | Customer combobox, inline new customer, phone autocomplete, default staff/time |
| `AppointmentList.tsx` | 222 | Reschedule/cancel buttons, appointment date/time props to status dropdown |
| `UpdateStatusDropdown.tsx` | 108 | No-show filtered for past appointments only (time-based check) |
| `TimeSlotGrid.tsx` | 150 | Slot lock integration |
| `DatePicker.tsx` | 92 | English locale (en-US) |
| `StaffSelector.tsx` | 64 | English text |
| `useBookingFlow.ts` | 116 | Booking state management |
| `index.ts` | 22 | New exports |

**Modified pages:**

| File | Lines | Changes |
|------|-------|---------|
| `[slug]/(public)/appointment/[code]/page.tsx` | 298 | Public cancel/reschedule dialogs |
| `[slug]/(public)/book/page.tsx` | 342 | Slot lock countdown |
| `[slug]/(authenticated)/appointments/page.tsx` | 58 | Search by confirmation code |
| `[slug]/(authenticated)/customers/[id]/page.tsx` | 301 | Customer detail updates |

**Booking module total: 16 files, ~1,824 lines** (up from 15 files, 1,667 lines in M3)

### Schema Changes

```typescript
// New fields added to appointments table
noShowAt: v.optional(v.number()),
rescheduledAt: v.optional(v.number()),
rescheduleCount: v.optional(v.number()),
rescheduleHistory: v.optional(v.array(v.object({
  fromDate: v.string(),
  fromStartTime: v.number(),
  fromEndTime: v.number(),
  toDate: v.string(),
  toStartTime: v.number(),
  toEndTime: v.number(),
  rescheduledBy: v.union(v.literal("customer"), v.literal("staff")),
  rescheduledAt: v.number(),
}))),
```

### Deviations from Original Plan

1. **Customer self-service** - Added `cancelByCustomer` and `rescheduleByCustomer` public mutations (not in original plan) for customer self-service via confirmation code + phone.
2. **No OTP verification** - Customer identity verified by confirmation code + phone match instead of OTP (deferred).
3. **Walk-in form as dialog** - `CreateAppointmentDialog` instead of separate `WalkInForm` component. Includes inline new customer creation.
4. **Unified status dropdown** - Single `UpdateStatusDropdown` component handles all transitions instead of separate check-in/checkout mutations.
5. **Time-based no-show filter** - Frontend filters out "No Show" option for future appointments to prevent validation errors.
6. **Reschedule rate limit** - Added `rescheduleBooking` (3/hour) rate limit not in original plan.

[/PRD]
