# Features

## Feature Overview

| Feature Area | Priority | Status |
|-------------|----------|--------|
| Admin Dashboard & Calendar | P0 | 📋 Planned (M5) |
| Core Booking Engine | P0 | ✅ Implemented (M3-M4) |
| Customer Portal | P1 | 📋 Planned (M9) |
| Staff Management | P0 | ✅ Implemented (M1-M2) |
| Products & Inventory | P1 | 📋 Planned (M8+) |
| SaaS Billing | P0 | 📋 Planned (M6) |
| Email Notifications | P1 | 📋 Planned (M7) |

---

## Admin Dashboard

Dashboard metrics: today's appointments (total/completed/upcoming/no-shows/walk-ins), weekly bookings (+% change), monthly revenue (+% change, avg ticket).

**Calendar views:** Day (staff columns, 15-min rows, drag-drop reschedule), Week, Month.

**Settings pages:** Business info, working hours, booking settings (advance window, min notice, cancellation window, slot duration, staff selection toggle).

**Subscription widget:** Plan, status, next billing date. Warning banner on payment failure.

---

## Core Booking Engine

> **Files:** `convex/appointments.ts` (1,223 lines), `convex/slots.ts`, `convex/slotLocks.ts`, `convex/appointmentServices.ts`, `convex/crons.ts`

### Booking State Machine

```
pending → confirmed → checked_in → in_progress → completed
       ↘ cancelled                              ↗ no_show
```

- Online bookings start as `pending`, staff-created as `confirmed`
- Check-in: up to 15min before appointment
- No-show: only after appointment start time
- Completion updates customer stats (totalVisits, totalSpent, lastVisitDate)
- No-show increments customer noShowCount

### Business Rules

| Rule | Details |
|------|---------|
| Multi-service | Sequential, single staff per appointment |
| Slot increments | 15 minutes |
| Slot lock TTL | 2 minutes, 1 lock per session |
| Cancellation policy | 2 hours before (customer self-service) |
| Reschedule limit | 3/hour rate limit, 2-hour policy for customers |
| Confirmation code | 6-char alphanumeric (excludes 0/O/I/1) |
| Pricing | Kuruş integers, display: fixed / "Starting from" / variable |

### Online Booking Flow
1. Select services → 2. Select staff (optional) → 3. Pick date & time → 4. Customer info (name, phone required) → 5. Review & confirm → 6. Confirmation code

### Staff Booking (Walk-in/Phone)
Via `CreateAppointmentDialog`: select existing customer (combobox + search), pick services, staff, date/time, source (walk_in/phone/staff). Skips slot lock, starts as `confirmed`.

### Customer Self-Service
Identity via confirmationCode + phone. Cancel/reschedule enforces 2-hour policy. No OTP verification (deferred).

---

## Customer Portal

**Hybrid account model:** guest (1st visit) → recognized (2nd, pre-filled) → prompted (3rd, account banner) → registered (full access).

**Public pages (no auth):** Salon landing, services by category, booking wizard, confirmation page.
**Authenticated pages:** My bookings (upcoming/past/cancelled), my profile.

**Notes system:** `customerNotes` (customer-visible) and `staffNotes` (internal only).
**No-show policy:** Informational only, no penalties or blocking.

---

## Staff Management

### Permission Matrix

| Permission | Owner | Admin | Member |
|------------|-------|-------|--------|
| Dashboard, all schedules | ✅ | ✅ | ❌ |
| Own schedule | ✅ | ✅ | ✅ |
| Create appointments (any staff) | ✅ | ✅ | ❌ |
| Book outside hours | ✅ | ✅ | ❌ |
| Define own overtime | ✅ | ✅ | ✅ |
| Manage services | ✅ | ✅ | ❌ |
| Approve/reject time-off | ✅ | ✅ | ❌ |
| Request time-off | ✅ | ✅ | ✅ |
| Settings & billing | ✅ | ❌ | ❌ |

### Schedule System
1. **Default schedule** - weekly recurring hours on `staff.defaultSchedule`
2. **Overrides** - date-specific (custom_hours, day_off, time_off)
3. **Overtime** - extra availability windows outside regular hours

Resolution priority: time-off > override > default schedule. See `convex/lib/scheduleResolver.ts`.

### Time-Off Workflow
Staff requests → pending → admin approves/rejects. Approval auto-creates schedule overrides (type="time_off") for each day.

### Onboarding
Owner invites via email → pending invitation + staff record → staff accepts link → Better Auth account → member + staff linked → active.

---

## Products & Inventory (Planned)

Digital catalog + inventory management. No e-commerce/online sales.

**In scope:** Product CRUD, pricing (cost + selling + margin), inventory tracking, supplier info, low stock alerts, categories.
**Out of scope:** Online sales, payment processing, purchase orders, barcode scanning.

---

## SaaS Billing (Planned)

Polar.sh integration. Standard plan: ₺500/month or ₺5,100/year.

**Subscription states:** trialing → active ↔ past_due → suspended (7-day grace) | cancelled
**Webhook events:** checkout.completed, subscription.updated/cancelled, payment.failed/succeeded
**Suspended access:** Only billing page accessible.
