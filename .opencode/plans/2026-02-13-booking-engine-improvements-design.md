# Booking Engine Core - Improvement Design

**Date:** 2026-02-13
**Milestone:** 3 (Booking Engine Core)
**Scope:** Bug fixes, performance, settings integration, security, code quality, UX, new features

---

## Analysis Summary

A comprehensive audit of the booking engine revealed 17 findings across 5 categories. This plan addresses all of them plus 4 new feature requests.

### Files Analyzed

| File | Lines | Issues Found |
|------|-------|-------------|
| `convex/appointments.ts` | 1657 | 10 (duplicate notifications, N+1, timezone, validation) |
| `convex/slots.ts` | 226 | 6 (unused settings, past slots, N+1, buffer time) |
| `convex/slotLocks.ts` | 159 | 5 (rate limit, cross-validation, cleanup efficiency) |
| `convex/appointmentServices.ts` | 54 | 2 (dead code, missing org check) |
| `convex/crons.ts` | 63 | 2 (aggressive cleanup, timezone-unaware reminders) |
| `convex/lib/dateTime.ts` | 98 | 3 (UTC assumption, timezone bugs) |
| `convex/lib/triggers.ts` | 129 | 2 (duplicate with mutations, missing confirmed handler) |
| `convex/lib/confirmation.ts` | 42 | 1 (non-ConvexError throw) |
| `convex/lib/rateLimits.ts` | 230 | 2 (wrong key, missing limits) |
| `src/modules/booking/` | 15 files | 20+ (UX, type safety, locale, missing features) |

---

## Phase 1: Critical Bug Fixes

### Task 1.1: Duplicate Notification Fix

**Problem:** Both `convex/lib/triggers.ts` and explicit `ctx.scheduler.runAfter()` calls in `convex/appointments.ts` fire notifications and emails for the same events. Every new booking, cancellation, and reschedule produces 2x notifications + 2x emails.

**Root Cause:** The triggers file comment says "This replaces ~12 manual ctx.scheduler.runAfter() calls" but those manual calls were never removed from the mutations.

**Fix:**
1. Remove all explicit `ctx.scheduler.runAfter()` calls from `appointments.ts`:
   - `create` (lines ~372-384): remove `notifyAllStaff` + `sendBookingConfirmation` scheduler calls
   - `cancel` (lines ~1181-1200): remove notification + email scheduler calls
   - `reschedule` (lines ~1323-1330): remove notification + email scheduler calls
2. Verify `triggers.ts` handles all scenarios:
   - Insert (new booking) -> already handled
   - Cancel -> already handled
   - Reschedule -> already handled
   - Add: `confirmed` status change handler (missing)
3. Move `formatMinutesShort` from `appointments.ts` and `triggers.ts` to `convex/lib/dateTime.ts` (deduplicate)

**Verification:** After fix, create a test booking and verify only 1 notification + 1 email is sent.

### Task 1.2: Timezone Fix

**Problem:** `dateTimeToEpoch` in `convex/lib/dateTime.ts` parses appointment times as UTC. Turkish appointments at 09:00 Istanbul (UTC+3) are evaluated as 09:00 UTC = 12:00 Istanbul. This causes:
- 2-hour cancellation policy to operate on wrong timezone (3-hour offset)
- 15-minute check-in window to be 3 hours off
- `getTodayDateString()` returning wrong date after 21:00 Istanbul time

**Fix:**
1. Update `dateTimeToEpoch` to accept organization timezone (default: "Europe/Istanbul")
2. Update `getTodayDateString` to use org timezone
3. Update `addDays` to use UTC-safe parsing with explicit timezone
4. In `updateStatus` (check-in window, no-show check): read `organizationSettings.timezone`
5. In `cancelByUser`/`rescheduleByUser`: read `cancellationPolicyHours` from settings with timezone
6. Update cron 24-hour reminder to respect org timezone

**Approach:** Use `Intl.DateTimeFormat` with `timeZone` option for timezone conversion (no external deps needed in Node.js runtime).

---

## Phase 2: Performance Optimization

### Task 2.1: Batch Enrichment Refactor

**Problem:** `enrichAppointment` is called per-appointment in `Promise.all` loops. For 100 appointments, this triggers 300+ DB reads (customer + staff + services per appointment).

**Fix:**
1. Create `batchEnrichAppointments(ctx, appointments)` helper:
   - Collect unique `customerId` and `staffId` values
   - Batch fetch all customers and staff with `getAll` from convex-helpers
   - Batch fetch all appointment services with single index query per appointment (or batch)
   - Build Maps for O(1) lookup
   - Return enriched array
2. Replace `Promise.all(appointments.map(enrichAppointment))` calls in:
   - `list`
   - `getByDate`
   - `getByDateRange`
   - `getByCustomer`
   - `listForCurrentUser`

**Expected Impact:** 100 appointments: 300 reads -> ~5-10 reads (batch fetch unique IDs).

### Task 2.2: Appointment List Pagination

**Problem:** `list` query fetches ALL appointments for an organization with no limit. Will degrade as data grows.

**Fix:**
1. Convert `list` to use Convex `.paginate()` with cursor-based pagination
2. Add `statusFilter` and `dateRange` optional args
3. Frontend `AppointmentList.tsx`: implement infinite scroll or page controls
4. Keep backward-compatible: add new `listPaginated` function, deprecate old `list`

### Task 2.3: Date Range Query Fix

**Problem:** `getByDateRange` iterates per-day instead of using index range query. Violates AGENTS.md rule: "Use index range queries, never per-day loops."

**Fix:**
1. Replace per-day loop with single range query:
   ```typescript
   ctx.db.query("appointments")
     .withIndex("by_org_date", q =>
       q.eq("organizationId", orgId).gte("date", startDate).lte("date", endDate)
     )
     .collect()
   ```
2. Single query replaces 7-30 queries depending on range.

### Task 2.4: Slots Available Batch Fetch

**Problem:** For each staff member, `slots.available` makes 4 separate queries (schedule overrides, overtime, appointments, locks). With 10 staff = 40 queries.

**Fix:**
1. Fetch org-wide data first:
   - All schedule overrides for the date (single query with org index)
   - All overtime entries for the date (single query)
   - All appointments for the date (single query)
   - All active slot locks for the date (single query)
2. Filter in memory by staffId
3. Remove `console.warn` debug log

**Expected Impact:** 40 queries -> 4 queries regardless of staff count.

### Task 2.5: User Appointments Optimization

**Problem:** `listForCurrentUser` has unbounded N+1 across customer records and appointments.

**Fix:**
1. Add `.take(50)` limit on customer records
2. Add `.take(100)` limit on appointments per customer
3. Apply batch enrichment from Task 2.1
4. Consider pagination for users with many appointments

---

## Phase 3: BookingSettings Integration

### Task 3.1: Connect Hardcoded Values to Settings

**Problem:** `organizationSettings.bookingSettings` fields are defined in schema but never read. All values are hardcoded.

**Fix - Backend (`slots.available`):**
- Read `organizationSettings` for the org at start of query
- `slotDurationMinutes`: use instead of hardcoded 15 (default: 15)
- `minAdvanceBookingMinutes`: filter out past slots (current time + min advance)
- `maxAdvanceBookingDays`: pass to frontend (default: 30)
- `allowOnlineBooking`: return empty if false
- `bufferBetweenBookingsMinutes`: add gap between appointments in slot calculation

**Fix - Backend (`appointments.ts`):**
- `cancellationPolicyHours`: read from settings instead of hardcoded 2

**Fix - Frontend:**
- `DatePicker.tsx`: read `maxAdvanceBookingDays` from settings instead of constant
- `constants.ts`: remove `MAX_ADVANCE_DAYS` hardcoded value

### Task 3.2: Buffer Time in Slot Calculation

**Problem:** `service.bufferTime` is defined in schema but never used in slot availability or appointment creation.

**Fix:**
- In `slots.available`: when checking if a slot fits, add `service.bufferTime` minutes after the service duration
- In appointment creation: store effective end time as `serviceEndTime + bufferTime`
- `bufferBetweenBookingsMinutes` (global): add between consecutive appointments regardless of service buffer
- UI: show buffer time separately from service duration (e.g., "45 dk + 15 dk hazirlik")

---

## Phase 4: Security Improvements

### Task 4.1: Validation and Rate Limiting

**Fix - Rate Limits:**
- Add `acquireSlotLock` rate limit: 10/minute per userId
- Add `confirmationCodeLookup` rate limit: 10/minute per session/IP
- Fix `createBooking` rate limit key: change from `organizationId` to `userId` (current key means 5 bookings per org per minute, not per user)

**Fix - Input Validation:**
- `create` mutation: validate org exists before creating appointment
- `create` mutation: validate `endTime > startTime`
- `create` mutation: validate `date` format (YYYY-MM-DD regex)
- `create` mutation: limit `serviceIds` array to max 10 items
- `create` mutation: limit `customerNotes` to max 500 characters
- `slotLocks.acquire`: cross-validate `organizationId` matches `staffId`'s org

**Fix - Error Handling:**
- `confirmation.ts`: throw `ConvexError` with `ErrorCode.INTERNAL_ERROR` instead of generic `Error`

---

## Phase 5: Code Quality

### Task 5.1: Cleanup and Type Safety

**Fix - Deduplication:**
- Move `formatMinutesShort` to `convex/lib/dateTime.ts` (single source)
- Create `src/modules/booking/lib/time-utils.ts` for frontend time formatting
- Remove duplicates from `appointments.ts`, `triggers.ts`, `constants.ts`

**Fix - Type Safety (remove all `as any`):**
- `TimeSlotGrid.tsx`: `error: any` -> proper ConvexError typing
- `BookingSummary.tsx`: `error: any` -> proper typing
- `UpdateStatusDropdown.tsx`: `status as any` -> union type
- `CreateAppointmentDialog.tsx`: `(v: any)` -> proper event typing
- `RescheduleDialog.tsx`: `(s as any).serviceIds` -> proper staff type
- `book/page.tsx`: `validIds as any`, `(s as any).serviceIds` -> proper typing

**Fix - Dead Code:**
- Remove `appointmentServices.createForAppointment` (unused internal mutation)
- Refactor `createByStaff` to use `validateSlotAvailability` helper instead of duplicating conflict logic

**Fix - Comments:**
- Fix step numbering in `create` mutation (1,2,3,3,4,6... -> sequential)

---

## Phase 6: UX Improvements

### Task 6.1: Frontend Polish

**Fix - Locale:**
- Change hardcoded "en-US" to "tr-TR" in `DatePicker.tsx`
- Use Turkish date/time formatting throughout booking flow
- Fix "dk" vs "min" inconsistency in `CreateAppointmentDialog.tsx`

**Fix - Confirmation:**
- Add copy-to-clipboard button on `BookingConfirmation.tsx` confirmation code
- Format date display (raw "2025-01-15" -> "15 Ocak 2025, Carsamba")
- Format date on appointment status page (`appointment/[code]/page.tsx`)

**Fix - Forms:**
- Migrate `BookingForm.tsx` from manual useState to TanStack Form + Zod (per AGENTS.md)
- Add phone input mask with auto-formatting (`+90 5__ ___ __ __`)
- Add notes field max character count display

**Fix - Status Badges:**
- Differentiate `confirmed` (blue) vs `completed` (green) badge colors

**Fix - CreateAppointmentDialog:**
- Make time range respect staff schedules instead of hardcoded 06:00-22:00
- Add basic conflict warning before submission

---

## Phase 7: New Features

### Task 7.1: "Any Available Staff" Option

**Scope:** Allow customers to select "First Available" instead of a specific staff member.

**Backend Changes:**
- `slots.available`: when `staffId` is not provided, aggregate slots across all eligible staff
- For each time slot, track which staff members are available
- Return merged slot list with `availableStaffIds` per slot

**Frontend Changes:**
- `StaffSelector.tsx`: add "Ilk Musait Personel" card at the top of the list
- When selected, skip staff-specific filtering in slot query
- `TimeSlotGrid.tsx`: when "any staff" mode, show combined slots without staff grouping

**Appointment Creation:**
- When `staffId` is "any", automatically assign the first available staff from the selected slot's `availableStaffIds`
- Backend picks the staff member, not the frontend (prevents race condition)

### Task 7.2: Calendar Integration

**Scope:** After booking confirmation, allow customer to add appointment to their calendar.

**Implementation:**
- Create `src/modules/booking/lib/calendar.ts`:
  - `generateICS(appointment)`: create .ics file content with VEVENT
  - `generateGoogleCalendarURL(appointment)`: build pre-filled Google Calendar event URL
- Add to `BookingConfirmation.tsx`:
  - "Add to Calendar" dropdown button
  - Options: Google Calendar (opens URL), Apple/Outlook (.ics download)
- ICS fields: summary (service names), dtstart, dtend, location (salon name + address), description (confirmation code)

### Task 7.3: Date Availability Indicators

**Scope:** Show availability status on each date in the date picker.

**Backend:**
- New `slots.availableDates` public query:
  - Args: `organizationId`, `serviceIds`, `staffId?`, `startDate`, `endDate`
  - Returns: `Array<{ date: string, hasAvailability: boolean, slotCount: number }>`
  - Lightweight: only counts available slots, does not return full slot details
  - Check business hours/closed days to mark unavailable dates

**Frontend (`DatePicker.tsx`):**
- Fetch `availableDates` for visible date range
- Visual states:
  - Green dot: slots available
  - Gray/disabled: no availability or closed
  - Bold: today
- Disable clicking on unavailable dates
- Show loading skeleton while availability loads

### Task 7.4: Buffer Time (Service-Level)

**Scope:** Integrate `service.bufferTime` into slot calculation and display.

**Covered by Task 3.2.** Additional UI work:
- Service selector: show "45 dk + 15 dk hazirlik" format
- Booking summary: show buffer time as separate line item
- Admin view: display effective total duration (service + buffer)

---

## Execution Order

```
Phase 1 (Bugs)     -> Task 1.1, 1.2
Phase 2 (Perf)     -> Task 2.1, 2.2, 2.3, 2.4, 2.5
Phase 3 (Settings) -> Task 3.1, 3.2
Phase 4 (Security) -> Task 4.1
Phase 5 (Quality)  -> Task 5.1
Phase 6 (UX)       -> Task 6.1
Phase 7 (Features) -> Task 7.1, 7.2, 7.3, 7.4
```

**Total: 7 phases, 16 tasks**

### Dependencies

- Task 2.1 (batch enrichment) should be done before Task 2.2 (pagination) since pagination will use the new batch enrichment
- Task 3.1 (settings) should be done before Task 7.4 (buffer time UI) since buffer time needs the settings infrastructure
- Task 1.2 (timezone) should be done before Task 3.1 (settings) since settings reads will use correct timezone

---

## Verification

After each phase, run:
```bash
bun run lint     # Biome check
bun run build    # TypeScript type check + production build
```

No test framework is configured, so verification is manual + type checking.
