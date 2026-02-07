# Salon Management SaaS - Product Requirements Documentation

> **Last Updated:** 2026-02-07
> **Current Milestone:** 4 - Booking Operations 🚧 NEXT

Welcome to the PRD for the multi-tenant salon management platform. This documentation is optimized for AI navigation and human readability.

---

## Quick Navigation

| Document                                        | Purpose                                           | Status      |
| ----------------------------------------------- | ------------------------------------------------- | ----------- |
| [Product Overview](./product-overview.md)       | Vision, personas, business model, success metrics | ✅ Complete |
| [Database Schema](./database-schema.md)         | Complete Convex schema with all tables            | ✅ Complete |
| [API Reference](./api-reference.md)             | All Convex functions, validators, rate limits     | ✅ Complete |
| [System Architecture](./system-architecture.md) | Tech stack, multi-tenancy, security, deployment   | ✅ Complete |
| [Features](./features.md)                       | All feature specifications and user stories       | ✅ Complete |
| [Design System](./design-system.md)             | UI components, patterns, user flows               | ✅ Complete |
| [Glossary](./glossary.md)                       | Domain terminology and conventions                | ✅ Complete |

---

## Tech Stack Summary

**Frontend:**

- Next.js 16 (App Router, React Server Components)
- React 19 (with React Compiler)
- Tailwind CSS v4
- shadcn/ui (New York style, 56+ components)
- TanStack Form + Zod validation

**Backend:**

- Convex (database, functions, real-time subscriptions)
- convex-helpers (RLS, triggers, rate limiting)
- Better Auth (@convex-dev/better-auth with Convex adapter)

**Payments:**

- Polar.sh (@convex-dev/polar) - planned

**Tools:**

- Bun (package manager)
- Biome (linter/formatter)

---

## Completed Milestones

### Milestone 1: Multi-Tenant Foundation ✅ COMPLETED

- Organization CRUD, member/invitation management, RLS via custom function wrappers
- Better Auth with Google OAuth, role-based access (owner/admin/member)
- Staff profiles, settings, file storage, onboarding wizard

### Milestone 2: Services, Staff & Customers ✅ COMPLETED

**Phase 2A - Service Catalog:**

- `convex/serviceCategories.ts` (188 lines) - category CRUD with sortOrder
- `convex/services.ts` (353 lines) - service CRUD, staff assignment, soft-delete
- `convex/files.ts` (253 lines) - file storage including service images
- Pricing in kuruş integers (15000 = ₺150.00), `formatPrice()` at UI
- Frontend: 9 components in `src/modules/services/components/`

**Phase 2B - Staff Enhancements:**

- `convex/scheduleOverrides.ts` (178 lines) - date-specific schedule changes
- `convex/timeOffRequests.ts` (335 lines) - approval workflow
- `convex/staffOvertime.ts` (155 lines) - overtime management
- `convex/lib/scheduleResolver.ts` (163 lines) - default → overrides → overtime resolution
- Staff Detail Tabs: Overview, Schedule Overrides, Time Off, Overtime

**Phase 2C - Customer Database:**

- `convex/customers.ts` (~520 lines) - CRUD, search, advanced search, merge
- `convex/lib/phone.ts` - Turkish phone validation (+90 5XX XXX XX XX)
- Phone/email uniqueness per org via indexes
- Full-text search via `searchIndex("search_customers")` on name field
- Customer merge (combines stats, tags, latest visit date)
- Frontend: 7 components in `src/modules/customers/components/`

**Technical Highlights:**

- Permission model: orgMutation + handler-level check (self OR admin/owner)
- Time-off approval auto-creates schedule overrides (type="time_off")
- Rate limits: createScheduleOverride (30/day org), createTimeOffRequest (5/day staff), createOvertime (10/day staff), createCustomer (30/hour org)
- Staff-service assignment via `staff.serviceIds: v.array(v.id("services"))`
- Customer merge: combines stats (visits, spent, no-shows), unions tags, picks latest visit date

### Milestone 3: Booking Engine Core ✅ COMPLETED

**Backend (7 new files):**

- `convex/appointments.ts` (801 lines) - 9 functions: create, createByStaff, list, get, getByDate, getByConfirmationCode, listForCurrentUser, updateStatus, cancel
- `convex/slots.ts` (206 lines) - slot availability algorithm (publicQuery)
- `convex/slotLocks.ts` (145 lines) - acquire/release/cleanup with 2-min TTL
- `convex/appointmentServices.ts` (54 lines) - junction table operations
- `convex/crons.ts` (14 lines) - cleanup expired slot locks every 1 minute
- `convex/lib/confirmation.ts` (40 lines) - 6-char confirmation code generator
- `convex/lib/dateTime.ts` (78 lines) - date/time utilities

**Frontend (15 new files):**

- 12 components + 1 hook + constants + index in `src/modules/booking/` (1,667 lines)
- Multi-step booking: service → staff → date → time slot → customer info → confirmation
- `CreateAppointmentDialog` for staff-created bookings (walk-in, phone)
- `AppointmentList`, `UpdateStatusDropdown`, `CancelAppointmentDialog` for management

**Public Booking Flow:**

- `/:slug/book` - unauthenticated booking page
- `/:slug/appointment/:code` - confirmation lookup by code
- `organizations.listPublic`, `services.listPublic`, `staff.listPublicActive` public queries
- Salon directory home page at `/`

**Route Restructuring:**

- `[slug]/(authenticated)/` - dashboard, appointments, customers, staff, services, settings
- `[slug]/(public)/` - book, appointment/[code]

**Technical Highlights:**

- Slot availability: 15-min increments, staff schedule resolution, conflict detection
- Slot locking: 2-min TTL, one lock per session, cron cleanup every minute
- Confirmation codes: 6-char alphanumeric (excludes 0/O/I/1), unique per org
- Status transitions: pending → confirmed → checked_in → in_progress → completed (any → cancelled/no_show)
- Auto-updates customer stats on completion/no-show
- Rate limits: `createBooking`, `cancelBooking`
- Validators: ~716 lines (up from ~400)

---

## Current Sprint Status

### Milestone 4: Booking Operations 🚧 NEXT

**Prerequisites:** All complete (booking engine core with slot availability, locking, appointment creation)

**Planned Features:**

- Check-in/checkout workflow refinements
- Calendar views (day, week, month)
- Dashboard metrics and analytics
- Appointment rescheduling

See: [milestone-04-booking-operations.md](/docs/milestones/milestone-04-booking-operations.md) (to be created)

---

## Priority Map

### P0: MVP Must-Have (Milestones 1-5)

- Multi-tenant foundation ✅
- Service catalog ✅
- Staff management ✅
- Customer database ✅
- Booking engine ✅
- Admin dashboard 📋
- Subscription billing 📋

### P1: MVP Nice-to-Have (Milestones 6-7)

- Email notifications
- Advanced reports
- Analytics dashboard

### P2: Post-MVP (Milestones 8-9)

- Customer portal
- Products & inventory
- Mobile app (PWA)

---

## Key Architectural Decisions

### Multi-Tenancy

- Every table includes `organizationId` for tenant isolation
- Custom function wrappers (`orgQuery`, `adminMutation`) enforce RLS automatically
- Terminology: "organization" in code/database, "salon" in UI, "tenant" in architecture docs

### Authentication & Authorization

- Better Auth with Google OAuth (primary method)
- Custom function wrappers: `publicQuery`, `publicMutation`, `authedQuery`, `orgQuery`, `adminMutation`, `ownerMutation`
- 3 roles: Owner > Admin > Member (no "Receptionist" role)
- Role on `member` table, profile on `staff` table (separation of concerns)

### Data Validation

- All queries/mutations have `returns:` validators (~716 lines in `convex/lib/validators.ts`)
- Document validators include `_id` and `_creationTime` system fields
- `v.optional()` in args, bare validator in return types

### Rate Limiting

- Token bucket and fixed window strategies
- Configuration in `convex/lib/rateLimits.ts` (118 lines)
- Per-organization and per-user limits

---

## Documentation Structure

This PRD follows an **Ultra-Flat** structure (8 files) optimized for AI navigation:

```
docs/prd/
├── README.md              # This file - navigation hub
├── product-overview.md    # Vision, personas, business model
├── database-schema.md     # Complete Convex schema
├── api-reference.md       # All Convex functions
├── system-architecture.md # Tech stack, deployment, security
├── features.md            # Feature specs + user stories
├── design-system.md       # UI/UX patterns + flows
└── glossary.md            # Domain terminology
```

**Design Principles:**

- Minimal nesting (max 1 level)
- Consolidated related content
- Easy AI context loading
- Clear separation: PRD (requirements) vs milestones (implementation tracking)

---

## Quick Links

**For Developers:**

- [Database Schema](./database-schema.md#tables) - all tables with fields
- [API Reference](./api-reference.md#convex-functions) - function signatures
- [System Architecture](./system-architecture.md#tech-stack) - tech decisions

**For Product Managers:**

- [Product Overview](./product-overview.md#vision) - product vision
- [Features](./features.md#feature-specifications) - feature details
- [User Stories](./features.md#user-stories) - all user stories

**For Designers:**

- [Design System](./design-system.md#component-library) - UI components
- [User Flows](./design-system.md#user-flows) - journey diagrams
- [Accessibility](./design-system.md#accessibility) - WCAG guidelines

---

## Getting Started

1. Read [Product Overview](./product-overview.md) to understand the vision
2. Review [Database Schema](./database-schema.md) for data model
3. Check [Features](./features.md) for detailed specifications
4. Consult [Glossary](./glossary.md) for terminology

For implementation details, see `/docs/milestones/` directory.
