# Salon Management SaaS - Product Requirements Documentation

> **Last Updated:** 2026-02-07
> **Current Milestone:** 2 - Services, Staff & Customers ✅ COMPLETED

Welcome to the PRD for the multi-tenant salon management platform. This documentation is optimized for AI navigation and human readability.

---

## Quick Navigation

| Document | Purpose | Status |
|----------|---------|--------|
| [Product Overview](./product-overview.md) | Vision, personas, business model, success metrics | ✅ Complete |
| [Database Schema](./database-schema.md) | Complete Convex schema with all tables | ✅ Complete |
| [API Reference](./api-reference.md) | All Convex functions, validators, rate limits | ✅ Complete |
| [System Architecture](./system-architecture.md) | Tech stack, multi-tenancy, security, deployment | ✅ Complete |
| [Features](./features.md) | All feature specifications and user stories | ✅ Complete |
| [Design System](./design-system.md) | UI components, patterns, user flows | ✅ Complete |
| [Glossary](./glossary.md) | Domain terminology and conventions | ✅ Complete |

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

## Current Sprint Status

### Milestone 2: Services, Staff & Customers ✅ COMPLETED (2026-02-07)

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
- `convex/customers.ts` (~500 lines) - CRUD, search, advanced search, merge
- `convex/lib/phone.ts` - Turkish phone validation (+90 5XX XXX XX XX)
- Phone/email uniqueness per org via indexes
- Full-text search via `searchIndex("search_customers")` on name field
- Customer merge (combines stats, tags, latest visit date)
- Frontend: 7 components in `src/modules/customers/components/`

**Technical Highlights:**
- Permission model: orgMutation + handler-level check (self OR admin/owner)
- Time-off approval auto-creates schedule overrides (type="time_off")
- Rate limits: createScheduleOverride (30/day org), createTimeOffRequest (5/day staff), createOvertime (10/day staff)
- Staff-service assignment via `staff.serviceIds: v.array(v.id("services"))`

### Next Milestone: 3 - Booking Engine Core 📋 Pending

**Planned Features:**
- Available slot calculation (service duration, staff schedule, existing bookings)
- Slot locking mechanism (2-minute TTL, cron cleanup)
- Appointment creation (multi-service, confirmation code)
- Real-time slot updates via Convex subscriptions

See: [milestone-03-booking-engine-core.md](/docs/milestones/milestone-03-booking-engine-core.md)

---

## Priority Map

### P0: MVP Must-Have (Milestones 1-5)
- Multi-tenant foundation ✅
- Service catalog ✅
- Staff management ✅
- Customer base ✅
- Booking engine 📋
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
- Custom function wrappers: `publicQuery`, `authedQuery`, `orgQuery`, `adminMutation`, `ownerMutation`
- 3 roles: Owner > Admin > Member (no "Receptionist" role)
- Role on `member` table, profile on `staff` table (separation of concerns)

### Data Validation
- All queries/mutations have `returns:` validators (309 lines in `convex/lib/validators.ts`)
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
