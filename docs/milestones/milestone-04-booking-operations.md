# Milestone 4: Booking Operations

**Status:** ✅ Complete | **User Stories:** 5

## Summary

Completed booking lifecycle: online booking wizard (5-step), walk-in quick booking dialog, check-in/checkout, cancellation (staff + customer self-service with 2-hour policy), rescheduling with history tracking, and no-show management.

## What Was Built

- **Cancel/Reschedule:** `cancelByCustomer`, `reschedule`, `rescheduleByCustomer` mutations
- **Customer Self-Service:** Identity via confirmationCode + phone, 2-hour policy
- **Walk-In Booking:** `CreateAppointmentDialog` with customer combobox + inline creation
- **Status Management:** `UpdateStatusDropdown` with time-based validation (no-show after start only)
- **Phone Search:** `customers.searchByPhone` for autocomplete

## User Stories

| ID | Title | Type |
|----|-------|------|
| US-010 | Online Booking Wizard | Full-Stack |
| US-011 | Walk-In Quick Booking | Full-Stack |
| US-013 | Check-In & Checkout | Backend + UI |
| US-014 | Cancellation & No-Show | Full-Stack |
| US-015 | Rescheduling | Full-Stack |

## Key Files

| File | Lines | Changes |
|------|-------|---------|
| `convex/appointments.ts` | ~1,700 | 14 functions total (+`_getByConfirmationCode` internalQuery) |
| `convex/customers.ts` | 609 | +searchByPhone (optimized with `.take(200)`) |
| `convex/lib/dateTime.ts` | ~140 | +dateTimeToEpoch, +validateDateString, +getTodayDateString, +getCurrentMinutes |
| `convex/lib/validators.ts` | 731 | +publicAppointment fields |
| `convex/notifications.ts` | ~340 | +getLatest query, timezone-fixed sendReminders |
| `convex/http.ts` | +65 | +rate-limited confirmation code HTTP endpoint |
| `src/modules/booking/` | 16 files, ~1,900 lines | +4 new components, +retry mechanism |
| `src/modules/notifications/` | +1 hook | +useNotificationToast (reactive staff toast) |
| `src/lib/errors.ts` | new | +getErrorMessage utility |
| `src/app/[slug]/(public)/book/error.tsx` | new | +Error boundary |

## Schema Additions

- `appointments`: `noShowAt`, `rescheduledAt`, `rescheduleCount`, `rescheduleHistory`, `notificationReminderSentAt` (optional fields)
- `slotLocks`: `by_org_date` index
- `appointments`: `by_status_date` index (for global cron queries)

## Post-Completion Improvements

The following improvements were applied after initial completion:

### Bug Fixes
- **30-min reminder timezone fix:** Replaced UTC `new Date().getHours()` with Istanbul-timezone-aware `getCurrentMinutes("Europe/Istanbul")` in `notifications.ts`
- **reminderSentAt field split:** Original `reminderSentAt` was replaced with `notificationReminderSentAt` in M4. `emailReminderSentAt` was later added in M7 for email tracking but subsequently removed when reminder emails were dropped.
- **Confirmation code rate limiting:** Added HTTP action `GET /api/appointments/by-confirmation` with `confirmationCodeLookup` rate limit enforcement
- **Date validation:** Added `validateDateString()` to `getByDate` and `getByDateRange` handlers

### Performance
- **searchByPhone:** Uses `.collect()` on org-scoped index for complete phone substring matching
- **Cron optimization:** Replaced O(orgs) loop with direct `by_status_date` index queries
- **appointments.list:** Default 90-day date range via `by_org_date` index (accepts optional `startDate`/`endDate`)
- **listForCurrentUser:** Bounds tightened from 50/100 to 20/50 (customers/appointments)

### Security
- **cancelByUser rate limit key:** Changed from `organizationId` to `ctx.user._id` (per-user isolation)
- **SessionId:** Replaced `Date.now()-Math.random()` with `crypto.randomUUID()`

### Error Handling
- **Booking error boundary:** `src/app/[slug]/(public)/book/error.tsx` with retry button
- **getErrorMessage utility:** `src/lib/errors.ts` for consistent ConvexError extraction
- **Slot lock retry:** Auto-retry once after 500ms + toast with "Retry" action button
- **Silent error logging:** `.catch(() => {})` replaced with `console.error` in ConfirmBookingDialog

### New Feature
- **Staff toast notifications:** `useNotificationToast` hook subscribes to `notifications.getLatest` and shows sonner toast when new notifications arrive. Integrated in authenticated layout.

## Key Decisions

- Customer self-service via confirmation code + phone (no OTP)
- Walk-in form as dialog (not separate page)
- Unified `UpdateStatusDropdown` for all transitions
- Reschedule rate limit: 3/hour
- No-show option only shown for past appointments in UI
- Rate limit key per-user (not per-org) for customer-facing cancellations
