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
| Rich Text Editor | P2 | ✅ Implemented |
| AI Features | P2 | 📋 Planned (M10A/B/C) |
| Products & Inventory | P2 | ✅ Implemented (M11) |
| Financial Management | P1 | ✅ Implemented (M12) |
| Freeform Financial Spreadsheet | P1 | ✅ Implemented (M13) |

---

## Admin Dashboard

Dashboard metrics: today's appointments (total/completed/upcoming/no-shows/walk-ins), weekly bookings (+% change), monthly revenue (+% change, avg ticket).

**Calendar views:** 5 view modes — Day (staff columns, 15-min rows, DnD rescheduling, click-to-create), Week (7-day grid), Month (35-42 day grid with overflow popovers), Year (12-month mini-calendars with dot indicators), Agenda (grouped date list). Current time indicator in day/week views. Staff filter (owner-only). Status color-coded appointment blocks with hover tooltips. Business-hours-based dynamic calendar range from org settings. "Happening now" sidebar panel (day view). Drag-and-drop reschedule via @dnd-kit/core (day view). Status actions in detail modal.

**Calendar module structure:** Modular directory architecture under `src/modules/calendar/components/`:
- `day-view/` — DayView, StaffColumn, TimeAxis
- `week-view/` — WeekView
- `month-view/` — MonthView, MonthDayCell (overflow popover with "+N more")
- `year-view/` — YearView, MiniMonth (dot indicators per day)
- `agenda-view/` — AgendaView (date-grouped appointment list)
- `header/` — CalendarHeader, TodayButton, ViewToggle, StaffFilter, DateTitle
- `dialogs/` — AppointmentDetailModal, CalendarRescheduleDialog, DetailsContent
- `dnd/` — AppointmentBlock, AppointmentBlockOverlay, DragConfirmDialog

**Settings pages (`/{slug}/settings`):** General (name, logo, salon type), Contact & Location, Working Hours, Booking Settings, Team. Uses `useUnsavedChanges` hook for navigation guard. TanStack Form with `isDefaultValue` for dirty state.

**User Salon Preferences:** Category-specific forms (Hair, Nails, Skin, Spa, Body, Medical, Art, Specialty) with photo uploads (2MB max, up to 3 per category via Convex file storage).

---

## Core Booking Engine

### Booking State Machine

```
pending → confirmed → checked_in → in_progress → completed
       ↘ cancelled                              ↗ no_show
```

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

### Booking Flows
- **Online:** Select services → staff → date/time → customer info → confirmation code
- **Staff (walk-in/phone):** `CreateAppointmentDialog` — select customer, services, staff, date/time, source
- **Customer self-service:** Identity via confirmationCode + phone, 2-hour cancel/reschedule policy

---

## Dashboard Appointment Management

All on `/dashboard` page. Appointment cards with cancel/reschedule/book-again actions. 2-hour policy enforced client+server side. Customer profiles with inline editing via `getMyProfiles`/`updateMyProfile`. Identity via `customer.userId`.

---

## Staff Management

### Permission Matrix

| Permission | Owner | Staff |
|------------|-------|-------|
| Dashboard, all schedules, create appointments, services, time-off approval, settings, reports | ✅ | ❌ |
| Own schedule, own overtime, request time-off | ✅ | ✅ |

### Schedule System
1. **Default schedule** — weekly recurring hours on `staff.defaultSchedule`
2. **Overrides** — date-specific (custom_hours, day_off, time_off)
3. **Overtime** — extra availability windows

Resolution priority: time-off > override > default. See `convex/lib/scheduleResolver.ts`.

---

## Products & Inventory

Owner-only management + public catalog. No e-commerce/online sales.

**Features:** Single-page sectioned dialog for add/edit, card-based grid, up to 4 images per product, inventory stats dashboard, low stock alerts (banner + sidebar badge + notification), search & filter, public catalog (`/{slug}/catalog`) with safe fields only.

**Pricing:** `costPrice` + `sellingPrice` (kuruş). Margin auto-calc with division-by-zero guard. Inventory transactions: append-only audit log (restock|adjustment|waste).

**Service hard-delete:** `services.permanentDelete` checks `appointmentServices.by_service` index first.

---

## SaaS Billing

Polar.sh via `@convex-dev/polar`. Dynamic pricing from Polar API.

**States:** pending_payment → active → past_due → grace → suspended. Active → canceling → canceled.
**Key features:** Webhook-driven status sync, `SuspendedOverlay` blocks non-billing pages, cancellation with reason survey, reactivation, plan switching, billing history.
**Booking enforcement:** Block if suspended/canceled/pending_payment.

---

## Email Notifications

Resend + React Email via Convex internalAction with retry (3 attempts, exponential backoff).
**Types:** Booking confirmation (with ICS), cancellation, staff invitation.
**Triggers:** `ctx.scheduler.runAfter(0)` on booking/cancel/invitation events.

---

## Reports & Analytics

Three `ownerQuery` functions with role-based filtering. Owner sees all, staff sees own data.

- **Revenue:** Total + expected revenue, daily chart, by-service/staff tables, period % change
- **Staff performance:** Sortable table with utilization %, no-show highlighting
- **Customer analytics:** New vs returning chart, top 10, retention rate

Date range: URL-persisted, presets (Today, 7d, 30d, This/Last month), max 1 year. CSV export with UTF-8 BOM.

---

## SuperAdmin Platform Management

> **Access:** `SUPER_ADMIN_EMAILS` env var. See `convex/admin.ts`.

**Capabilities:** Platform stats, org management (suspend/unsuspend/delete with cascading), user management (ban/unban at auth layer), manual subscription override, full action log audit trail.

**Security:** Synthetic owner member for org access, ban check in `getAuthUser`, rate limits (suspend 10/hr, delete 5/day, ban 10/hr), impersonation banner.

---

## Freeform Financial Spreadsheet

> See [Milestone 13](../milestones/milestone-13-freeform-spreadsheet.md) for full specifications.

Owner-only Excel-like spreadsheet at `/{slug}/financials`. Multi-sheet with full formula engine (50+ functions), rich formatting, conditional formatting, cell validation, merge/freeze panes, row/column management, fill series, undo/redo, search, PDF export, and real-time Convex persistence.

**Persistence:** Sparse cell storage (`spreadsheetCells`) — only non-empty cells stored. 300ms debounce auto-save; bulk replace for structural mutations (row/col insert/delete).

**Formula engine:** Client-side evaluation. Math, text, date, logical, financial, conditional, and lookup function categories.

**Limits:** 52 columns (A–AZ) × 5,000 rows per sheet. Column widths/filters are local state only.

---

## Rich Text Editor

WYSIWYG editor based on Tiptap v3.20.0. Used in rich content areas such as salon description and about page.

**Usage locations:**
- `/{slug}/settings/general` — Edit salon description (with character limit support)
- `/{slug}` — Read-only display on public profile page

**Features:** Headings (H1-H4), bold/italic/underline, text color, highlight, bullet/ordered/task lists, blockquote, horizontal rule, text alignment (4 directions), link insert/edit, image upload (2MB, Convex storage), YouTube embed, resizable image/video, image-with-text layout, character/word counter, preview mode, bubble menu (selection context).

**Security:** XSS protection with DOMPurify — 25 whitelisted HTML tags, 22 whitelisted attributes. Sanitization happens on display (defense-in-depth). iframe restricted to YouTube domains. URL inputs validated for safe protocols (http/https only).

**Custom extensions:** ResizableImage, ResizableYouTube, ImageWithText, ClearFloat.

---

## AI Features

> See [Milestone 10](../milestones/milestone-10-ai-features.md) for full specifications.

**Credit system:** Two pools (customer + org). Costs: Photo Analysis 5cr, Multi-image 8cr, Quick Question 2cr, Virtual Try-On 10cr, Care Schedule 2cr. Purchase via Polar one-time checkout.

**Customer features:** Photo analysis (GPT-4o vision), virtual try-on (fal.ai), quick questions, mood board (free), care schedule.

**Organization features:** Design catalog management, gallery moderation, credit management.

**Staff features:** Appointment prep view (existing AI data, no new calls).
