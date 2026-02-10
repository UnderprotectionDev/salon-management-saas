# Milestone 3: Booking Engine Core

**Status:** ✅ Complete | **User Stories:** 4

## Summary

Implemented slot availability algorithm, slot locking (2-min TTL with cron cleanup), appointment CRUD with multi-service support, confirmation codes, and real-time updates. Built public booking flow and staff-created booking dialog.

## What Was Built

- **Slot Algorithm:** 15-min increments, staff schedule + overrides + overtime, conflict detection
- **Slot Locks:** 2-min TTL, 1 lock per session, cron cleanup every 1 min
- **Appointments:** create (public), createByStaff (org), status transitions, confirmation codes
- **Frontend:** 15 files in booking module, public booking page, salon directory

## User Stories

| ID | Title | Type |
|----|-------|------|
| US-020 | Available Slot Calculation | Backend |
| US-021 | Slot Locking Mechanism | Backend |
| US-022 | Appointment Creation | Backend |
| US-031 | Real-Time Slot Updates | Full-Stack |

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `convex/appointments.ts` | 801 | Appointment CRUD (9 functions) |
| `convex/slots.ts` | 206 | Slot availability algorithm |
| `convex/slotLocks.ts` | 145 | Lock acquire/release/cleanup |
| `convex/appointmentServices.ts` | 54 | Appointment-service junction |
| `convex/crons.ts` | 14 | Slot lock cleanup cron |
| `convex/lib/confirmation.ts` | 40 | 6-char code generator |
| `convex/lib/dateTime.ts` | 78 | Date/time utilities |
| `src/modules/booking/` | 15 files | Booking UI components |

## Key Decisions

- Single staff per appointment (not different per service)
- Online bookings start as `pending`, staff-created as `confirmed`
- Confirmation code: 6-char, excludes 0/O/I/1
- Route groups: `(authenticated)` and `(public)` under `[slug]/`
- Added public APIs: `organizations.listPublic`, `services.listPublic`, `staff.listPublicActive`
