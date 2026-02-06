# 06 - Implementation Roadmap

> **Version:** 1.1.0
> **Last Updated:** 2026-02-06
> **Status:** Active Development
> **Scope:** MVP (P0 + P1)

This document contains the detailed implementation roadmap for remaining tasks after the Google Auth integration.

---

## Current Status

### Completed

| Category | Status | Details |
|----------|--------|---------|
| **Authentication** | ✅ Done | Better Auth + Google OAuth |
| **Convex Setup** | ✅ Done | HTTP router, client provider |
| **Auth UI** | ✅ Done | Sign-in view, auth components |
| **UI Library** | ✅ Done | 56 shadcn/ui components |
| **Core Pages** | ✅ Done | Landing, sign-in, dashboard |
| **Database Schema** | ✅ Done | Sprint 1 - Full schema implemented |
| **Multi-Tenant Setup** | ✅ Done | Sprint 1 - Organizations, members, RLS |
| **Onboarding Wizard** | ✅ Done | Sprint 1 - Salon creation flow |
| **Business Hours Editor** | ✅ Done | Sprint 1 - Settings page |
| **Staff Invitation System** | ✅ Done | Sprint 1 - Email invitations |

### Remaining (To Be Completed in Sprints)

| Category | Priority | Sprint | Status |
|----------|----------|--------|--------|
| ~~Database Schema~~ | ~~P0~~ | ~~Sprint 1~~ | ✅ Done |
| ~~Multi-Tenant Setup~~ | ~~P0~~ | ~~Sprint 1~~ | ✅ Done |
| Service Catalog | P0 | Sprint 2 | Pending |
| Staff Management | P0 | Sprint 2 | Pending |
| Booking Engine | P0 | Sprint 3-4 | Pending |
| Admin Dashboard | P0 | Sprint 5 | Pending |
| SaaS Billing (Polar) | P0 | Sprint 6 | Pending |
| Email (Resend) | P1 | Sprint 7 | Pending |
| Reports & Analytics | P1 | Sprint 8 | Pending |
| Customer Portal | P1 | Sprint 9 | Pending |

---

## Dependency Map

```
                        ┌─────────────────────┐
                        │   AUTH (✅ Done)    │
                        │  Better Auth/Google │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │ SPRINT 1 (✅ Done)  │
                        │   Multi-Tenant      │
                        │   Organizations     │
                        │   + Database Schema │
                        └──────────┬──────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
     ┌────────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
     │   SPRINT 2A     │  │   SPRINT 2B     │  │   SPRINT 2C    │
     │   Services      │  │   Staff         │  │   Customers    │
     │   Catalog       │  │   Management    │  │   Base         │
     └────────┬────────┘  └────────┬────────┘  └───────┬────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                        ┌──────────▼──────────┐
                        │   SPRINT 3-4        │
                        │   Booking Engine    │
                        │   + Calendar        │
                        │   + Slot Management │
                        └──────────┬──────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
┌────────▼────────┐     ┌──────────▼──────────┐   ┌──────────▼──────────┐
│   SPRINT 5      │     │   SPRINT 6          │   │   SPRINT 7          │
│   Dashboard     │     │   Billing           │   │   Email             │
│   + Analytics   │     │   Polar.sh          │   │   Resend            │
│   + Calendar UI │     │   Subscriptions     │   │   Notifications     │
└────────┬────────┘     └──────────┬──────────┘   └──────────┬──────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                                        │
     ┌────────▼────────┐                    ┌──────────▼──────────┐
     │   SPRINT 8      │                    │   SPRINT 9          │
     │   Reports       │                    │   Customer Portal   │
     │   Advanced      │                    │   Self-Service      │
     │   Analytics     │                    │   Booking           │
     └─────────────────┘                    └─────────────────────┘
```

---

## Sprint 1: Multi-Tenant Foundation ✅ COMPLETED

> **Goal:** Set up organization structure and database schema
> **Dependency:** Auth (✅ Done)
> **User Stories:** US-001, US-030
> **Completion Date:** 2026-02-05

### Tasks

#### Backend (Convex)

| Task | File | Status |
|------|------|--------|
| Create full database schema | `convex/schema.ts` | ✅ Done |
| Organization CRUD mutations | `convex/organizations.ts` | ✅ Done |
| Organization queries | `convex/organizations.ts` | ✅ Done |
| RLS (Row-Level Security) setup | `convex/lib/functions.ts` | ✅ Done |
| Member management | `convex/members.ts` | ✅ Done |
| Invitation system | `convex/invitations.ts` | ✅ Done |
| Staff management | `convex/staff.ts` | ✅ Done |

#### Frontend (Next.js)

| Task | File | Status |
|------|------|--------|
| Onboarding wizard page | `src/app/onboarding/page.tsx` | ✅ Done |
| Organization setup form | `src/modules/onboarding/` | ✅ Done |
| Business hours selector | `src/components/business-hours/` | ✅ Done |
| Protected route middleware | `src/middleware.ts` | ✅ Done |
| Organization context provider | `src/modules/organization/` | ✅ Done |
| Settings page with business hours | `src/app/[slug]/settings/page.tsx` | ✅ Done |
| Staff list page | `src/app/[slug]/staff/page.tsx` | ✅ Done |
| Invitation banner | `src/modules/organization/components/InvitationBanner.tsx` | ✅ Done |

### Schema Tables (Sprint 1)

```typescript
// Created tables:
- organization ✅
- organizationSettings ✅ (business hours, booking settings)
- member ✅
- invitation ✅
- staff ✅
- user ✅ (Better Auth)
```

### Deliverables

- [x] Redirect new users to onboarding after sign-up
- [x] Salon information form (name, address, contact)
- [x] Business hours selection
- [x] Business hours editing (Settings page)
- [x] Automatic staff record creation as owner
- [x] Redirect to dashboard
- [x] Staff invitation system (email-based)
- [x] Organization switcher
- [x] All UI text in English

### Definition of Done ✅

1. ✅ User sees onboarding wizard after sign-in
2. ✅ User can enter salon information
3. ✅ User can set business hours
4. ✅ User is redirected to dashboard after completion
5. ✅ Organization data is stored in Convex

---

## Sprint 1.5: Multi-Tenant Enhancements (IN PROGRESS)

> **Goal:** Complete multi-tenant core features
> **Dependency:** Sprint 1 (✅ Done)
> **Status:** In Progress

### Staff Profile Management

| Task | File | Status |
|------|------|--------|
| Staff profile detail page | `src/app/[slug]/staff/[id]/page.tsx` | ✅ Done (untracked) |
| Staff profile edit form | `src/modules/staff/components/StaffProfileForm.tsx` | ✅ Done (untracked) |
| Staff schedule editor | `src/modules/staff/components/ScheduleEditor.tsx` | ✅ Done (untracked) |
| Staff profile update mutation | `convex/staff.ts` (updateProfile) | ✅ Done |

### Invitation Management UI

| Task | File | Status |
|------|------|--------|
| Invitations list component | `src/modules/settings/components/InvitationsList.tsx` | ✅ Done (untracked) |
| Cancel invitation button | Uses `api.invitations.cancel` | Pending |
| Resend invitation button | Uses `api.invitations.resend` | Pending |
| Invitation status badges | `src/components/InvitationStatus.tsx` | Pending |
| Add to settings or staff page | `src/app/[slug]/settings/page.tsx` | Pending |

### Members Management

| Task | File | Status |
|------|------|--------|
| Members list component | `src/modules/settings/components/MembersList.tsx` | ✅ Done (untracked) |
| Member card component | `src/modules/members/components/MemberCard.tsx` | Pending |
| Role change dropdown | `src/modules/members/components/RoleSelect.tsx` | Pending |
| Remove member button | Uses `api.members.remove` | Pending |
| Leave organization button | Uses `api.members.leave` | Pending |

### Transfer Ownership

| Task | File | Status |
|------|------|--------|
| Transfer ownership mutation | `convex/members.ts` | ✅ Done |
| Transfer ownership dialog | `src/modules/settings/components/TransferOwnershipDialog.tsx` | ✅ Done (untracked) |
| Confirmation dialog | Requires 2-step confirmation | Pending |

### Settings Sub-Forms

| Task | File | Status |
|------|------|--------|
| General info form | `src/modules/settings/components/GeneralInfoForm.tsx` | ✅ Done (untracked) |
| Contact info form | `src/modules/settings/components/ContactInfoForm.tsx` | ✅ Done (untracked) |
| Address form | `src/modules/settings/components/AddressForm.tsx` | ✅ Done (untracked) |
| Logo upload component | `src/components/logo-upload/LogoUpload.tsx` | ✅ Done (untracked) |

### Backend Infrastructure

| Task | File | Status | Lines | Details |
|------|------|--------|-------|---------|
| Return validators | `convex/lib/validators.ts` | ✅ Done | 231 | Sub-validators, document validators, composite validators |
| Rate limiting config | `convex/lib/rateLimits.ts` | ✅ Done | 104 | Token bucket & fixed window limits for invitations, orgs, members |
| File storage/upload | `convex/files.ts` | ✅ Done | 192 | Logo upload, staff images, 3-step upload flow |
| Audit logging schema | Schema: `auditLogs` table | ✅ Done | — | Table exists with all indexes |
| Audit logging helper | `convex/lib/audit.ts` | ❌ Not implemented | 0 | Planned for future sprint |

### Backend APIs (Already Implemented)

```typescript
// Existing APIs:
- api.members.list ✅
- api.members.updateRole ✅
- api.members.remove ✅
- api.members.leave ✅
- api.members.transferOwnership ✅
- api.invitations.list ✅
- api.invitations.cancel ✅
- api.invitations.resend ✅
- api.staff.updateProfile ✅
```

### Deliverables

- [x] Staff profile detail page (`/[slug]/staff/[id]`) (untracked)
- [x] Staff profile edit form (untracked)
- [x] Staff schedule editor (untracked)
- [ ] Pending invitations list
- [ ] Invitation cancel/resend buttons
- [x] Members list component (untracked)
- [ ] Member role change dropdown
- [ ] Member removal button
- [x] Transfer ownership feature (backend done, frontend untracked)

---

## Sprint 2: Services, Staff & Customers

> **Goal:** Core entity management
> **Dependency:** Sprint 1 (Organizations)
> **User Stories:** US-002, US-003, US-006

### 2A: Service Catalog

#### Backend

| Task | File |
|------|------|
| Service CRUD mutations | `convex/services.ts` |
| Category CRUD mutations | `convex/serviceCategories.ts` |
| Service queries (by org, by category) | `convex/services.ts` |

#### Frontend

| Task | File |
|------|------|
| Services list page | `src/app/[slug]/services/page.tsx` |
| Service form (add/edit) | `src/modules/services/` |
| Category management | `src/modules/services/categories/` |
| Price formatter (TRY) | `src/lib/currency.ts` |

### 2B: Staff Management

#### Backend

| Task | File |
|------|------|
| Staff CRUD mutations | `convex/staff.ts` |
| Invitation mutation | `convex/staff.ts` |
| Role permission helpers | `convex/lib/permissions.ts` |
| Schedule queries | `convex/schedules.ts` |

#### Frontend

| Task | File |
|------|------|
| Staff list page | `src/app/[slug]/staff/page.tsx` |
| Staff profile page | `src/app/[slug]/staff/[id]/page.tsx` |
| Invite staff modal | `src/modules/staff/InviteModal.tsx` |
| Schedule editor | `src/modules/staff/ScheduleEditor.tsx` |
| Role badge component | `src/components/RoleBadge.tsx` |

### 2C: Customer Base

#### Backend

| Task | File |
|------|------|
| Customer CRUD mutations | `convex/customers.ts` |
| Customer search query | `convex/customers.ts` |
| Phone validation helper | `convex/lib/phone.ts` |

#### Frontend

| Task | File |
|------|------|
| Customer list page | `src/app/[slug]/customers/page.tsx` |
| Customer profile page | `src/app/[slug]/customers/[id]/page.tsx` |
| Customer search component | `src/modules/customers/Search.tsx` |

### Deliverables

- [ ] Service catalog CRUD (category, service, price, duration)
- [ ] Staff invitation system (email)
- [ ] Staff role management (owner, admin, member)
- [ ] Staff schedule settings
- [ ] Customer list and search
- [ ] Customer profile page

---

## Sprint 3: Booking Engine - Core

> **Goal:** Appointment creation and slot management
> **Dependency:** Sprint 2 (Services, Staff, Customers)
> **User Stories:** US-020, US-021, US-022, US-031

### Backend

| Task | File | Priority |
|------|------|----------|
| Slot availability algorithm | `convex/slots.ts` | P0 |
| Slot lock mechanism | `convex/slotLocks.ts` | P0 |
| Appointment CRUD | `convex/appointments.ts` | P0 |
| Appointment services junction | `convex/appointmentServices.ts` | P0 |
| Lock cleanup cron job | `convex/crons.ts` | P0 |
| Confirmation code generator | `convex/lib/confirmation.ts` | P0 |

### Frontend

| Task | File | Priority |
|------|------|----------|
| Service selector component | `src/modules/booking/ServiceSelector.tsx` | P0 |
| Staff selector component | `src/modules/booking/StaffSelector.tsx` | P0 |
| Date picker component | `src/modules/booking/DatePicker.tsx` | P0 |
| Time slot grid | `src/modules/booking/TimeSlotGrid.tsx` | P0 |
| Booking summary | `src/modules/booking/Summary.tsx` | P0 |
| useAvailableSlots hook | `src/modules/booking/hooks/` | P0 |

### Slot Availability Logic

```typescript
// Algorithm summary:
1. Calculate total duration of selected services
2. Find available staff for the selected day
3. For each staff member:
   - Get working hours
   - Subtract existing appointments
   - Subtract active locks
   - Calculate available gaps
4. Return as 15-minute slots
5. Real-time subscription for concurrent updates
```

### Deliverables

- [ ] Service selection (multi-select support)
- [ ] Staff selection (or "any available")
- [ ] Date selection (30 days ahead)
- [ ] Available slot display
- [ ] Slot locking (2-minute TTL)
- [ ] Real-time slot updates

---

## Sprint 4: Booking Engine - Operations

> **Goal:** Appointment management and operations
> **Dependency:** Sprint 3 (Booking Core)
> **User Stories:** US-010, US-011, US-012, US-014, US-015, US-025

### Backend

| Task | File |
|------|------|
| Check-in mutation | `convex/appointments.ts` |
| Checkout mutation | `convex/appointments.ts` |
| Cancel mutation | `convex/appointments.ts` |
| No-show mutation | `convex/appointments.ts` |
| Walk-in quick booking | `convex/appointments.ts` |
| OTP verification | `convex/otp.ts` |
| Reschedule mutation | `convex/appointments.ts` |

### Frontend

| Task | File |
|------|------|
| Booking flow wizard | `src/app/[slug]/book/page.tsx` |
| Customer info form | `src/modules/booking/CustomerForm.tsx` |
| OTP input component | `src/modules/booking/OTPInput.tsx` |
| Confirmation page | `src/app/[slug]/book/confirmation/[id]/page.tsx` |
| Walk-in quick form | `src/modules/booking/WalkInForm.tsx` |
| Appointment detail modal | `src/modules/appointments/DetailModal.tsx` |
| Status badges | `src/components/AppointmentStatus.tsx` |

### Appointment States

```
pending -> confirmed -> checked_in -> completed
                    \-> cancelled
                    \-> no_show
```

### Deliverables

- [ ] Online booking wizard (7 steps)
- [ ] OTP verification
- [ ] Booking confirmation page
- [ ] Walk-in quick form
- [ ] Check-in operation
- [ ] Checkout operation
- [ ] Cancellation (2-hour rule)
- [ ] No-show marking
- [ ] Rescheduling

---

## Sprint 5: Admin Dashboard & Calendar

> **Goal:** Admin panel and calendar views
> **Dependency:** Sprint 4 (Booking Operations)
> **User Stories:** US-004, US-010

### Backend

| Task | File |
|------|------|
| Dashboard metrics query | `convex/analytics.ts` |
| Calendar appointments query | `convex/appointments.ts` |
| Notifications queries | `convex/notifications.ts` |
| Real-time subscriptions | All relevant files |

### Frontend

| Task | File |
|------|------|
| Dashboard layout | `src/app/[slug]/layout.tsx` |
| Sidebar navigation | `src/components/Sidebar.tsx` |
| Metrics cards | `src/modules/dashboard/MetricsCard.tsx` |
| Today's schedule widget | `src/modules/dashboard/TodaySchedule.tsx` |
| Quick actions | `src/modules/dashboard/QuickActions.tsx` |
| Notification bell | `src/components/NotificationBell.tsx` |
| Calendar day view | `src/modules/calendar/DayView.tsx` |
| Calendar week view | `src/modules/calendar/WeekView.tsx` |
| Drag-drop rescheduling | `src/modules/calendar/DragDrop.tsx` |

### Dashboard Metrics

```typescript
interface DashboardMetrics {
  today: {
    totalAppointments: number;
    completed: number;
    upcoming: number;
    noShows: number;
    walkIns: number;
  };
  thisWeek: {
    totalBookings: number;
    percentChange: number;
  };
  thisMonth: {
    revenue: number;
    percentChange: number;
    averageTicket: number;
  };
}
```

### Deliverables

- [ ] Dashboard home page
- [ ] Sidebar navigation
- [ ] Daily metrics
- [ ] Today's appointments list
- [ ] Quick actions (new appointment, walk-in, block)
- [ ] Notification panel
- [ ] Calendar day view
- [ ] Calendar week view
- [ ] Drag-drop rescheduling
- [ ] Appointment detail modal

---

## Sprint 6: SaaS Billing (Polar.sh)

> **Goal:** Subscription system integration
> **Dependency:** Sprint 5 (Dashboard)
> **User Stories:** US-040, US-041, US-042, US-043, US-044, US-045

### Backend

| Task | File |
|------|------|
| Polar webhook handler | `convex/http.ts` |
| Subscription mutations | `convex/subscriptions.ts` |
| Subscription queries | `convex/subscriptions.ts` |
| Grace period logic | `convex/subscriptions.ts` |
| Checkout URL action | `convex/polar.ts` |
| Portal URL action | `convex/polar.ts` |

### Frontend

| Task | File |
|------|------|
| Billing page | `src/app/[slug]/billing/page.tsx` |
| Subscription status widget | `src/modules/billing/StatusWidget.tsx` |
| Payment warning banner | `src/modules/billing/WarningBanner.tsx` |
| Billing history table | `src/modules/billing/HistoryTable.tsx` |
| Subscription middleware | `src/middleware.ts` |

### Polar.sh Integration

```typescript
// Webhook events:
- checkout.completed -> subscription.created
- subscription.updated
- subscription.cancelled
- payment.succeeded
- payment.failed -> starts grace period

// Grace period: 7 days
// Day 1, 3, 5, 7: Reminder emails
// After Day 7: Account suspended
```

### Deliverables

- [ ] Checkout flow (monthly/yearly selection)
- [ ] Subscription status widget
- [ ] Payment failure banner
- [ ] Grace period management
- [ ] Billing history
- [ ] Polar portal redirect
- [ ] Subscription cancellation
- [ ] Suspended state management (billing page access only)

---

## Sprint 7: Email Notifications (Resend)

> **Goal:** Email notification system
> **Dependency:** Sprint 4 (Booking), Sprint 6 (Billing)
> **User Stories:** US-023, US-024

### Backend

| Task | File |
|------|------|
| Resend action | `convex/email.ts` |
| Email templates | `convex/emailTemplates.ts` |
| Reminder scheduler | `convex/schedulers.ts` |
| Reminder cron job | `convex/crons.ts` |

### Frontend (React Email Templates)

| Task | File |
|------|------|
| Booking confirmation email | `src/emails/BookingConfirmation.tsx` |
| Reminder email | `src/emails/Reminder.tsx` |
| Cancellation email | `src/emails/Cancellation.tsx` |
| Staff invitation email | `src/emails/StaffInvitation.tsx` |
| Payment failed email | `src/emails/PaymentFailed.tsx` |

### Email Types

| Email | Trigger | Timing |
|-------|---------|--------|
| Booking Confirmation | Appointment created | Immediately |
| Reminder | Scheduler | 24 hours before |
| Cancellation | Appointment cancelled | Immediately |
| Staff Invitation | Invitation sent | Immediately |
| Payment Failed | Payment unsuccessful | Immediately |
| Grace Period Reminders | Cron | Day 1, 3, 5, 7 |

### Deliverables

- [ ] Resend integration
- [ ] React Email templates
- [ ] Booking confirmation email
- [ ] 24-hour advance reminder
- [ ] Cancellation notification
- [ ] Staff invitation email
- [ ] Payment failure emails
- [ ] ICS calendar attachment

---

## Sprint 8: Reports & Analytics (P1)

> **Goal:** Detailed reporting system
> **Dependency:** Sprint 5 (Dashboard)
> **User Stories:** US-005, US-032

### Backend

| Task | File |
|------|------|
| Revenue report query | `convex/reports.ts` |
| Staff performance query | `convex/reports.ts` |
| Customer analytics query | `convex/reports.ts` |
| Audit log mutations | `convex/auditLogs.ts` |
| CSV export action | `convex/exports.ts` |

### Frontend

| Task | File |
|------|------|
| Reports layout | `src/app/[slug]/reports/layout.tsx` |
| Revenue report page | `src/app/[slug]/reports/revenue/page.tsx` |
| Staff report page | `src/app/[slug]/reports/staff/page.tsx` |
| Customer report page | `src/app/[slug]/reports/customers/page.tsx` |
| Chart components | `src/modules/reports/charts/` |
| Date range picker | `src/components/DateRangePicker.tsx` |
| Export button | `src/components/ExportButton.tsx` |

### Report Types

| Report | Metrics |
|--------|---------|
| Revenue | Daily/weekly/monthly revenue, by service, by staff |
| Staff Performance | Appointment count, revenue, utilization %, no-show rate |
| Customer Analytics | New vs returning, retention, top customers |

### Deliverables

- [ ] Revenue report (chart + table)
- [ ] Staff performance report
- [ ] Customer analytics report
- [ ] Date range picker
- [ ] CSV export
- [ ] Audit logging

---

## Sprint 9: Customer Portal (P1)

> **Goal:** Customer self-service portal
> **Dependency:** Sprint 4 (Booking), Sprint 7 (Email)
> **User Stories:** US-026, US-027

### Backend

| Task | File |
|------|------|
| Customer auth (magic link) | `convex/customerAuth.ts` |
| Customer booking history | `convex/customers.ts` |
| Reschedule mutation | `convex/appointments.ts` |
| Cancel (customer) mutation | `convex/appointments.ts` |

### Frontend

| Task | File |
|------|------|
| Customer portal layout | `src/app/[slug]/portal/layout.tsx` |
| Login page (magic link) | `src/app/[slug]/portal/login/page.tsx` |
| My appointments page | `src/app/[slug]/portal/appointments/page.tsx` |
| Booking history | `src/app/[slug]/portal/history/page.tsx` |
| Reschedule flow | `src/app/[slug]/portal/reschedule/[id]/page.tsx` |
| Cancel confirmation | `src/modules/portal/CancelModal.tsx` |

### Customer Portal Features

```
Portal Home
├── Active Appointments
│   ├── View Details
│   ├── Reschedule
│   └── Cancel
├── Past Appointments
│   └── Book Again
└── Profile Settings
    ├── Contact Information
    └── Notification Preferences
```

### Deliverables

- [ ] Magic link authentication
- [ ] Active appointments list
- [ ] Past appointments
- [ ] Self-service rescheduling
- [ ] Self-service cancellation (2-hour rule)
- [ ] "Book again" button
- [ ] Notification preferences

---

## Sprint Summary Table

| Sprint | Goal | User Stories | Complexity | Status |
|--------|------|-------------|------------|--------|
| 1 | Multi-Tenant Foundation | US-001, US-030 | Medium | ✅ Done |
| 1.5 | Multi-Tenant Enhancements | US-001, US-030 | Medium | In Progress |
| 2 | Services, Staff, Customers | US-002, US-003, US-006 | High | Pending |
| 3 | Booking Engine Core | US-020-022, US-031 | High | Pending |
| 4 | Booking Operations | US-010-015, US-025 | High | Pending |
| 5 | Dashboard & Calendar | US-004, US-010 | High | Pending |
| 6 | SaaS Billing | US-040-045 | Medium | Pending |
| 7 | Email Notifications | US-023, US-024 | Low | Pending |
| 8 | Reports & Analytics | US-005, US-032 | Medium | Pending |
| 9 | Customer Portal | US-026, US-027 | Medium | Pending |

---

## Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Slot locking race condition | High | Medium | Convex OCC + TTL |
| Polar webhook ordering | Medium | Low | Idempotent handlers |
| Email deliverability | Medium | Low | Resend reputation |
| Calendar performance | Medium | Medium | Pagination + virtualization |
| Multi-service booking complexity | High | Medium | Incremental implementation |

---

## Technical Notes

### Convex Best Practices

- All queries must be filtered by `organizationId` (RLS)
- Use `internalMutation`, `internalQuery` for internal functions
- Actions are only for external API calls
- Use scheduler for async operations

### Frontend Best Practices

- React Compiler is active - do not use manual memo
- TanStack Form + Zod validation
- Real-time data via Convex hooks
- Optimistic updates for better UX

### URL Structure

```
/                           # Landing
/sign-in                    # Auth
/onboarding                 # New user setup
/[slug]/dashboard           # Admin dashboard
/[slug]/calendar            # Calendar views
/[slug]/staff               # Staff management
/[slug]/services            # Service catalog
/[slug]/customers           # Customer management
/[slug]/reports             # Reports
/[slug]/billing             # Subscription
/[slug]/settings            # Settings
/[slug]/book                # Public booking (customer)
/[slug]/portal              # Customer portal
```

---

## Next Steps

~~Start Sprint 1:~~ ✅ COMPLETED

To complete Sprint 1.5:

1. Wire up cancel/resend buttons in InvitationsList component
2. Add invitation status badges
3. Wire up role change dropdown in MembersList component
4. Add member removal and leave organization buttons
5. Add 2-step confirmation to TransferOwnershipDialog
6. Commit untracked frontend files (staff profile, settings sub-forms, logo upload)

To start Sprint 2:

1. Service category CRUD (`convex/serviceCategories.ts`)
2. Service CRUD (`convex/services.ts`)
3. Services list page (`src/app/[slug]/services/page.tsx`)
4. Service form component
5. Price formatter (TRY currency)

> **Note:** Code review and testing should be performed at the end of each sprint.
