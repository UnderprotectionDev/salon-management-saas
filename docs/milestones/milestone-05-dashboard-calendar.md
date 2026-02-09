# Milestone 5: Admin Dashboard & Calendar

**Status:** Completed | **User Stories:** 4

## Goals

- Admin dashboard with daily/weekly/monthly metrics
- Calendar day and week views with staff columns
- Drag-and-drop rescheduling on calendar
- In-app notification system (bell + panel)

## User Stories

### US-004: Admin Dashboard
- Metric cards: Total today, Completed, Upcoming, No-shows, Walk-ins
- Week-over-week and monthly revenue with % change
- Today's appointments list (time, customer, service, status)
- Quick actions: New Appointment, Walk-In, Block Time
- All metrics real-time, organization-scoped
- Files: `convex/analytics.ts`, `src/modules/dashboard/`

### US-010: Calendar Views
- Day view: staff columns, vertical timeline (15-min rows)
- Week view: 7 days × staff columns grid
- Appointment blocks color-coded by status
- Click appointment → detail modal
- Navigation: prev/next, today button
- Real-time updates
- Files: `src/modules/calendar/`, `convex/appointments.ts` (+getByDateRange)

### US-010.1: Drag-and-Drop Rescheduling
- Drag appointment block to new time slot
- Validate: within staff hours, no overlap, full duration fits
- Confirmation dialog: old → new time
- Cancel returns to original position
- Reuses `appointments.reschedule` mutation from M4
- Library: `@dnd-kit/core`

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
- Multi-staff filter on calendar
- Appointment creation via calendar click
- Custom notification preferences
