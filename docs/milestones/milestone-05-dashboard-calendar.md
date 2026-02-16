# Milestone 5: Admin Dashboard & Calendar

**Status:** Completed | **User Stories:** 7

## Goals

- Admin dashboard with daily/weekly/monthly metrics
- Calendar day and week views with staff columns
- Interactive calendar: drag-and-drop, click-to-create, staff filter, status actions
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
- Day view: staff columns, vertical timeline (15-min rows), sticky staff headers
- Week view: 7 days grid, aligned time axis with sticky day headers
- Appointment blocks color-coded by status + left border color-coded by service type (10-color palette, deterministic hash)
- Appointment tooltips on hover (400ms delay): customer name, time range, services, status, total price
- Click appointment → detail modal with status action buttons
- Staff filter dropdown (owner only): filter by specific staff member, applies to both day and week views
- Navigation: prev/next, today button
- Real-time updates
- Files: `src/modules/calendar/`, `convex/appointments.ts` (+getByDateRange)

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

- Month view calendar (M8)
- Custom notification preferences
- Drag-and-drop in week view (day view only)
