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
| `convex/appointments.ts` | 1,223 | 12 functions total (+3 new) |
| `convex/customers.ts` | 609 | +searchByPhone |
| `convex/lib/dateTime.ts` | 94 | +dateTimeToEpoch |
| `convex/lib/validators.ts` | 731 | +publicAppointment fields |
| `src/modules/booking/` | 16 files, 1,824 lines | +4 new components |

## Schema Additions

- `appointments`: `noShowAt`, `rescheduledAt`, `rescheduleCount`, `rescheduleHistory` (optional fields)

## Key Decisions

- Customer self-service via confirmation code + phone (no OTP)
- Walk-in form as dialog (not separate page)
- Unified `UpdateStatusDropdown` for all transitions
- Reschedule rate limit: 3/hour
- No-show option only shown for past appointments in UI
