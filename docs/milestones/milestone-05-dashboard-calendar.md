[PRD]

# Milestone 5: Admin Dashboard & Calendar

## Overview

Milestone5 builds the primary staff interface: admin dashboard with metrics and today's schedule, plus calendar views (day/week) with drag-and-drop rescheduling capabilities.

**Problem Statement:** Staff need a centralized view of daily operations, upcoming appointments, and business metrics.

**Solution:** Real-time dashboard with KPI cards, today's appointments widget, notification system, and interactive calendar with drag-drop rescheduling.

## Goals

- Create admin dashboard layout with navigation
- Display daily/weekly/monthly metrics
- Show today's appointments in chronological order
- Build calendar day and week views
- Implement drag-and-drop rescheduling
- Add notification bell with real-time updates

## Quality Gates

**Backend Stories (Convex):**

- `bunx convex dev` - Type generation
- `bun run lint` - Biome linting
- All queries use custom wrappers
- All functions have `returns:` validators
- Metrics queries optimized with indexes

**Frontend Stories (React/Next.js):**

- `bun run lint` - Biome linting
- `bun run build` - Production build verification
- Manual testing: Dashboard loads in <1 second
- Calendar drag-drop tested with multiple appointments

**Full-Stack Stories:**

- All backend + frontend quality gates
- Real-time metrics update automatically
- Calendar updates when appointment status changes
- Drag-drop reschedule validates new slot

## Dependencies

**Requires completed:**

- Milestone4: Booking Operations (appointments with all statuses)
- Milestone2: Staff, Services, Customers (for metrics aggregation)

**Provides foundation for:**

- Milestone8: Reports & Analytics (dashboard is simplified version)

## User Stories

### US-004: Admin Dashboard

**Description:** As a staff member, I want to see a dashboard with today's key metrics and upcoming appointments, so that I can quickly understand the day's schedule.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [ ] Dashboard shows metric cards: Total appointments today, Completed, Upcoming, No-shows, Walk-ins
- [ ] Week-over-week comparison shows percentage change
- [ ] Monthly revenue metric with percentage change
- [ ] Today's appointments list shows time, customer name, service, status
- [ ] Quick actions: New Appointment, Walk-In, Block Time
- [ ] All metrics update in real-time
- [ ] Dashboard is organization-scoped (only current org's data)

**Technical Notes:**

- Files to create:
  - `convex/analytics.ts` - Dashboard metrics query
  - `src/app/[slug]/dashboard/page.tsx` - Dashboard page
  - `src/modules/dashboard/components/MetricsCard.tsx`
  - `src/modules/dashboard/components/TodaySchedule.tsx`
  - `src/modules/dashboard/components/QuickActions.tsx`
- Metrics calculations:
  - Today: Count appointments by status (completed, upcoming, no_show)
  - This week: Count all appointments, compare to last week
  - This month: Sum appointment revenues, compare to last month
- Use `orgQuery` with real-time subscriptions

### US-010: Calendar Views

**Description:** As a staff member, I want to view appointments in day/week calendar layouts, so that I can visualize the schedule across time and staff.

**Complexity:** High

**Type:** Full-Stack

**Acceptance Criteria:**

- [ ] Day view shows single date with staff columns (vertical timeline)
- [ ] Week view shows 7 days with staff columns (grid layout)
- [ ] Each appointment block shows: time, customer name, service
- [ ] Appointment blocks are color-coded by status (pending: yellow, confirmed: blue, completed: green, cancelled: gray)
- [ ] Clicking appointment opens detail modal
- [ ] Calendar navigation: prev/next day or week
- [ ] Today button jumps to current date
- [ ] Real-time updates add/remove appointment blocks automatically

**Technical Notes:**

- Files to create:
  - `src/app/[slug]/calendar/page.tsx` - Calendar page with view toggle
  - `src/modules/calendar/components/DayView.tsx`
  - `src/modules/calendar/components/WeekView.tsx`
  - `src/modules/calendar/components/AppointmentBlock.tsx`
  - `src/modules/appointments/components/DetailModal.tsx`
  - `convex/appointments.ts` - Add `getByDateRange` query
- UI libraries:
  - Consider using `react-big-calendar` or custom implementation
  - shadcn/ui for modals and buttons
- Time axis: 08:00 - 20:00 (configurable by org business hours)

### US-010.1: Drag-and-Drop Rescheduling

**Description:** As a staff member, I want to drag appointments to different time slots on the calendar, so that I can quickly reschedule without forms.

**Complexity:** High

**Type:** Full-Stack

**Acceptance Criteria:**

- [ ] Staff can drag appointment block to new time slot
- [ ] Drop validation: New slot must be within staff working hours
- [ ] Drop validation: New slot must not overlap with existing appointment
- [ ] Drop validation: New time must accommodate full appointment duration
- [ ] On drop, confirmation dialog shows old → new time
- [ ] Confirm updates appointment and refreshes calendar
- [ ] Cancel returns block to original position
- [ ] Dragging locked during validation/update

**Technical Notes:**

- Files to modify:
  - `src/modules/calendar/components/DayView.tsx` - Add drag handlers
  - Reuse `convex/appointments.ts` `reschedule` mutation from Milestone4
- Libraries:
  - `@dnd-kit/core` for drag-and-drop
  - Optimistic updates for smooth UX
- Validation reuses slot availability logic from Milestone3

### US-033: Notification System

**Description:** As a staff member, I want to see notifications for important events (new bookings, cancellations, upcoming appointments), so that I stay informed.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [ ] Notification bell icon in header shows unread count badge
- [ ] Clicking bell opens notification panel
- [ ] Notifications show: icon, message, timestamp, read/unread status
- [ ] Notification types: New booking, Cancellation, Appointment in 30 min
- [ ] Clicking notification marks as read and navigates to appointment
- [ ] "Mark all as read" button
- [ ] Notifications auto-refresh in real-time

**Technical Notes:**

- Files to create:
  - `convex/notifications.ts` - CRUD + queries
  - `src/components/NotificationBell.tsx`
  - `src/components/NotificationPanel.tsx`
- Database: `notifications` table
- Notification triggers (backend):
  - Appointment created → notify org staff
  - Appointment cancelled → notify assigned staff
  - Scheduler: 30 min before appointment → notify staff
- Use Convex subscriptions for real-time updates

## Functional Requirements

- FR-5.1: Dashboard metrics refresh every 30 seconds (Convex auto)
- FR-5.2: Calendar supports date range navigation
- FR-5.3: Drag-drop reschedule validates new slot availability
- FR-5.4: Notifications persist for 7 days, then auto-delete
- FR-5.5: Calendar color coding matches appointment status

## Non-Goals (Out of Scope)

- Month view calendar (add in Milestone8)
- Multi-staff filter on calendar (show all staff for MVP)
- Appointment creation via calendar click (use quick actions)
- Export calendar to external formats (post-MVP)
- Custom notification preferences (all notifications on for MVP)

## Technical Considerations

### Performance

- Calendar query optimization: Limit to visible date range only
- Metrics caching: Use Convex's built-in query caching
- Pagination for notifications (load 20 at a time)

### Real-Time Updates

- Convex handles subscriptions automatically
- Calendar re-renders only when appointments in view change
- Optimistic updates for drag-drop (rollback on error)

### Drag-and-Drop UX

- Visual feedback: Ghost image of appointment block
- Invalid drop zones: Red border/cursor
- Loading state during validation/update

## Success Metrics

- [ ] Dashboard loads in <1 second
- [ ] Calendar renders 100 appointments without lag
- [ ] Drag-drop reschedule completes in <500ms
- [ ] Notification panel opens in <200ms
- [ ] Real-time updates appear within 1 second

## Implementation Order

1. **Dashboard Backend** (2 hours): Analytics queries for metrics
2. **Dashboard Frontend** (3 hours): Layout, metric cards, today's schedule
3. **Calendar Backend** (1 hour): Date range appointment query
4. **Calendar Frontend** (4 hours): Day/week views with appointment blocks
5. **Drag-and-Drop** (3 hours): DnD handlers, validation, optimistic updates
6. **Notifications** (3 hours): Backend triggers + frontend bell/panel
7. **Testing** (2 hours): E2E flows, performance testing

## Open Questions

- **Q:** Should dashboard show metrics for all staff or only current user?
  - **A:** All staff (organization-wide) for owners/admins, personal for regular staff.

- **Q:** Should we virtualize calendar for performance?
  - **A:** Not for MVP. Add if >50 appointments/day becomes common.

[/PRD]
