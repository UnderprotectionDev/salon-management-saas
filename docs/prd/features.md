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
| AI Features | P2 | 📋 Planned (M10A/B/C) |
| Products & Inventory | P2 | 📋 Planned (future) |

---

## Admin Dashboard

Dashboard metrics: today's appointments (total/completed/upcoming/no-shows/walk-ins), weekly bookings (+% change), monthly revenue (+% change, avg ticket). Revenue computed via single range query (no N+1).

**Calendar views:**
- **Day view:** Staff columns, 15-min rows, sticky headers, current time indicator (red line)
- **Week view:** 7-day grid with aligned time axis and sticky day headers
- **Staff filter:** Owner-only dropdown to filter by specific staff member (both views)
- **Appointment blocks:** Status color-coded + left border color-coded by service type (10-color deterministic palette). Hover tooltip (400ms): customer, time, services, status, price
- **Click-to-create:** Click empty slot in day view → pre-filled appointment dialog (staff + time)
- **Drag-and-drop reschedule (day view):** `@dnd-kit/core`, pending/confirmed only, ghost overlay, drop target highlight. Confirmation dialog with editable time selector showing appointment's actual duration, 15-min steps, target staff's occupied slots disabled with "(Dolu)" label
- **Status actions:** Detail modal with state-specific buttons (Confirm, Check-In, Start, Complete, No-Show, Cancel with confirmation, Reschedule with date/time/staff picker)

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

| Permission | Owner | Staff |
|------------|-------|-------|
| Dashboard, all schedules | ✅ | ❌ |
| Own schedule | ✅ | ✅ |
| Create appointments (any staff) | ✅ | ❌ |
| Book outside hours | ✅ | ❌ |
| Define own overtime | ✅ | ✅ |
| Manage services | ✅ | ❌ |
| Approve/reject time-off | ✅ | ❌ |
| Request time-off | ✅ | ✅ |
| Settings & billing | ✅ | ❌ |
| Reports & analytics | ✅ | ❌ |

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

> **Files:** `convex/email.tsx` (~380 lines), `convex/email_helpers.ts`, `convex/lib/ics.ts`, `src/emails/` (3 templates + 4 shared components)

Resend integration via `resend@6.9.1` + `@react-email/components`. All email sending is via Convex `internalAction` with retry (3 attempts, exponential backoff).

**Email types:** Booking confirmation (with ICS attachment), cancellation notification, staff invitation.
**Triggers:** `ctx.scheduler.runAfter(0)` in appointment create/cancel and invitation create/resend.
**Note:** 24-hour reminder emails were removed. Only event-driven emails (on booking/cancellation) are sent.
**Env vars:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SITE_URL`

---

## Reports & Analytics

> **Files:** `convex/reports.ts` (~603 lines), `src/modules/reports/` (16 files)

Three `orgQuery` functions with role-based data filtering. Owner sees all data, staff members see only their own data (filtered appointments and performance stats).

**Revenue report:** Total + expected revenue, completion/cancellation rates, status breakdown bar, dual Y-axis AreaChart (daily revenue + appointments), by-service table, by-staff table, period-over-period % change.
**Staff performance:** Sortable table with appointments, completed, no-shows, revenue, utilization %. No-show rate >10% highlighted. Utilization uses `resolveSchedule()` for accurate scheduled minutes.
**Customer analytics:** New vs returning BarChart by month, top 10 customers by revenue, retention rate (2+ appointments / total unique).

**Date range:** URL-persisted `?from=&to=`, presets (Today, 7d, 30d, This/Last month), max 1 year.
**CSV export:** UTF-8 BOM for Turkish chars, CSV injection sanitization, filename: `{type}_{from}_to_{to}.csv`.
**Access:** Owner sees all data, staff members see filtered data (their own appointments and performance only).

---

## SuperAdmin Platform Management

> **Files:** `convex/admin.ts` (~705 lines), `src/app/admin/` (layout + 4 pages)
> **Access:** Environment-based via `SUPER_ADMIN_EMAILS` env var

Platform-level management interface for monitoring and controlling the entire SaaS application.

### Platform Dashboard

**Stats overview:**
- Total organizations (count)
- Active organizations (with active/trialing subscriptions)
- Total users (across all orgs)
- Total appointments (all-time)
- Total revenue (sum of all completed appointments)

**Display:** Large metric cards with trend indicators.

### Organization Management

**List view:**
- Searchable/filterable table: Org name, slug, subscription status, created date, total staff, total appointments
- Status filter: All, Active, Pending Payment, Suspended, Canceled
- Pagination with 50/page

**Actions:**
- **Suspend:** Sets `subscriptionStatus: "suspended"`, blocks all booking/staff operations. Requires optional reason (logged to audit).
- **Unsuspend:** Restores organization access. Only available for suspended orgs.
- **Delete:** Cascading delete (org + settings + members + staff + services + customers + appointments + all related data). Requires reason + confirmation dialog.
- **Manual Subscription Update:** Override subscription status/plan/period for support cases. SuperAdmin only.

**Permission model:** SuperAdmins bypass org membership check via `resolveOrgContext` helper (synthetic owner member created at runtime).

**Impersonation:** When SuperAdmin accesses org they're not a member of, red warning banner shown: "SuperAdmin Mode: Viewing [Org Name] as platform administrator."

### User Management

**List view:**
- Searchable table: Email, name, organizations (count + list), banned status, created date
- Filter: All, Banned, Active
- Pagination with 50/page

**Actions:**
- **Ban User:** Creates record in `bannedUsers` table. Banned users blocked at auth layer (`getAuthUser`) before any function execution. All authenticated requests return FORBIDDEN. Requires optional reason.
- **Unban User:** Removes ban record, restores access.

**Ban enforcement:** Check happens in `getAuthUser` before any authenticated operation. Banned users cannot sign in, make API calls, or access any authenticated routes.

### Action Log

Full audit trail of all SuperAdmin actions with infinite scroll.

**Columns:** Timestamp, Action, Performed By (email), Target Type, Target ID, Reason/Details

**Actions logged:** suspend_org, unsuspend_org, delete_org, manual_subscription_update, ban_user, unban_user

**Schema:** `adminActions` table with `by_timestamp` index.

### Business Rules

| Rule | Details |
|------|---------|
| Access control | Email in `SUPER_ADMIN_EMAILS` env var (comma-separated) |
| Org bypass | Synthetic owner member created for any org access |
| Ban check | Runs in `getAuthUser`, blocks all authenticated requests |
| Audit logging | All actions logged to `adminActions` with timestamp, performer, target, details |
| Rate limits | Suspend (10/hr), Delete (5/day), Ban (10/hr) |
| Cascading delete | deleteOrganization removes ALL related data across all tables |
| Impersonation banner | Red warning shown when accessing non-member org |

### Frontend Implementation

**Route:** `/admin` (requires SuperAdmin email in env)

**Layout:** Sidebar with Dashboard, Organizations, Users, Action Log tabs

**Dashboard access:** Shield icon button in main app header (visible only for SuperAdmins)

**Components:**
- PlatformStatsCards
- OrganizationTable with SuspendDialog, DeleteDialog, ManualSubscriptionDialog
- UserTable with BanDialog, UnbanDialog
- ActionLogInfiniteScroll

**Permission UI:** Non-SuperAdmins redirected to 404 if they try to access `/admin`

---

## AI Features

> **Files:** `convex/aiAnalysis.ts`, `convex/aiSimulations.ts`, `convex/aiChat.ts`, `convex/aiCredits.ts`, `convex/aiForecasts.ts`, `convex/aiCareSchedules.ts`, `convex/aiMoodBoard.ts`, `convex/aiActions.tsx`
> **Frontend:** `src/modules/ai/` (customer, organization, shared components)
> **Routes:** `/{slug}/ai` (public, customer), `/{slug}/ai-insights` (admin/owner)

### Credit System

- Two separate pools: customer credits + organization credits
- Credit costs: Photo Analysis (5), Simulation (10), Chat (1/msg), Forecast (3), Post-Visit (2), Care Schedule (2)
- Purchase packages: 50 credits, 200 credits, 500 credits (Polar one-time checkout)
- Atomic: balance check + deduct + transaction log in single mutation
- Full audit trail via `aiCreditTransactions` table

### Customer AI Features

**Photo Analysis:** Upload selfie → GPT-4o vision model analyzes face shape, skin tone (Fitzpatrick), hair type, color, density, condition → Detailed profile card with salon service recommendations + product suggestions. History saved per customer.

**Before/After Simulation:** Upload photo + style prompt → fal.ai generates simulated result → Skeleton placeholder during processing → Blur-to-sharp reveal animation (CSS transition, 1s) → Side-by-side comparison view. Results stored in Convex file storage.

**Style Chat:** Streaming AI consultation (Claude) with salon context (services, pricing, staff specialties) → Thread-based persistence (create, archive) → 1 credit per message.

**Mood Board:** Save favorite analyses/simulations to personal collection → Add notes → Staff-shareable (visible during appointments for reference) → Free feature (no credits).

**Care Schedule:** AI-generated personal care calendar based on visit history + hair/skin type + service intervals → Smart reminders ("Time for a haircut", "Root touch-up ideal date") → Weekly cron check + optional email.

### Organization AI Features

**Revenue Forecasting:** Admin/owner requests weekly or monthly forecast → 90 days of historical data analysis via Gemini Flash → Structured predictions + actionable insights → AreaChart + insights list → 24h cache.

**Post-Visit Follow-up:** AI-generated care tips email sent 1 hour after appointment completion → Personalized content: services summary, home care advice, product suggestions, next visit recommendation → 2 credits per email from org pool.

**Credit Management:** Balance display, purchase (owner only), transaction history with reference type filtering, usage analytics by feature type.

### Business Rules

| Rule | Details |
|------|---------|
| Provider routing | Vision: GPT-4o, Chat: Claude, Forecast: Gemini Flash |
| Simulation wait | Skeleton + blur-to-sharp animation (10-30s) |
| Analysis result | Detailed profile card with face/skin/hair analysis + recommendations |
| Forecast cache | 24 hours, cleanup cron every 6 hours |
| Post-visit delay | 1 hour after completion (`ctx.scheduler.runAfter(3600000)`) |
| Care schedule | Weekly cron check + optional email reminder |
| Mood board | Free (no credits), staff-shareable |
| Product recs | Included in photo analysis (no extra credits), general recs now, catalog match in M11 |
