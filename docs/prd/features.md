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
| Products & Inventory | P2 | ✅ Implemented (M11) |

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

**Settings pages (`/{slug}/settings`):** Sub-page layout with sidebar nav (desktop) / horizontal pill bar (mobile). 5 sub-pages:
- **General** (`/general`): Salon name, description, logo upload, salon type multi-select (34 types in 8 collapsible categories with `selected/total` badges)
- **Contact & Location** (`/contact`): Email, phone, website, social media (Instagram, Facebook, TikTok, Google Maps), address (city/district/neighbourhood cascading selects with async neighbourhood loading)
- **Working Hours** (`/hours`): Business hours editor per day of week
- **Booking Settings** (`/booking`): Online booking toggle, cancellation policy, min/max advance booking, slot duration, buffer between bookings
- **Team** (`/team`): Members list with roles, pending/past invitations

**Settings UX patterns:**
- **Unsaved changes guard:** `useUnsavedChanges` hook (in `src/hooks/use-unsaved-changes.tsx`) — `beforeunload` for hard navigation/tab close + click interception on internal links with AlertDialog confirmation ("Unsaved Changes" / "Stay on Page" / "Discard Changes")
- **Dirty state detection:** Uses TanStack Form's `isDefaultValue` (deep equality) instead of `isDirty` (mutation flag). Arrays (e.g. salon types) are sorted before comparison to prevent false positives from reordering.
- **Form reset after save:** `form.reset()` called after successful mutation so Save/Discard bar and navigation guard clear immediately
- **Settings layout:** Server Component (`settings/layout.tsx`, no `"use client"`). Client boundary pushed to `SettingsNav` component. `aria-current="page"` on active nav links.

**User Salon Preferences (Settings → Salon Preferences):** Users select relevant salon categories (Hair, Nails, Skin, Spa, Body, Medical, Art, Specialty) then fill category-specific preference forms. Each category form has dedicated fields:
- **Hair:** Hair type/length/color, scalp sensitivity, wash frequency, heat tool usage, products used (textarea, 500 char), last chemical treatment (date), + up to 3 photos
- **Skin:** Skin type, conditions, lash history, daily routine, sunscreen usage, active ingredients, last facial date, + up to 3 photos
- **Spa:** Pregnancy/blood pressure flags, chronic pain areas, pressure preference, aromatherapy preference, focus areas
- **Body:** Skin sensitivity, laser history, tanning history, preferred hair removal method, pain tolerance, last treatment date, treatment areas
- **Art:** Tattoo/keloid/metal allergy info + up to 3 documentation photos
- **Specialty:** Pet type/breed/size + up to 3 pet photos

Photo uploads use Convex file storage (2MB max, JPEG/PNG/WebP). Photos are stored as `Id<"_storage">` arrays in the `salonPreferences` embedded object. Thumbnail preview via `files.getFileUrls` batch query.

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

## Products & Inventory

> **Files:** `convex/productCategories.ts`, `convex/products.ts`, `convex/inventoryTransactions.ts`, `convex/files.ts`
> **Frontend:** `src/modules/products/` (12 components), `src/app/[slug]/(authenticated)/products/page.tsx`
> **Public:** `src/app/[slug]/(public)/catalog/page.tsx` — `/{slug}/catalog`

Owner-only management interface + public customer-facing catalog page. No e-commerce/online sales.

**Product management UX:** Single-page sectioned dialog (`ProductWizardDialog`) for both add and edit. Collapsible sections: Basic Info, Pricing, Stock Management, Images, Supplier Info. Card-based grid layout (`ProductGrid`) replaces table view. Filters: search, status, stock level, sort order.

**Multi-image support:** Up to 4 images per product. `imageStorageIds` (storage IDs) + `imageUrls` (resolved URLs) stored on product. Upload via `ProductMultiImageUpload` component with client-side validation (size/type). File mutations: `files.saveProductImages` (append, max 4 total), `files.removeProductImage` (by storageId).

**Inventory dashboard:** `InventoryStatsBar` shows total products, total stock value, low stock count, out of stock count via `products.getInventoryStats` ownerQuery. `LowStockBanner` alert with CTA to filter grid by low stock.

**Pricing:** `costPrice` + `sellingPrice` (kuruş integers). Margin auto-calculated: `((sellingPrice - costPrice) / sellingPrice) * 100` — guarded on `sellingPrice > 0` (returns `undefined` when zero, preventing division by zero). Negative margin shown in red.

**Inventory transactions:** Every stock change logs to `inventoryTransactions`. Types: `restock | adjustment | waste`. Previous/new stock snapshot stored per entry. `restock` quantity always forced positive; `waste` always forced negative; `adjustment` is signed as-entered.

**Low stock alerts:** Products where `stockQuantity <= lowStockThreshold` show an amber alert icon. `products.countLowStock` owner query for dashboard integration. Sidebar nav shows destructive badge with low stock count. `products.adjustStock` triggers `low_stock` notification to all staff when stock crosses below threshold.

**Supplier info:** Embedded object on product (name, phone, email, notes). Not a separate table.

**Public catalog (`/{slug}/catalog`):** `publicQuery` — no auth required. Returns only `active` products with safe fields: name, brand, description, category, sellingPrice, imageUrls, inStock (boolean). Excludes: costPrice, margin, supplierInfo, lowStockThreshold, stockQuantity. Enhanced UX: search with 300ms debounce, category filter (via `productCategories.listPublic`), in-stock toggle, sort options (name/price asc/desc), contact CTA section (phone/WhatsApp/email from org settings). URL params persisted for shareable filtered views.

**Service hard-delete:** `services.permanentDelete` (ownerMutation) — checks `appointmentServices.by_service` index for existing appointments. If found, throws VALIDATION_ERROR. Removes service from all staff `serviceIds` arrays, then hard-deletes.

**Access control:** All management queries/mutations use `ownerQuery`/`ownerMutation`. `productCategories.list` uses `ownerQuery` — staff members cannot access even directly via the Convex client.

**Frontend components:** ProductWizardDialog, ProductGrid, ProductCard, ProductFiltersBar, CategorySidebar, InventoryStatsBar, LowStockBanner, ProductMultiImageUpload, PublicProductCard, AddProductCategoryPopover, AdjustStockDialog, InventoryHistorySheet

**In scope:** Category CRUD (with sort reorder), Product CRUD (soft-delete via `status: inactive`), pricing, multi-image upload (max 4), inventory tracking, inventory stats dashboard, low stock alerts (banner + sidebar badge + notification), search & filter by category/status/stock, public catalog page with search/sort/filter.
**Out of scope:** Online sales, payment processing, purchase orders, barcode scanning, appointment-linked product sales.

---

## SaaS Billing

> **Files:** `convex/polar.ts`, `convex/polarActions.ts`, `convex/polarSync.ts`, `convex/subscriptions.ts`, `convex/subscriptions_helpers.ts`, `convex/http.ts` (webhook routes), `convex/crons.ts`
> **Frontend:** `src/modules/billing/` (9 components + 1 hook), `src/app/[slug]/(authenticated)/billing/page.tsx`

Polar.sh integration via `@convex-dev/polar`. Dynamic pricing fetched from Polar API. All currency/date formatting uses `tr-TR` locale.

**Subscription states:** pending_payment → active → (payment_failed) → past_due → grace_period → suspended. Active → canceling → canceled (period end). Canceling → active (reactivate or plan change).
**Webhook handling:** `onSubscriptionCreated` (maps customer → org), `onSubscriptionUpdated` (status sync via `mapPolarStatus(status, canceledAt, endedAt)` — differentiates "canceling" vs "canceled")
**Suspended access:** `SuspendedOverlay` (accessible: role=alertdialog, focus trap, aria attributes) blocks all pages except billing. `GracePeriodBanner` warns during grace period. Both use shared `useSubscriptionStatus` hook.
**Booking enforcement:** `appointments.create` / `createByStaff` block if subscription is suspended/canceled/pending_payment.
**Cancellation:** `CancelSubscriptionDialog` with reason survey (8 reasons from Polar enum + free comment), sets status to "canceling" (not "canceled"), `cancelAtPeriodEnd: true` sent to Polar API. Rate limited (3/hour).
**Reactivation:** When canceling, current plan card shows "Reactivate Plan" button. Sends `cancelAtPeriodEnd: false` to Polar API, sets local status back to "active".
**Plan change:** Active/canceling subscriptions show "Switch to {Plan}" with confirmation dialog. Uses `@convex-dev/polar`'s `changeCurrentSubscription` (Polar handles proration). Also undoes pending cancellation.
**Billing history:** Fetched via Polar Customer Portal API (`customerPortalOrdersList` with customer session token). Table shows date, product, billing reason, amount, status.
**Owner-only:** Staff members see disabled plan buttons ("Only owners can manage plans"). Cancel/reactivate buttons only shown to owners.
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
