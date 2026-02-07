[PRD]

# Milestone 3: Booking Engine - Core ✅ COMPLETED

## Overview

Milestone 3 implements the heart of the application: the slot availability algorithm and appointment creation engine. This milestone focuses on the complex logic of finding available time slots based on staff schedules, existing appointments, and service durations.

**Problem Statement:** Customers need to see available time slots in real-time, considering staff working hours, existing bookings, and locked slots (other users currently booking).

**Solution:** Real-time slot availability algorithm with optimistic locking mechanism, appointment CRUD operations, and reactive updates using Convex subscriptions.

## Goals

- [x] Implement slot availability calculation algorithm
- [x] Create slot locking mechanism for concurrent booking prevention
- [x] Build appointment CRUD with multi-service support
- [x] Enable real-time slot updates across all clients
- [x] Generate unique confirmation codes for appointments

## Quality Gates

**Backend Stories (Convex):**

- `bunx convex dev` - Type generation and schema validation
- `bun run lint` - Biome linting (filter out `_generated/` errors)
- All mutations use custom wrappers from `convex/lib/functions.ts`
- All functions have `returns:` validators from `convex/lib/validators.ts`
- Algorithm correctness: Manual testing with multiple edge cases
- Concurrency testing: Simulate 2+ users booking same slot

**Frontend Stories (React/Next.js):**

- `bun run lint` - Biome linting
- `bun run build` - Production build verification
- Manual verification in browser (`bun run dev`)
- Real-time updates visible without page refresh
- Loading states during async operations

**Full-Stack Stories:**

- All backend quality gates
- All frontend quality gates
- End-to-end booking flow (service → staff → date → slot → confirm)
- Slot lock expiration verified (2-minute TTL)
- Concurrent booking prevention tested

## Dependencies

**Requires completed:**

- Milestone 2: Services (service catalog with durations)
- Milestone 2: Staff (staff schedules and service assignments)
- Milestone 2: Customers (customer records)

**Provides foundation for:**

- Milestone 4: Booking Operations (check-in, checkout, cancellation)
- Milestone 5: Calendar views and dashboard metrics

**Blocks:**

- Milestone 4 cannot start without appointment creation working
- Milestone 5 calendar requires appointment queries

## User Stories

### US-020: Available Slot Calculation ✅

**Description:** As a customer, I want to see available time slots for my selected service and date, so that I can choose a convenient appointment time.

**Complexity:** High

**Type:** Backend

**Acceptance Criteria:**

- [x] System calculates available slots based on service duration
- [x] System excludes slots where staff is already booked
- [x] System excludes slots where staff is not working (outside schedule)
- [x] System excludes slots locked by other users (active locks)
- [x] Slots are returned in 15-minute increments
- [x] System supports booking up to 30 days in advance
- [x] Slots are calculated for "any available staff" or specific staff
- [x] Multi-service bookings calculate slots for total combined duration

**Implementation Notes:**

- `convex/slots.ts` (206 lines) - `available` publicQuery
- `convex/lib/dateTime.ts` (78 lines) - `timeStringToMinutes`, `minutesToTimeString`, `formatTimeDisplay`, `addMinutes`, `isOverlapping`, `roundUpTo15`, `getTodayDateString`, `addDays`
- Algorithm: filters staff by service capability, resolves schedule (default + overrides + overtime), generates 15-min slots, filters conflicts with appointments and active locks
- Sorted by startTime then staffName
- `availableSlotValidator` returns: `{ staffId, staffName, staffImageUrl?, startTime, endTime }`

### US-021: Slot Locking Mechanism ✅

**Description:** As a customer, I want to temporarily lock my selected slot while filling out booking details, so that another user cannot book the same slot.

**Complexity:** Medium

**Type:** Backend

**Acceptance Criteria:**

- [x] Selecting a slot creates a lock (2-minute TTL)
- [x] Lock includes staffId, startTime, duration, organizationId
- [x] Lock is tied to user's session (anonymous identifier)
- [x] Locked slots don't appear as available for other users
- [x] Lock automatically expires after 2 minutes
- [x] Creating appointment removes the lock
- [x] User can cancel booking to release lock early
- [x] Cron job cleans up expired locks every minute

**Implementation Notes:**

- `convex/slotLocks.ts` (145 lines) - `acquire` (publicMutation), `release` (publicMutation), `cleanupExpired` (internalMutation)
- `convex/crons.ts` (14 lines) - runs `slotLocks.cleanupExpired` every 1 minute
- One lock per session; acquiring a new lock releases previous locks for same session
- 2-minute (120,000ms) TTL per lock
- Validates no conflicting locks or appointments before acquiring
- Indexes: `by_staff_date`, `by_expiry`, `by_session`

### US-022: Appointment Creation ✅

**Description:** As a customer, I want to create an appointment with my selected services, staff, and time slot, so that I can book my salon visit.

**Complexity:** High

**Type:** Backend

**Acceptance Criteria:**

- [x] Appointment includes customerId, organizationId, staffId, startTime, status
- [x] Appointment supports multiple services (junction table)
- [x] Appointment total duration is sum of service durations
- [x] Appointment generates unique 6-character confirmation code
- [x] Creating appointment validates slot is still available
- [x] Creating appointment removes associated slot lock
- [x] Creating appointment validates staff is assigned to selected services
- [x] Appointment creation is atomic (all or nothing)

**Implementation Notes:**

- `convex/appointments.ts` (1,223 lines as of M4) - 12 exported functions:
  - `create` (publicMutation) - public booking with customer info, slot lock validation
  - `createByStaff` (orgMutation) - staff-created bookings (walk-in, phone, staff)
  - `getByConfirmationCode` (publicQuery) - lookup by confirmation code
  - `listForCurrentUser` (authedQuery) - user's appointments across all orgs
  - `list` (orgQuery) - org appointment list with optional status filter
  - `get` (orgQuery) - single appointment with full details
  - `getByDate` (orgQuery) - appointments for a specific date
  - `updateStatus` (orgMutation) - status transitions with validation
  - `cancel` (orgMutation) - cancellation with reason and cancelledBy
  - `cancelByCustomer` (publicMutation) - customer self-service cancel (M4)
  - `reschedule` (orgMutation) - staff reschedule with history (M4)
  - `rescheduleByCustomer` (publicMutation) - customer self-service reschedule (M4)
- `convex/appointmentServices.ts` (54 lines) - `createForAppointment` (internalMutation), `getByAppointment` (orgQuery)
- `convex/lib/confirmation.ts` (40 lines) - `generateConfirmationCode()`, `ensureUniqueCode(db, orgId)`
- Confirmation code: 6 chars, uppercase alphanumeric, excludes 0/O/I/1
- Public booking auto-creates or updates customers; validates Turkish phone
- Status transitions: pending→confirmed, confirmed→checked_in, checked_in→in_progress, in_progress→completed (any→no_show/cancelled)
- Completion/no-show auto-updates customer stats (visits, spending, no-shows)
- Rate limited: `createBooking`, `cancelBooking`

### US-031: Real-Time Slot Updates ✅

**Description:** As a customer, I want to see slot availability update in real-time as other users book, so that I don't select a slot that just became unavailable.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Slot grid updates automatically when appointment is created by another user
- [x] Slot grid updates automatically when slot lock is created/expires
- [x] Updates happen without page refresh
- [x] Loading state shows during slot recalculation
- [x] User sees notification if their selected slot becomes unavailable

**Implementation Notes:**

- Frontend: 15 files in `src/modules/booking/` (1,667 lines total)
- Key components: `CreateAppointmentDialog.tsx` (275), `AppointmentList.tsx` (200), `BookingSummary.tsx` (197), `TimeSlotGrid.tsx` (141), `BookingForm.tsx` (119), `BookingConfirmation.tsx` (113), `ServiceSelector.tsx` (110), `DatePicker.tsx` (94), `CancelAppointmentDialog.tsx` (89), `UpdateStatusDropdown.tsx` (83), `StaffSelector.tsx` (63), `AppointmentStatusBadge.tsx` (26)
- Hook: `useBookingFlow.ts` (110 lines) - manages multi-step booking state
- Real-time updates via Convex `useQuery(api.slots.available, {...})`
- Route restructuring: `[slug]/(authenticated)/` for staff pages, `[slug]/(public)/` for booking pages
- Public booking page: `/:slug/book` (no auth required)
- Confirmation page: `/:slug/appointment/:code` (no auth required)
- Salon directory home page at `/` with `organizations.listPublic`
- User dashboard with "My Appointments" via `appointments.listForCurrentUser`

## Functional Requirements

### Slot Availability

- FR-3.1: ✅ Slots calculated in 15-minute increments
- FR-3.2: ✅ Slot duration matches total service duration (rounded up to next 15min via `roundUpTo15`)
- FR-3.3: ✅ Buffer time between appointments (0 minutes for MVP)
- FR-3.4: ✅ Slots respect staff working hours from schedule resolver
- FR-3.5: ✅ Booking window limited to 30 days in advance

### Slot Locking

- FR-3.6: ✅ Lock TTL is 2 minutes (120,000ms)
- FR-3.7: ✅ Lock cleanup cron runs every 1 minute
- FR-3.8: ✅ User can only hold one active lock at a time (per session)
- FR-3.9: ✅ Locks are anonymous (no authentication required) - uses `publicMutation`

### Appointment Creation

- FR-3.10: ✅ Initial appointment status is "pending" (online) or "confirmed" (staff-created)
- FR-3.11: ✅ Confirmation code is unique within organization (via `ensureUniqueCode`)
- FR-3.12: ✅ Appointment includes calculated `endTime` (startTime + total duration)
- FR-3.13: ✅ Slot lock verified and released atomically during creation

## Non-Goals (Out of Scope)

- ~~Customer authentication (Milestone 9 - Customer Portal)~~ → Partially addressed: `listForCurrentUser` for authed users
- Email confirmation (Milestone 7 - Email Notifications)
- Payment collection (out of scope)
- Recurring appointments (out of scope)
- Waitlist management (out of scope)
- Group bookings (out of scope)
- Appointment reminders (Milestone 7)
- Buffer time configuration (hardcoded to 0 for MVP)
- Different staff per service in multi-service bookings (single staff per appointment in M3)

## Success Metrics

### Milestone 3 Completion Criteria

- [x] Slot availability query returns correct slots for all test cases
- [x] Slot locking prevents double-booking in concurrent scenario
- [x] Appointment creation succeeds with valid data
- [x] Appointment creation fails with validation errors for invalid data
- [x] Real-time updates visible when testing with 2 browser windows
- [x] Cron job cleans up expired locks successfully

## Completion Summary

### Files Created

**Backend (7 new files):**

| File                            | Lines | Purpose                                                                                                                        |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| `convex/appointments.ts`        | 801   | Appointment CRUD: create, createByStaff, list, get, getByDate, getByConfirmationCode, listForCurrentUser, updateStatus, cancel |
| `convex/slots.ts`               | 206   | Slot availability algorithm (publicQuery)                                                                                      |
| `convex/slotLocks.ts`           | 145   | Slot lock acquire/release/cleanup                                                                                              |
| `convex/appointmentServices.ts` | 54    | Appointment-service junction table operations                                                                                  |
| `convex/crons.ts`               | 14    | Scheduled job: cleanup expired slot locks every 1 minute                                                                       |
| `convex/lib/confirmation.ts`    | 40    | Confirmation code generator (6-char, unique per org)                                                                           |
| `convex/lib/dateTime.ts`        | 78    | Date/time utilities: timeStringToMinutes, isOverlapping, roundUpTo15, etc.                                                     |

**Frontend (15 new files in `src/modules/booking/`):**

| File                          | Lines | Purpose                                  |
| ----------------------------- | ----- | ---------------------------------------- |
| `CreateAppointmentDialog.tsx` | 275   | Main booking dialog with multi-step flow |
| `AppointmentList.tsx`         | 200   | Display appointments with filters        |
| `BookingSummary.tsx`          | 197   | Order review before confirmation         |
| `TimeSlotGrid.tsx`            | 141   | 15-minute slot grid visualization        |
| `BookingForm.tsx`             | 119   | Customer info form                       |
| `BookingConfirmation.tsx`     | 113   | Confirmation screen with code            |
| `useBookingFlow.ts`           | 110   | Custom hook managing booking state       |
| `ServiceSelector.tsx`         | 110   | Multi-select service picker              |
| `DatePicker.tsx`              | 94    | Calendar date selection                  |
| `CancelAppointmentDialog.tsx` | 89    | Cancel appointment form                  |
| `UpdateStatusDropdown.tsx`    | 83    | Status change UI                         |
| `StaffSelector.tsx`           | 63    | Staff member picker                      |
| `AppointmentStatusBadge.tsx`  | 26    | Status display badge                     |
| `lib/constants.ts`            | 29    | Booking constants                        |
| `index.ts`                    | 18    | Module exports                           |

**New Public APIs (added to existing files):**

- `organizations.listPublic` (publicQuery) - salon directory
- `services.listPublic` (publicQuery) - public service listing
- `staff.listPublicActive` (publicQuery) - public staff listing
- `customers.linkToCurrentUser` (authedMutation) - link guest to auth user

**Route Restructuring:**

- `src/app/[slug]/(authenticated)/` - dashboard, appointments, customers, staff, services, settings
- `src/app/[slug]/(public)/` - book, appointment/[code]
- Salon directory home page at `/`
- User dashboard with "My Appointments"

**New Validators in `convex/lib/validators.ts` (~716 lines, up from ~400):**

- `appointmentStatusValidator`, `appointmentSourceValidator`, `cancelledByValidator`, `paymentStatusValidator`
- `appointmentDocValidator`, `appointmentServiceDocValidator`, `slotLockDocValidator`
- `availableSlotValidator`, `publicAppointmentValidator`, `userAppointmentValidator`, `appointmentWithDetailsValidator`

### Deviations from Original Plan

1. **Single staff per appointment** - Multi-service bookings use one staff member for all services (not different staff per service as originally planned).
3. **Staff-created bookings added** - `createByStaff` (orgMutation) was not in original plan but implemented for walk-in, phone, and staff-initiated bookings.
4. **Public APIs added** - `listPublic` queries for organizations, services, staff were added to support the unauthenticated booking flow.
5. **Route group restructuring** - Flat `[slug]/` routes reorganized into `(authenticated)` and `(public)` route groups.
6. **Salon directory** - Home page (`/`) now shows a public salon directory listing.
7. **User appointments** - `listForCurrentUser` allows authenticated users to see their appointments across all organizations.

[/PRD]
