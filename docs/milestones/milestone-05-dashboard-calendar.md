# Milestone 5: Admin Dashboard & Calendar

**Status:** Completed | **User Stories:** 7

## Goals

- Admin dashboard with daily/weekly/monthly metrics
- Calendar with 5 view modes: day (staff columns), week (7-day grid), month (35-42 day grid), year (12 mini-calendars), agenda (date-grouped list)
- Interactive calendar: drag-and-drop rescheduling (day view), click-to-create, staff filter, status actions
- Business-hours-based dynamic calendar range from org settings
- "Happening now" sidebar panel with live appointment tracking
- In-app notification system (bell + panel)

## User Stories

### US-004: Admin Dashboard
- Metric cards: Total today, Completed, Upcoming, No-shows, Walk-ins
- Week-over-week and monthly revenue with % change (single range query, no N+1)
- Today's appointments list (time, customer, service, status)
- Quick actions: New Appointment, Walk-In, Block Time
- All metrics real-time, organization-scoped
- Files: `convex/analytics.ts`, `src/modules/dashboard/`

### US-010: Calendar Views
- **5 view modes** with modular component architecture:
  - **Day view:** Staff columns, vertical timeline (15-min rows), sticky staff headers, "Happening now" sidebar, mini calendar date picker
  - **Week view:** 7-day grid, aligned time axis with sticky day headers, current time indicator scoped to today's column
  - **Month view:** 35-42 day grid (Mon-aligned), appointment badges with overflow "+N more" popovers, responsive (dots on mobile, full badges on desktop)
  - **Year view:** 12 mini month calendars in 4x3 grid, colored dot indicators for appointment density, click-through to month/day
  - **Agenda view:** Date-grouped chronological list, service details, status badges
- Appointment blocks color-coded by status (CSS variable-based, dark mode compatible) + left border color-coded by staff (10-color palette, index-based)
- Appointment tooltips on hover (400ms delay): customer name, time range, services, status, total price
- Click appointment → detail modal with status action buttons
- Staff filter dropdown (owner only): filter by specific staff member, applies to all views
- Navigation: prev/next, today button (mini calendar icon), 5-mode view toggle
- Business-hours-based dynamic calendar range via `computeCalendarHourRange()` from org settings
- Real-time updates via Convex subscriptions
- Files: `src/modules/calendar/` (modular: `day-view/`, `week-view/`, `month-view/`, `year-view/`, `agenda-view/`, `header/`, `dialogs/`, `dnd/`), `convex/appointments.ts` (+getByDateRange)

### US-010.1: Drag-and-Drop Rescheduling (Day View)
- Drag pending/confirmed appointment blocks to new time slot or different staff column
- `@dnd-kit/core` with PointerSensor (8px activation distance to prevent accidental drags)
- DragOverlay ghost follows cursor; original block becomes transparent
- Drop target highlights on hover (`bg-primary/5`)
- Confirmation dialog with editable time selector:
  - Time slots generated with appointment's actual duration (e.g., 40min → `08:00-08:40, 08:15-08:55...`)
  - 15-minute step intervals between slot start times
  - Target staff's existing appointments shown as disabled/greyed-out slots with "(Dolu)" label
  - Client-side conflict detection prevents selecting occupied time slots
  - "Confirm Move" button disabled when selected slot has a conflict
- Reuses `appointments.reschedule` mutation from M4 (server-side validation as final check)
- Library: `@dnd-kit/core`

### US-010.2: Click-to-Create Appointment (Day View)
- Click on empty area in any staff column to create a new appointment
- Click position converted to time (pixel → minutes), snapped to 15-min grid
- Opens `CreateAppointmentDialog` pre-filled with target staff and calculated time
- Only triggers on grid background clicks (not on appointment blocks)

### US-010.3: Appointment Status Actions
- Detail modal includes status transition buttons based on current state:
  - Pending → Confirm, No-Show
  - Confirmed → Check-In, No-Show
  - Checked-In → Start Service
  - In Progress → Complete
- Cancel button with AlertDialog confirmation (available for pending/confirmed)
- Reschedule button opens `CalendarRescheduleDialog` with date picker, time slot grid, staff selector

### US-033: Notification System
- Bell icon in header with unread count badge
- Notification panel: icon, message, timestamp, read/unread
- Types: New booking, Cancellation, Appointment in 30 min
- Click → mark read + navigate to appointment
- "Mark all as read" button
- Files: `convex/notifications.ts`, `src/components/NotificationBell.tsx`
- Database: `notifications` table, 7-day retention

## Non-Goals

- Custom notification preferences
- Drag-and-drop in week/month/year views (day view only)
- Inline editing of appointments from month/year views
