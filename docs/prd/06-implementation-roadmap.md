# 06 - Implementation Roadmap

> **Version:** 1.2.0
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
| ~~Service Catalog~~ | ~~P0~~ | ~~Sprint 2A~~ | ✅ Done |
| Staff Management | P0 | Sprint 2B | Pending |
| Customer Base | P0 | Sprint 2C | Pending |
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
     │   SPRINT 2A ✅  │  │   SPRINT 2B     │  │   SPRINT 2C    │
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

## Sprint 1.5: Multi-Tenant Enhancements ✅ COMPLETED

> **Goal:** Complete multi-tenant core features
> **Dependency:** Sprint 1 (✅ Done)
> **Status:** ✅ Completed
> **Completion Date:** 2026-02-06

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
| Invitations list component | `src/modules/settings/components/InvitationsList.tsx` | ✅ Done |
| Cancel invitation button | Uses `api.invitations.cancel` | ✅ Done |
| Resend invitation button | Uses `api.invitations.resend` | ✅ Done |
| Invitation status badges | Inline in InvitationsList | ✅ Done |
| Add to settings or staff page | `src/app/[slug]/settings/page.tsx` | ✅ Done |

### Members Management

| Task | File | Status |
|------|------|--------|
| Members list component | `src/modules/settings/components/MembersList.tsx` | ✅ Done |
| Member card component | Inline in MembersList | ✅ Done |
| Role change dropdown | Inline in MembersList | ✅ Done |
| Remove member button | Uses `api.members.remove` | ✅ Done |
| Leave organization button | Uses `api.members.leave` | ✅ Done |

### Transfer Ownership

| Task | File | Status |
|------|------|--------|
| Transfer ownership mutation | `convex/members.ts` | ✅ Done |
| Transfer ownership dialog | `src/modules/settings/components/TransferOwnershipDialog.tsx` | ✅ Done |
| Confirmation dialog | 2-step flow implemented | ✅ Done |

### Settings Sub-Forms

| Task | File | Status |
|------|------|--------|
| General info form | `src/modules/settings/components/GeneralInfoForm.tsx` | ✅ Done |
| Contact info form | `src/modules/settings/components/ContactInfoForm.tsx` | ✅ Done |
| Address form | `src/modules/settings/components/AddressForm.tsx` | ✅ Done |
| Logo upload component | `src/components/logo-upload/LogoUpload.tsx` | ✅ Done |

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

- [x] Staff profile detail page (`/[slug]/staff/[id]`)
- [x] Staff profile edit form
- [x] Staff schedule editor
- [x] Pending invitations list
- [x] Invitation cancel/resend buttons
- [x] Members list component
- [x] Member role change dropdown
- [x] Member removal button
- [x] Transfer ownership feature

---

## Sprint 2A: Service Catalog ✅ COMPLETED

> **Goal:** Build the service catalog with categories, pricing, staff assignment, and image uploads
> **Dependency:** Sprint 1 + 1.5 (✅ Done)
> **User Stories:** US-002
> **Completion Date:** 2026-02-06

### Tasks

#### Backend (Convex)

| Task | File | Lines | Status |
|------|------|-------|--------|
| Service categories CRUD | `convex/serviceCategories.ts` | 188 | ✅ Done |
| Services CRUD + staff assignment | `convex/services.ts` | 353 | ✅ Done |
| Service image upload mutation | `convex/files.ts` (saveServiceImage) | 253 | ✅ Done |
| Service/category validators | `convex/lib/validators.ts` | 309 | ✅ Done |
| createService rate limit | `convex/lib/rateLimits.ts` | 118 | ✅ Done |
| Schema: serviceCategories + services tables | `convex/schema.ts` | — | ✅ Done |
| Schema: staff.serviceIds typed as v.id("services") | `convex/schema.ts` | — | ✅ Done |
| Move getCurrentUser to separate file | `convex/users.ts` | 10 | ✅ Done |

#### Frontend (Next.js)

| Task | File | Lines | Status |
|------|------|-------|--------|
| Services page | `src/app/[slug]/services/page.tsx` | — | ✅ Done |
| Services list table | `src/modules/services/components/ServicesList.tsx` | 199 | ✅ Done |
| Add service dialog | `src/modules/services/components/AddServiceDialog.tsx` | 369 | ✅ Done |
| Edit service dialog | `src/modules/services/components/EditServiceDialog.tsx` | 389 | ✅ Done |
| Delete service dialog | `src/modules/services/components/DeleteServiceDialog.tsx` | 71 | ✅ Done |
| Category sidebar | `src/modules/services/components/CategorySidebar.tsx` | 239 | ✅ Done |
| Add category popover | `src/modules/services/components/AddCategoryPopover.tsx` | 89 | ✅ Done |
| Service image upload | `src/modules/services/components/ServiceImageUpload.tsx` | 183 | ✅ Done |
| Staff assignment select | `src/modules/services/components/StaffAssignmentSelect.tsx` | 83 | ✅ Done |
| Price display component | `src/modules/services/components/PriceDisplay.tsx` | 21 | ✅ Done |
| Currency utilities | `src/modules/services/lib/currency.ts` | 15 | ✅ Done |
| Module exports | `src/modules/services/index.ts` | 9 | ✅ Done |
| Enable services nav item | `src/app/[slug]/layout.tsx` | — | ✅ Done |

### Schema Tables (Sprint 2A)

```typescript
// Created tables:
- serviceCategories ✅ (name, description, sortOrder, indexes)
- services ✅ (name, duration, price, priceType, categoryId, status, showOnline, etc.)

// Modified:
- staff.serviceIds: v.array(v.string()) → v.array(v.id("services")) ✅
```

### Backend APIs (Implemented)

```typescript
// Service Categories:
- api.serviceCategories.list ✅ (orgQuery - with service counts)
- api.serviceCategories.create ✅ (adminMutation - duplicate name check)
- api.serviceCategories.update ✅ (adminMutation - rename with validation)
- api.serviceCategories.remove ✅ (adminMutation - reassigns services)

// Services:
- api.services.list ✅ (orgQuery - filter by category/status, enriched with categoryName)
- api.services.get ✅ (orgQuery - single service with category)
- api.services.create ✅ (adminMutation - rate limited, auto sortOrder)
- api.services.update ✅ (adminMutation - partial update)
- api.services.remove ✅ (adminMutation - soft-delete, removes from staff)
- api.services.assignStaff ✅ (adminMutation - toggle staff assignment)
- api.services.getStaffForService ✅ (orgQuery - active staff with service)

// Files:
- api.files.saveServiceImage ✅ (adminMutation - 2MB, JPEG/PNG/WebP)

// Users:
- api.users.getCurrentUser ✅ (maybeAuthedQuery - moved from auth.ts)
```

### Key Design Decisions

- **Pricing:** Stored as kuruş integers (15000 = ₺150.00), converted at UI boundary
- **Soft-delete:** Services set to `status: "inactive"` (never hard deleted for booking history)
- **Staff assignment:** Via `staff.serviceIds` array (add/remove service IDs)
- **Category removal:** Reassigns services to uncategorized (categoryId = undefined)
- **Rate limiting:** 50 service creates/day per organization

### Deliverables

- [x] Service categories CRUD with inline management sidebar
- [x] Service CRUD with category filtering
- [x] Pricing display (fixed, starting_from, variable)
- [x] Staff-service assignment (checkbox in edit dialog)
- [x] Service image upload
- [x] Soft-delete for services
- [x] Role-based UI (admin/owner: CRUD, member: read-only)
- [x] Services navigation enabled in sidebar

### Definition of Done ✅

1. ✅ Admin can create/edit/delete service categories
2. ✅ Admin can create/edit/deactivate services
3. ✅ Services display with category filter
4. ✅ Staff can be assigned to services
5. ✅ Service images can be uploaded
6. ✅ Pricing displayed in TRY (₺)

### Bug Fixes During Sprint

- **Circular dependency fix:** Moved `getCurrentUser` from `convex/auth.ts` to `convex/users.ts` to break circular import between `auth.ts` ↔ `lib/functions.ts`
- **Edit dialog bug:** Fixed wrong service data appearing in edit dialog by adding `key={editTarget?._id}` to force form remount

---

## Sprint 2B: Staff Management Enhancements

> **Status:** 📋 Pending
> **Dependencies:** Sprint 2A (✅ Done)
> **User Stories:** US-003, US-030

### High-Level Goals
- Schedule overrides and time-off requests
- Enhanced staff management with service assignments view

### Key Deliverables
- [ ] Staff schedule override management
- [ ] Time-off request/approval workflow
- [ ] Staff overtime management

---

## Sprint 2C: Customer Base

> **Status:** 📋 Pending
> **Dependencies:** Sprint 2A (✅ Done)
> **User Stories:** US-006

### High-Level Goals
- Customer database with search and phone validation
- Customer profiles with visit history

### Key Deliverables
- [ ] Customer CRUD with Turkish phone validation
- [ ] Customer search and filtering
- [ ] Customer profile with stats

For detailed user stories, acceptance criteria, and implementation tasks, see the [detailed Sprint 2 PRD](../tasks/sprint-02-services-staff-customers.md).

---

## Sprint 3: Booking Engine - Core

> **Status:** 📋 Pending
> **Dependencies:** Sprint 2 (Services, Staff, Customers)
> **User Stories:** US-020, US-021, US-022, US-031
> **Detailed PRD:** [../tasks/sprint-03-booking-engine-core.md](../tasks/sprint-03-booking-engine-core.md)

### High-Level Goals
- Implement slot availability calculation algorithm
- Create slot locking mechanism for concurrent booking prevention
- Build appointment CRUD with multi-service support
- Enable real-time slot updates

### Key Deliverables
- [ ] Slot availability algorithm (considers staff schedules, existing bookings, locks)
- [ ] Slot locking with 2-minute TTL
- [ ] Appointment creation with confirmation codes
- [ ] Real-time updates via Convex subscriptions

For detailed algorithm logic, technical specifications, and implementation order, see the [detailed Sprint 3 PRD](../tasks/sprint-03-booking-engine-core.md).

---

## Sprint 4: Booking Engine - Operations

> **Status:** 📋 Pending
> **Dependencies:** Sprint 3 (Booking Core)
> **User Stories:** US-010, US-011, US-012, US-014, US-015, US-025
> **Detailed PRD:** [../tasks/sprint-04-booking-operations.md](../tasks/sprint-04-booking-operations.md)

### High-Level Goals
- Complete 7-step online booking wizard with OTP verification
- Build walk-in quick booking for staff
- Implement appointment lifecycle operations (check-in, checkout, cancel, no-show)
- Add rescheduling with 2-hour policy enforcement

### Key Deliverables
- [ ] Multi-step booking wizard with customer info collection
- [ ] OTP verification (mock for MVP, console log)
- [ ] Walk-in quick booking form
- [ ] Status transitions: pending → confirmed → checked_in → completed
- [ ] Cancellation and rescheduling (2-hour policy)

For detailed status flow, OTP implementation, and wizard steps, see the [detailed Sprint 4 PRD](../tasks/sprint-04-booking-operations.md).

---

## Sprint 5: Admin Dashboard & Calendar

> **Status:** 📋 Pending
> **Dependencies:** Sprint 4 (Booking Operations)
> **User Stories:** US-004, US-010
> **Detailed PRD:** [../tasks/sprint-05-dashboard-calendar.md](../tasks/sprint-05-dashboard-calendar.md)

### High-Level Goals
- Create admin dashboard with real-time metrics
- Build calendar views (day/week) with appointment visualization
- Implement drag-and-drop rescheduling
- Add notification system with bell icon

### Key Deliverables
- [ ] Dashboard with KPI cards (today/week/month metrics)
- [ ] Today's appointments widget
- [ ] Calendar day and week views
- [ ] Drag-drop rescheduling with validation
- [ ] Real-time notification panel

For detailed metrics calculations, calendar implementation, and drag-drop logic, see the [detailed Sprint 5 PRD](../tasks/sprint-05-dashboard-calendar.md).

---

## Sprint 6: SaaS Billing (Polar.sh)

> **Status:** 📋 Pending
> **Dependencies:** Sprint 5 (Dashboard)
> **User Stories:** US-040, US-041, US-042, US-043, US-044, US-045
> **Detailed PRD:** [../tasks/sprint-06-saas-billing.md](../tasks/sprint-06-saas-billing.md)

### High-Level Goals
- Integrate Polar.sh for subscription billing
- Handle subscription webhooks (created, updated, cancelled, payment failed)
- Implement 7-day grace period for payment failures
- Build billing UI with subscription management

### Key Deliverables
- [ ] Polar checkout flow (Monthly ₺299, Yearly ₺2,990)
- [ ] Webhook handler with signature validation
- [ ] Grace period management (7 days)
- [ ] Billing page with status, history, and cancellation
- [ ] Subscription middleware (suspend access if expired)

For detailed webhook events, grace period logic, and subscription states, see the [detailed Sprint 6 PRD](../tasks/sprint-06-saas-billing.md).

---

## Sprint 7: Email Notifications (Resend)

> **Status:** 📋 Pending
> **Dependencies:** Sprint 4 (Booking), Sprint 6 (Billing)
> **User Stories:** US-023, US-024
> **Detailed PRD:** [../tasks/sprint-07-email-notifications.md](../tasks/sprint-07-email-notifications.md)

### High-Level Goals
- Integrate Resend for email delivery
- Create React Email templates for all notification types
- Schedule 24-hour advance reminders
- Send transactional emails (booking, cancellation, payment failures)

### Key Deliverables
- [ ] Resend integration with domain verification
- [ ] React Email templates (BookingConfirmation, Reminder, Cancellation, StaffInvitation, PaymentFailed)
- [ ] ICS calendar attachments
- [ ] Reminder scheduler (daily cron at 09:00 UTC)
- [ ] Email retry logic (3 attempts)

For detailed email template specifications, ICS format, and scheduler logic, see the [detailed Sprint 7 PRD](../tasks/sprint-07-email-notifications.md).

---

## Sprint 8: Reports & Analytics (P1)

> **Status:** 📋 Pending
> **Dependencies:** Sprint 5 (Dashboard), Sprint 4 (Completed appointments)
> **User Stories:** US-005, US-032
> **Detailed PRD:** [../tasks/sprint-08-reports-analytics.md](../tasks/sprint-08-reports-analytics.md)

### High-Level Goals
- Build revenue reporting with trends and breakdowns
- Create staff performance analytics (utilization, no-show rate)
- Build customer analytics (new vs returning, retention)
- Add date range filtering and CSV export

### Key Deliverables
- [ ] Revenue report (total, by service, by staff, trend chart)
- [ ] Staff performance report (appointments, revenue, utilization %)
- [ ] Customer analytics (new vs returning, top customers)
- [ ] Date range picker with presets
- [ ] CSV export functionality

For detailed metrics calculations, utilization formulas, and export implementation, see the [detailed Sprint 8 PRD](../tasks/sprint-08-reports-analytics.md).

---

## Sprint 9: Customer Portal (P1)

> **Status:** 📋 Pending
> **Dependencies:** Sprint 4 (Booking), Sprint 7 (Email - magic link)
> **User Stories:** US-026, US-027
> **Detailed PRD:** [../tasks/sprint-09-customer-portal.md](../tasks/sprint-09-customer-portal.md)

### High-Level Goals
- Implement passwordless magic link authentication for customers
- Build customer appointment history view
- Enable self-service rescheduling and cancellation
- Add "Book again" functionality

### Key Deliverables
- [ ] Magic link authentication (15-minute TTL)
- [ ] Appointment history (active and past)
- [ ] Self-service rescheduling (respects 2-hour policy)
- [ ] Self-service cancellation (respects 2-hour policy)
- [ ] "Book again" with pre-filled services
- [ ] Customer profile settings

For detailed magic link implementation, authentication architecture, and security considerations, see the [detailed Sprint 9 PRD](../tasks/sprint-09-customer-portal.md).

---

## Sprint Summary Table

| Sprint | Goal | User Stories | Complexity | Status |
|--------|------|-------------|------------|--------|
| 1 | Multi-Tenant Foundation | US-001, US-030 | Medium | ✅ Done |
| 1.5 | Multi-Tenant Enhancements | US-001, US-030 | Medium | ✅ Done |
| 2A | Service Catalog | US-002 | Medium | ✅ Done |
| 2B | Staff Management | US-003, US-030 | Medium | Pending |
| 2C | Customer Base | US-006 | Medium | Pending |
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

## Working with Sprint PRDs

### For Developers

Each sprint has a detailed PRD in `docs/tasks/` that can be used with ralph-tui or read directly:

```bash
# View all sprint PRDs
ls docs/tasks/

# Read a specific sprint PRD
cat docs/tasks/sprint-02-services-staff-customers.md
```

### For Ralph-TUI

Sprint PRDs are wrapped in `[PRD]...[/PRD]` markers for ralph-tui compatibility:

```bash
# Generate tasks from a sprint PRD
ralph-tui-create-json docs/tasks/sprint-02-services-staff-customers.md

# Create GitHub/Linear issues
ralph-tui-create-beads docs/tasks/sprint-02-services-staff-customers.md
```

### Next Sprint to Start

**Sprint 2B: Staff Management Enhancements**
- See: [docs/tasks/sprint-02-services-staff-customers.md](../tasks/sprint-02-services-staff-customers.md)
- Start with: Schedule overrides and time-off requests
- Then: Staff overtime management
- Finally: Enhanced staff views with service assignments

**Sprint 2C: Customer Base**
- Customer CRUD with Turkish phone validation
- Customer profiles with visit stats

> **Note:** Code review and testing should be performed at the end of each sprint. Use the quality gates defined in each sprint PRD.
