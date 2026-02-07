[PRD]

# Sprint 2: Services, Staff & Customers

## Overview

Sprint 2 establishes the core data entities required for booking operations: service catalog with pricing, staff profiles with schedules, and customer database. These three pillars form the foundation for the booking engine (Sprint 3-4).

**Problem Statement:** Salon owners need to define their service offerings, manage staff availability, and maintain customer records before they can accept bookings.

**Solution:** Comprehensive CRUD operations for services (with categories), staff management (with schedules and roles), and customer database (with search and validation).

## Goals

- Complete service catalog with categories, pricing, and durations
- Staff profile management with role-based access and schedules
- Customer database with search capabilities and phone validation
- Enable salon owners to configure all prerequisites for booking system

## Quality Gates

**Backend Stories (Convex):**

- `bunx convex dev` - Type generation and schema validation
- `bun run lint` - Biome linting (filter out `_generated/` errors)
- All mutations use custom wrappers from `convex/lib/functions.ts`
- All functions have `returns:` validators from `convex/lib/validators.ts`

**Frontend Stories (React/Next.js):**

- `bun run lint` - Biome linting
- `bun run build` - Production build verification
- Manual verification in browser (`bun run dev`)
- All forms use TanStack Form + Zod validation
- All components use shadcn/ui (New York style)

**Full-Stack Stories:**

- All backend quality gates
- All frontend quality gates
- End-to-end flow verification (create → list → edit → delete)

## Dependencies

**Requires completed:**

- Sprint 1: Multi-tenant foundation (organizations, members, RLS)
- Sprint 1.5: Enhanced multi-tenant features (staff management, settings)

**Provides foundation for:**

- Sprint 3: Booking Engine Core (requires services, staff, customers)
- Sprint 4: Booking Operations (requires all Sprint 2 entities)

**Blocks:**

- Sprint 3-4 cannot start without service catalog and staff schedules
- Sprint 5 dashboard requires these entities for metrics

## User Stories

### US-002: Service Catalog Management

**Description:** As a salon owner, I want to create and organize my services into categories with pricing and duration, so that customers can select services when booking.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Salon owner can create service categories (e.g., "Hair Care", "Nail Services")
- [x] Salon owner can create services with name, description, price (TRY), duration (minutes)
- [x] Services are organized by category in the UI
- [x] Salon owner can edit and delete services/categories
- [x] Services list displays price formatted as Turkish Lira (₺)
- [x] Duration is displayed in human-readable format (e.g., "1h 30m")
- [x] Categories can be reordered
- [x] Services within categories can be reordered

**Technical Notes:**

- Files to create:
  - `convex/serviceCategories.ts` - Category CRUD with `orgMutation`/`orgQuery`
  - `convex/services.ts` - Service CRUD with `orgMutation`/`orgQuery`
  - `src/app/[slug]/services/page.tsx` - Services list page
  - `src/modules/services/components/ServiceForm.tsx` - TanStack Form
  - `src/modules/services/components/CategoryForm.tsx` - TanStack Form
  - `src/lib/currency.ts` - TRY currency formatter
  - `src/lib/duration.ts` - Duration formatter
- Existing patterns:
  - Use `adminMutation` from `convex/lib/functions.ts` (admin/owner only)
  - Add validators to `convex/lib/validators.ts`:
    - `serviceCategoryDocValidator`
    - `serviceDocValidator`
  - Database tables: `serviceCategories`, `services` (already in schema)
  - Index by `organizationId` and `categoryId`
- Rate limiting: `createService` (20/hour per org)

### US-003: Staff Profile & Schedule Management

**Description:** As a salon owner, I want to manage staff profiles with their working hours and service assignments, so that the booking system knows staff availability.

**Complexity:** High

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Salon owner can view list of all staff members
- [x] Salon owner can edit staff profiles (name, bio, phone, image)
- [x] Salon owner can set staff working hours (different from business hours)
- [x] Salon owner can assign services to staff members
- [x] Staff members can edit their own profiles
- [x] Staff schedule shows weekly working hours in visual format
- [x] Staff can be marked as active/inactive
- [x] Inactive staff don't appear in booking flows

**Technical Notes:**

- Files to modify/create:
  - `convex/staff.ts` - Add `updateProfile`, `updateSchedule`, `assignServices` mutations
  - `src/app/[slug]/staff/page.tsx` - Staff list page (enhance existing)
  - `src/app/[slug]/staff/[id]/page.tsx` - Staff detail page (enhance existing)
  - `src/modules/staff/components/StaffForm.tsx` - Profile edit form
  - `src/modules/staff/components/ScheduleEditor.tsx` - Weekly schedule UI (enhance existing)
  - `src/modules/staff/components/ServiceAssignments.tsx` - Multi-select services
- Existing patterns:
  - Staff table already exists from Sprint 1
  - Use `adminMutation` for owner/admin editing
  - Use `authedMutation` for staff self-editing
  - Add `staffSchedule` table (many-to-many: staff ↔ weekdays)
  - Add `staffServices` table (many-to-many: staff ↔ services)
- Validators:
  - `staffScheduleDocValidator`
  - `staffServiceDocValidator`
  - Reuse `staffDocValidator` from Sprint 1

### US-006: Customer Database

**Description:** As a salon owner, I want to maintain a customer database with contact information and booking history, so that I can identify returning customers and track relationships.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Salon owner can manually add customers (name, phone, email)
- [x] Salon owner can search customers by name or phone
- [x] Phone numbers are validated (Turkish format: +90 5XX XXX XX XX)
- [x] Customer list shows name, phone, last appointment date
- [x] Customer detail page shows profile and appointment history (empty for now)
- [x] Customers can be edited and deleted
- [x] Duplicate phone numbers are prevented within same organization

**Technical Notes:**

- Files to create:
  - `convex/customers.ts` - Customer CRUD with search query
  - `convex/lib/phone.ts` - Turkish phone validation helper
  - `src/app/[slug]/customers/page.tsx` - Customer list with search
  - `src/app/[slug]/customers/[id]/page.tsx` - Customer detail page
  - `src/modules/customers/components/CustomerForm.tsx` - TanStack Form with Zod
  - `src/modules/customers/components/CustomerSearch.tsx` - Search component
- Existing patterns:
  - Use `orgMutation`/`orgQuery` from `convex/lib/functions.ts`
  - Database table: `customers` (already in schema)
  - Index by `organizationId`, `phone`, `email`
  - Add search index on `name` field
- Validators:
  - `customerDocValidator` in `convex/lib/validators.ts`
  - Phone regex: `^\\+90 5\\d{2} \\d{3} \\d{2} \\d{2}$`
- Rate limiting: `createCustomer` (30/hour per org)

### US-030: Service Assignment to Staff

**Description:** As a salon owner, I want to assign specific services to staff members, so that only qualified staff appear for certain service bookings.

**Complexity:** Low

**Type:** Backend

**Acceptance Criteria:**

- [x] Salon owner can assign multiple services to a staff member
- [x] Salon owner can remove service assignments
- [x] Staff detail page shows assigned services
- [x] Mutation validates that both staff and service belong to same organization
- [x] Mutation prevents duplicate assignments

**Technical Notes:**

- Files to modify:
  - `convex/staff.ts` - Add `assignService`, `removeService` mutations
  - Add to existing staff detail page UI
- Database:
  - Table: `staffServices` (junction table)
  - Indexes: `by_staff`, `by_service`, `by_organization_staff`
- Validators:
  - `staffServiceDocValidator`
- Security:
  - Use `adminMutation` (admin/owner only)
  - Validate organizationId match for both entities

## Functional Requirements

### Service Catalog

- FR-2.1: System must support hierarchical service categories (one level deep)
- FR-2.2: Service price must be stored in TRY (Turkish Lira) as integer (kuruş)
- FR-2.3: Service duration must be stored in minutes (15, 30, 45, 60, 90, 120, etc.)
- FR-2.4: Service categories must support custom ordering (`sortOrder` field)
- FR-2.5: Services within a category must support custom ordering
- FR-2.6: Soft deletion for services (mark as inactive instead of hard delete)

### Staff Management

- FR-2.7: Staff working hours can differ from organization business hours
- FR-2.8: Staff schedule supports different hours for each day of week
- FR-2.9: Staff can be assigned to multiple services
- FR-2.10: Staff status (active/inactive) determines visibility in booking
- FR-2.11: Staff profile image must use existing file storage (`convex/files.ts`)

### Customer Database

- FR-2.12: Phone numbers must be unique per organization
- FR-2.13: Email addresses must be unique per organization (if provided)
- FR-2.14: Customer search must support partial matching (name, phone)
- FR-2.15: Customer records must be soft-deleted (marked inactive)
- FR-2.16: Customer phone must be validated to Turkish mobile format

## Non-Goals (Out of Scope)

- Service packages/bundles (planned for Sprint 8)
- Staff commissions (planned for Sprint 8)
- Customer loyalty programs (post-MVP)
- Service add-ons or upsells (post-MVP)
- Multi-location staff assignments (v2.0)
- Customer payment methods storage (post-MVP, requires PCI compliance)
- SMS notifications for customers (Sprint 7 focuses on email only)

## Technical Considerations

### Database Schema Changes

All tables already exist in `convex/schema.ts` from Sprint 1. Only junction tables need to be verified:

- `staffServices` (many-to-many: staff ↔ services)
- Staff schedule is stored in `staff.schedule` field (JSON)

### Integration Points

- **File Storage:** Staff images use `convex/files.ts` (already implemented)
- **Organization Context:** All queries filter by `organizationId` via RLS
- **Rate Limiting:** Use `convex/lib/rateLimits.ts` for creation operations
- **Validators:** Extend `convex/lib/validators.ts` with new document validators

### Performance Considerations

- Service list query: Index by `organizationId` + `categoryId`
- Customer search: Full-text search index on `name` field
- Staff services: Composite index for efficient junction queries

### Security Considerations

- Service/staff/customer mutations require `adminMutation` (owner/admin only)
- Staff profile editing uses `authedMutation` (staff can edit own profile)
- Phone/email uniqueness validation must be organization-scoped
- All queries use custom wrappers with automatic RLS enforcement

## Success Metrics

### Sprint 2 Completion Criteria

- [x] At least 3 service categories can be created
- [x] At least 10 services can be created and organized
- [x] Staff schedules can be configured for all staff members
- [x] At least 20 customers can be added and searched
- [x] All CRUD operations work without errors
- [x] All forms validate inputs correctly
- [x] Price formatting displays correctly (₺1.234,56)

### Performance Targets

- Service list loads in <500ms (with 100 services)
- Customer search returns results in <300ms (with 1000 customers)
- Staff schedule editor loads in <400ms

## Implementation Order

### Phase 1: Service Catalog (2-3 hours)

1. Create `convex/serviceCategories.ts` with CRUD mutations
2. Create `convex/services.ts` with CRUD mutations
3. Add validators to `convex/lib/validators.ts`
4. Create currency and duration formatters in `src/lib/`
5. Build services list page with categories
6. Build service form component with TanStack Form

### Phase 2: Staff Enhancements (2-3 hours)

1. Add `staffServices` junction table mutations
2. Enhance staff profile page with service assignments
3. Build service assignment UI component

### Phase 3: Customer Database (2-3 hours)

1. Create `convex/customers.ts` with CRUD and search
2. Create `convex/lib/phone.ts` validation helper
3. Add customer validators
4. Build customer list page with search
5. Build customer form with phone validation
6. Build customer detail page (profile only, no history yet)

### Phase 4: Integration & Testing (1-2 hours)

1. Test all CRUD flows end-to-end
2. Verify rate limiting works
3. Verify RLS enforcement (cross-org isolation)
4. Manual UI testing in browser
5. Fix any Biome linting issues

## Open Questions

- **Q:** Should services support multiple pricing tiers (e.g., junior vs senior stylist)?
  - **A:** No, Sprint 2 keeps it simple. Staff-specific pricing is post-MVP.

- **Q:** Should customer email be required or optional?
  - **A:** Optional. Phone is primary identifier for Turkish market.

- **Q:** Should we support service variations (e.g., "Haircut - Short" vs "Haircut - Long")?
  - **A:** No, each variation should be a separate service for MVP.

- **Q:** Should staff be able to view customer database?
  - **A:** Yes, but with `orgQuery` (all authenticated staff can view, only admins can edit).

[/PRD]
