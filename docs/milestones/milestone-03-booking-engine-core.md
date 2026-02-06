[PRD]
# Sprint 3: Booking Engine - Core

## Overview

Sprint 3 implements the heart of the application: the slot availability algorithm and appointment creation engine. This sprint focuses on the complex logic of finding available time slots based on staff schedules, existing appointments, and service durations.

**Problem Statement:** Customers need to see available time slots in real-time, considering staff working hours, existing bookings, and locked slots (other users currently booking).

**Solution:** Real-time slot availability algorithm with optimistic locking mechanism, appointment CRUD operations, and reactive updates using Convex subscriptions.

## Goals

- Implement slot availability calculation algorithm
- Create slot locking mechanism for concurrent booking prevention
- Build appointment CRUD with multi-service support
- Enable real-time slot updates across all clients
- Generate unique confirmation codes for appointments

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
- Sprint 2: Services (service catalog with durations)
- Sprint 2: Staff (staff schedules and service assignments)
- Sprint 2: Customers (customer records)

**Provides foundation for:**
- Sprint 4: Booking Operations (check-in, checkout, cancellation)
- Sprint 5: Calendar views and dashboard metrics

**Blocks:**
- Sprint 4 cannot start without appointment creation working
- Sprint 5 calendar requires appointment queries

## User Stories

### US-020: Available Slot Calculation

**Description:** As a customer, I want to see available time slots for my selected service and date, so that I can choose a convenient appointment time.

**Complexity:** High

**Type:** Backend

**Acceptance Criteria:**
- [ ] System calculates available slots based on service duration
- [ ] System excludes slots where staff is already booked
- [ ] System excludes slots where staff is not working (outside schedule)
- [ ] System excludes slots locked by other users (active locks)
- [ ] Slots are returned in 15-minute increments
- [ ] System supports booking up to 30 days in advance
- [ ] Slots are calculated for "any available staff" or specific staff
- [ ] Multi-service bookings calculate slots for total combined duration

**Technical Notes:**
- Files to create:
  - `convex/slots.ts` - Core availability algorithm
  - `convex/lib/dateTime.ts` - Date/time utility functions
- Algorithm steps:
  1. Get total duration of selected services
  2. Get staff working on selected date (from schedule)
  3. For each staff member:
     - Get working hours for that day
     - Subtract existing appointments (with buffer)
     - Subtract active slot locks
     - Calculate available gaps ≥ service duration
  4. Return as 15-minute slots with staff assignments
  5. Sort by time, then by staff
- Existing patterns:
  - Use `publicQuery` (customers not authenticated yet)
  - Add `availableSlotValidator` to `convex/lib/validators.ts`
  - Real-time subscription support (Convex handles automatically)
- Database queries:
  - `staff` table (filter by service assignment)
  - `appointments` table (filter by date range)
  - `slotLocks` table (filter by date, check TTL)
- Performance:
  - Add composite index: `appointments.by_organization_date`
  - Add index: `slotLocks.by_date_expiry`

### US-021: Slot Locking Mechanism

**Description:** As a customer, I want to temporarily lock my selected slot while filling out booking details, so that another user cannot book the same slot.

**Complexity:** Medium

**Type:** Backend

**Acceptance Criteria:**
- [ ] Selecting a slot creates a lock (2-minute TTL)
- [ ] Lock includes staffId, startTime, duration, organizationId
- [ ] Lock is tied to user's session (anonymous identifier)
- [ ] Locked slots don't appear as available for other users
- [ ] Lock automatically expires after 2 minutes
- [ ] Creating appointment removes the lock
- [ ] User can cancel booking to release lock early
- [ ] Cron job cleans up expired locks every minute

**Technical Notes:**
- Files to create:
  - `convex/slotLocks.ts` - Lock CRUD mutations
  - `convex/crons.ts` - Cleanup cron job
- Database:
  - Table: `slotLocks` (already in schema)
  - Fields: `organizationId`, `staffId`, `startTime`, `duration`, `lockId`, `expiresAt`
  - TTL: 2 minutes (120,000ms)
- Existing patterns:
  - Use `publicMutation` (customers not authenticated)
  - Use `internalMutation` for cleanup (cron only)
  - Generate `lockId` with crypto.randomUUID()
- Validators:
  - `slotLockDocValidator`
- Cron schedule:
  - Every 1 minute: Delete locks where `expiresAt < now()`

### US-022: Appointment Creation

**Description:** As a customer, I want to create an appointment with my selected services, staff, and time slot, so that I can book my salon visit.

**Complexity:** High

**Type:** Backend

**Acceptance Criteria:**
- [ ] Appointment includes customerId, organizationId, staffId, startTime, status
- [ ] Appointment supports multiple services (junction table)
- [ ] Appointment total duration is sum of service durations
- [ ] Appointment generates unique 6-character confirmation code
- [ ] Creating appointment validates slot is still available
- [ ] Creating appointment removes associated slot lock
- [ ] Creating appointment validates staff is assigned to selected services
- [ ] Appointment creation is atomic (all or nothing)

**Technical Notes:**
- Files to create:
  - `convex/appointments.ts` - Appointment CRUD
  - `convex/appointmentServices.ts` - Junction table operations
  - `convex/lib/confirmation.ts` - Confirmation code generator
- Database:
  - Table: `appointments` (main record)
  - Table: `appointmentServices` (many-to-many junction)
  - Indexes: `by_organization_date`, `by_staff_date`, `by_customer`
- Existing patterns:
  - Use `publicMutation` (customers not authenticated initially)
  - Use `orgQuery`/`orgMutation` for admin operations
  - Add validators: `appointmentDocValidator`, `appointmentServiceDocValidator`
- Confirmation code:
  - Format: 6 uppercase alphanumeric (e.g., "A3B7K9")
  - Exclude ambiguous characters (0, O, I, 1)
  - Must be unique within organization
- Validation logic:
  1. Check slot is not already booked
  2. Check staff is working at that time
  3. Check staff is assigned to all services
  4. Check slot lock exists (if coming from booking flow)
  5. Validate customer exists
  6. Verify organization is active (subscription check - Sprint 6)
- Rate limiting: `createAppointment` (10/hour per IP)

### US-031: Real-Time Slot Updates

**Description:** As a customer, I want to see slot availability update in real-time as other users book, so that I don't select a slot that just became unavailable.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Slot grid updates automatically when appointment is created by another user
- [ ] Slot grid updates automatically when slot lock is created/expires
- [ ] Updates happen without page refresh
- [ ] Loading state shows during slot recalculation
- [ ] User sees notification if their selected slot becomes unavailable

**Technical Notes:**
- Files to modify/create:
  - Frontend: Use Convex `useQuery` with automatic subscriptions
  - `src/modules/booking/hooks/useAvailableSlots.ts` - Custom hook
  - `src/modules/booking/components/TimeSlotGrid.tsx` - Reactive UI
- Existing patterns:
  - Convex automatically handles real-time subscriptions
  - Use `useQuery(api.slots.available, { date, serviceIds, staffId })`
  - React Compiler handles re-renders efficiently
- UI considerations:
  - Show loading spinner during refetch
  - Highlight selected slot in different color
  - Disable slot if it becomes locked/booked during selection
  - Toast notification: "This slot is no longer available"

## Functional Requirements

### Slot Availability
- FR-3.1: Slots must be calculated in 15-minute increments (09:00, 09:15, 09:30, etc.)
- FR-3.2: Slot duration must match total service duration (rounded up to next 15min)
- FR-3.3: System must enforce buffer time between appointments (0 minutes for MVP, configurable later)
- FR-3.4: Slots cannot span across staff break times (lunch, etc.)
- FR-3.5: Booking window is limited to 30 days in advance

### Slot Locking
- FR-3.6: Lock TTL is 2 minutes (120,000ms)
- FR-3.7: Lock cleanup cron runs every 1 minute
- FR-3.8: User can only hold one active lock at a time (per session)
- FR-3.9: Locks are anonymous (no authentication required)

### Appointment Creation
- FR-3.10: Initial appointment status is "pending"
- FR-3.11: Confirmation code is unique within organization
- FR-3.12: Appointment includes calculated `endTime` (startTime + duration)
- FR-3.13: Creating appointment is idempotent (duplicate prevention via confirmation code)

## Non-Goals (Out of Scope)

- Customer authentication (Sprint 9 - Customer Portal)
- Email confirmation (Sprint 7 - Email Notifications)
- Payment collection (post-MVP)
- Recurring appointments (v2.0)
- Waitlist management (v2.0)
- Group bookings (post-MVP)
- Appointment reminders (Sprint 7)
- Buffer time configuration (hardcoded to 0 for MVP)

## Technical Considerations

### Algorithm Complexity
- Slot calculation is O(n) where n = number of staff members
- For each staff: O(m) where m = number of appointments/locks
- Total: O(n * m) - acceptable for expected scale (<10 staff, <100 appointments/day)

### Concurrency & Race Conditions
- **Problem:** Two users selecting same slot simultaneously
- **Solution:** Slot locks + appointment validation on creation
- **Edge case:** Lock expires during form fill-out → show error, re-select slot

### Database Indexes
Required indexes for performance:
- `appointments.by_organization_date` (composite)
- `appointments.by_staff_date` (composite)
- `slotLocks.by_date_expiry` (composite)
- `staffServices.by_staff` (for service assignment check)

### Timezone Handling
- All times stored in UTC
- Display in organization's timezone (from `organizationSettings.timezone`)
- User selection is in organization's local time, converted to UTC for storage

### Performance Optimization
- Cache staff schedules (rarely change)
- Paginate appointment queries (limit to selected date ± 1 day)
- Debounce slot recalculation (300ms delay on date/service change)

## Success Metrics

### Sprint 3 Completion Criteria
- [ ] Slot availability query returns correct slots for all test cases
- [ ] Slot locking prevents double-booking in concurrent scenario
- [ ] Appointment creation succeeds with valid data
- [ ] Appointment creation fails with validation errors for invalid data
- [ ] Real-time updates visible when testing with 2 browser windows
- [ ] Cron job cleans up expired locks successfully

### Performance Targets
- Slot calculation: <1 second (for 5 staff, 50 appointments)
- Appointment creation: <500ms
- Lock creation: <200ms
- Real-time update latency: <500ms

### Edge Cases Tested
- Staff has no working hours on selected date
- All slots are booked
- User's lock expires during booking form
- Service duration exceeds staff's available time
- Multiple services with different staff assignments

## Implementation Order

### Phase 1: Date/Time Utilities (30 mins)
1. Create `convex/lib/dateTime.ts`
2. Functions: `addMinutes`, `isBetween`, `roundToNext15`, `getDayOfWeek`
3. Timezone conversion helpers

### Phase 2: Slot Availability Algorithm (3-4 hours)
1. Create `convex/slots.ts` with `available` query
2. Implement staff schedule filtering logic
3. Implement appointment collision detection
4. Implement slot lock filtering
5. Add validators for slot types
6. Unit test with various scenarios

### Phase 3: Slot Locking (1-2 hours)
1. Create `convex/slotLocks.ts` with CRUD mutations
2. Implement lock creation with TTL
3. Implement lock release mutation
4. Create cron job in `convex/crons.ts`
5. Test lock expiration

### Phase 4: Appointment Creation (2-3 hours)
1. Create `convex/appointments.ts` with `create` mutation
2. Create `convex/appointmentServices.ts` for junction
3. Create `convex/lib/confirmation.ts` code generator
4. Implement validation logic (slot available, staff assigned, etc.)
5. Add transaction logic for atomic creation
6. Add validators

### Phase 5: Frontend Integration (2-3 hours)
1. Create `src/modules/booking/hooks/useAvailableSlots.ts`
2. Create `src/modules/booking/components/TimeSlotGrid.tsx`
3. Create `src/modules/booking/components/ServiceSelector.tsx`
4. Create `src/modules/booking/components/StaffSelector.tsx`
5. Create `src/modules/booking/components/DatePicker.tsx`
6. Test real-time updates

### Phase 6: Integration & Testing (2 hours)
1. End-to-end testing: full booking flow
2. Concurrent booking testing (2 browser windows)
3. Lock expiration testing
4. Performance testing with realistic data
5. Fix any issues

## Open Questions

- **Q:** Should we show "most available" staff first in slot results?
  - **A:** Yes, sort by number of available slots (descending).

- **Q:** Should we support "any available staff" preference?
  - **A:** Yes, pass `staffId: null` to get slots for all qualified staff.

- **Q:** How to handle staff breaks/lunch?
  - **A:** Sprint 2 staff schedule includes breaks. Treat as "not working" hours.

- **Q:** What happens if organization changes business hours after appointments are booked?
  - **A:** Existing appointments remain valid. Only affects future bookings.

- **Q:** Should we allow overbooking (intentional double-booking)?
  - **A:** No for MVP. Add as admin feature in post-MVP.

[/PRD]
