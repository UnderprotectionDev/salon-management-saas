# Features

## Feature Overview

| Feature Area | Priority | Status |
|-------------|----------|--------|
| Admin Dashboard & Calendar | P0 | ✅ Implemented (M5) |
| Core Booking Engine | P0 | ✅ Implemented (M3-M4) |
| Staff Management | P0 | ✅ Implemented (M1-M2) |
| SaaS Billing | P0 | ✅ Implemented (M6) |
| Email Notifications | P1 | ✅ Implemented (M7) |
| Reports & Analytics | P1 | ✅ Implemented (M8) |
| Dashboard Appointment Management | P1 | ✅ Implemented (M9) |
| AI Features | P2 | 📋 Planned (M10) |
| Products & Inventory | P2 | 📋 Planned (future) |

---

## Admin Dashboard

Dashboard metrics: today's appointments (total/completed/upcoming/no-shows/walk-ins), weekly bookings (+% change), monthly revenue (+% change, avg ticket).

**Calendar views:** Day (staff columns, 15-min rows, drag-drop reschedule), Week, Month.

**Settings pages:** Business info, working hours, booking settings (advance window, min notice, cancellation window, slot duration, staff selection toggle).

**Subscription widget:** Plan, status, next billing date. Warning banner on payment failure.

---

## Core Booking Engine

> **Files:** `convex/appointments.ts` (~1,425 lines), `convex/slots.ts`, `convex/slotLocks.ts`, `convex/appointmentServices.ts`, `convex/crons.ts`

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

## Dashboard Appointment Management

All customer self-service features live on the `/dashboard` page.

**Appointment cards:** Rich cards with date, time, staff, services, price, confirmation code, and action buttons.
**Self-service actions:** Cancel (with optional reason), Reschedule (date picker + time slot grid), Book Again (pre-filled booking link).
**2-hour policy:** Cancel/Reschedule buttons hidden if appointment starts within 2 hours. Enforced both client-side and server-side.
**Customer profiles:** Cross-salon profile listing with inline editing (name, phone, email) via `getMyProfiles` / `updateMyProfile`.
**Identity:** Authenticated user matched via `customer.userId` — no phone verification needed.

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

## SaaS Billing

> **Files:** `convex/polar.ts`, `convex/polarSync.ts`, `convex/subscriptions.ts`, `convex/subscriptions_helpers.ts`, `convex/http.ts` (webhook routes), `convex/crons.ts`
> **Frontend:** `src/modules/billing/` (7 components), `src/app/[slug]/(authenticated)/billing/page.tsx`

Polar.sh integration via `@convex-dev/polar`. Dynamic pricing fetched from Polar API.

**Subscription states:** pending_payment → active → (payment_failed) → grace_period → suspended | canceled
**Webhook handling:** `onSubscriptionCreated` (maps customer → org), `onSubscriptionUpdated` (status sync, `canceledAt` forces canceled)
**Suspended access:** `SuspendedOverlay` blocks all pages except billing. `GracePeriodBanner` warns during grace period.
**Booking enforcement:** `appointments.create` / `createByStaff` block if subscription is suspended/canceled/pending_payment.
**Cancellation:** `CancelSubscriptionDialog` with toast feedback, `e.preventDefault()` to control dialog close, rate limited (3/hour).
**Env vars:** `POLAR_ORGANIZATION_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`, `POLAR_PRODUCT_MONTHLY_ID`, `POLAR_PRODUCT_YEARLY_ID`

---

## Email Notifications

> **Files:** `convex/email.tsx` (~467 lines), `convex/email_helpers.ts`, `convex/lib/ics.ts`, `src/emails/` (4 templates + 4 shared components)

Resend integration via `resend@6.9.1` + `@react-email/components`. All email sending is via Convex `internalAction` with retry (3 attempts, exponential backoff).

**Email types:** Booking confirmation (with ICS attachment), 24-hour reminder, cancellation notification, staff invitation.
**Triggers:** `ctx.scheduler.runAfter(0)` in appointment create/cancel and invitation create/resend.
**Cron:** Daily at 09:00 UTC for 24-hour reminders.
**Env vars:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SITE_URL`

---

## Reports & Analytics

> **Files:** `convex/reports.ts` (~603 lines), `src/modules/reports/` (16 files)

Three `adminQuery` functions for admin/owner users only. Member role sees "Admin access required" message.

**Revenue report:** Total + expected revenue, completion/cancellation rates, status breakdown bar, dual Y-axis AreaChart (daily revenue + appointments), by-service table, by-staff table, period-over-period % change.
**Staff performance:** Sortable table with appointments, completed, no-shows, revenue, utilization %. No-show rate >10% highlighted. Utilization uses `resolveSchedule()` for accurate scheduled minutes.
**Customer analytics:** New vs returning BarChart by month, top 10 customers by revenue, retention rate (2+ appointments / total unique).

**Date range:** URL-persisted `?from=&to=`, presets (Today, 7d, 30d, This/Last month), max 1 year.
**CSV export:** UTF-8 BOM for Turkish chars, CSV injection sanitization, filename: `{type}_{from}_to_{to}.csv`.
