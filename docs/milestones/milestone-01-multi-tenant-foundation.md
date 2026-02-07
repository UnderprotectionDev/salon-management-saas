[PRD]

# Milestone 1: Multi-Tenant Foundation

## Overview

Milestone 1 establishes the complete multi-tenant architecture with organization management, member roles, staff profiles, row-level security, file storage, and comprehensive management UIs. This milestone transforms the application from single-user to a full-featured multi-tenant SaaS platform.

**Problem Statement:** The application needs a multi-tenant structure where multiple salon organizations can operate independently with their own data, members, staff, and assets (logos, images).

**Solution:** Implement organization entity with member management, role-based access control (owner/admin/member), staff profiles with image upload, invitation system with UI management, file storage system, ownership transfer, and complete settings pages.

## Goals

**Phase 1: Foundation (Milestone 1.0)**

- Create multi-tenant database schema with organization isolation
- Build onboarding wizard for new salon creation
- Implement member management with roles
- Create staff invitation system (backend)
- Build business hours editor
- Implement row-level security (RLS) with custom function wrappers

**Phase 2: Enhancements (Milestone 1.5)**

- Complete staff profile management UI (edit, schedule, image upload)
- Build member management UI (list, role change, remove, leave)
- Build invitation management UI (list, cancel, resend)
- Implement file storage system for logos and staff images
- Add ownership transfer feature with confirmation
- Create settings sub-forms for organization details
- Add return validators and rate limiting infrastructure

## Quality Gates

**Backend Stories (Convex):**

- `bunx convex dev` - Type generation and schema validation
- `bun run lint` - Biome linting (filter out `_generated/` errors)
- All mutations use custom wrappers from `convex/lib/functions.ts`
- All functions have `returns:` validators from `convex/lib/validators.ts`
- RLS enforcement verified (cross-org data isolation)
- File storage implements 3-step upload flow (generate URL → upload → store metadata)

**Frontend Stories (React/Next.js):**

- `bun run lint` - Biome linting
- `bun run build` - Production build verification
- Manual verification in browser (`bun run dev`)
- All forms use TanStack Form + Zod validation
- Image uploads work with progress indicators

**Full-Stack Stories:**

- All backend + frontend quality gates
- Onboarding flow works end-to-end
- Organization switcher changes context correctly
- Invitation flow works (create → send → accept)
- Staff profile editing saves correctly
- Member role changes update immediately (optimistic)
- File uploads complete within 10 seconds
- Ownership transfer requires double confirmation

## Dependencies

**Requires completed:**

- Pre-Milestone: Better Auth integration with Google OAuth
- Pre-Milestone: UI library setup (56 shadcn/ui components)

**Provides foundation for:**

- ALL subsequent milestones (Milestone 2-9 depend on multi-tenant foundation)

**Blocks:**

- No milestone can proceed without multi-tenant foundation

## User Stories

### US-001: Organization Onboarding Wizard

**Description:** As a new user, I want to create my salon organization through a guided wizard, so that I can set up my business profile and start using the platform.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] User is redirected to `/onboarding` after sign-in if no organization exists
- [x] Wizard step 1: Enter salon name, address, contact info
- [x] Wizard step 2: Set business hours for each day of week
- [x] Business hours include: open/close time, closed days, break times
- [x] Form validates all required fields (name, phone, city)
- [x] Submitting form creates organization record
- [x] User is automatically added as organization owner
- [x] User is redirected to `/{slug}/dashboard` after completion
- [x] Organization slug is auto-generated from salon name (lowercase, hyphenated)

**Technical Notes:**

- Files created:
  - `convex/organizations.ts` - Organization CRUD mutations and queries
  - `convex/members.ts` - Member management
  - `convex/staff.ts` - Staff profile management
  - `convex/invitations.ts` - Invitation system
  - `src/app/onboarding/page.tsx` - Onboarding wizard page
  - `src/modules/onboarding/components/OrganizationForm.tsx`
  - `src/modules/onboarding/components/BusinessHoursEditor.tsx`
- Database tables: `organization`, `organizationSettings`, `member`, `staff`
- Use `authedMutation` for creating organization
- Use `orgQuery`/`orgMutation` for organization-scoped operations

### US-030: Business Hours Configuration

**Description:** As a salon owner, I want to configure my business operating hours, so that customers can only book during open hours.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Owner can set open/close times for each day of week
- [x] Owner can mark specific days as closed
- [x] Owner can optionally set lunch break times
- [x] Business hours are stored in `organizationSettings` table
- [x] Business hours editor is accessible from Settings page
- [x] Changes save immediately with optimistic updates
- [x] Time format is 24-hour (HH:mm)

**Technical Notes:**

- Files: `src/app/[slug]/settings/page.tsx`, `src/components/business-hours/BusinessHoursEditor.tsx`
- Database: `organizationSettings.businessHours` (JSON field)
- Use `adminMutation` (owner/admin only)

### US-001.1: Staff Invitation System

**Description:** As a salon owner, I want to invite staff members via email, so that they can join my organization and access the platform.

**Complexity:** High

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Owner can send invitation with email and role (admin/member)
- [x] Invitation creates record with unique token
- [x] Invitation email is sent (console log for MVP, real email in Milestone7)
- [x] Invitation link: `{SITE_URL}/invitations/accept?token={token}`
- [x] Recipient clicks link and is redirected to accept page
- [x] Accepting invitation creates member and staff records
- [x] Accepting invitation redirects to `/{slug}/dashboard`
- [x] Invitations expire after 7 days
- [x] Invitations can be cancelled or resent

**Technical Notes:**

- Files: `convex/invitations.ts`, `src/app/invitations/accept/page.tsx`
- Database: `invitation` table
- Invitation token: `crypto.randomUUID()` (36 characters)
- Rate limiting: `createInvitation` (10/hour per org)

### US-001.2: Organization Switcher

**Description:** As a user who belongs to multiple organizations, I want to switch between them, so that I can manage multiple salons.

**Complexity:** Low

**Type:** Frontend

**Acceptance Criteria:**

- [x] Header shows organization switcher dropdown
- [x] Dropdown lists all organizations user belongs to
- [x] Selecting organization navigates to `/{slug}/dashboard`
- [x] Active organization is highlighted
- [x] Organization context persists across page navigation
- [x] URL slug determines active organization

**Technical Notes:**

- Files: `src/modules/organization/OrganizationProvider.tsx`, `src/modules/organization/components/OrganizationSwitcher.tsx`
- Context provides: `activeOrganization`, `organizations`, `currentStaff`, `currentRole`

### US-001.3: Row-Level Security (RLS)

**Description:** As a system, I want to enforce organization-scoped data access, so that users can only access data from their own organization.

**Complexity:** High

**Type:** Backend

**Acceptance Criteria:**

- [x] All queries automatically filter by `organizationId`
- [x] Custom function wrappers enforce membership checks
- [x] `orgQuery`/`orgMutation` auto-inject `organizationId` from args
- [x] `adminQuery`/`adminMutation` verify admin/owner role
- [x] Cross-organization data access is impossible
- [x] Attempting to access other org's data returns error

**Technical Notes:**

- Files: `convex/lib/functions.ts`, `convex/lib/rls.ts`
- Custom wrappers: `publicQuery`, `maybeAuthedQuery`, `authedQuery/Mutation`, `orgQuery/Mutation`, `adminQuery/Mutation`, `ownerQuery/Mutation`

### US-001.4: Protected Routes Middleware

**Description:** As a system, I want to protect organization routes with authentication, so that unauthenticated users cannot access salon dashboards.

**Complexity:** Low

**Type:** Backend

**Acceptance Criteria:**

- [x] Routes matching `/{slug}/*` require authentication
- [x] Unauthenticated users are redirected to `/sign-in`
- [x] After sign-in, users are redirected back to intended page
- [x] Public routes (sign-in, landing) are always accessible
- [x] Onboarding route is protected but doesn't require org membership

**Technical Notes:**

- File: `src/middleware.ts`
- Protected patterns: `/{slug}/*`
- Public routes: `/`, `/sign-in`, `/onboarding`

### US-001.5: Staff Profile Detail Page

**Description:** As a staff member, I want to view and edit my profile, so that I can keep my information up-to-date.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Staff detail page at `/{slug}/staff/[id]` shows profile info
- [x] Profile displays: name, email, phone, bio, image, role, schedule
- [x] "Edit Profile" button opens edit form
- [x] Staff can edit their own profile (name, phone, bio, image)
- [x] Admin/owner can edit any staff profile
- [x] Schedule editor shows weekly working hours
- [x] Changes save with optimistic updates

**Technical Notes:**

- Files: `src/app/[slug]/staff/[id]/page.tsx`, `src/modules/staff/components/StaffProfileForm.tsx`, `src/modules/staff/components/ScheduleEditor.tsx`
- Backend: `convex/staff.ts` - Add `updateProfile` mutation
- Use `authedMutation` for self-editing, `adminMutation` for admin editing

### US-001.6: Invitation Management UI

**Description:** As a salon owner, I want to view pending invitations and manage them (cancel/resend), so that I can track who I've invited.

**Complexity:** Low

**Type:** Frontend

**Acceptance Criteria:**

- [x] Settings page shows "Invitations" section
- [x] Invitations list shows: email, role, status, invited date, expiry date
- [x] Each invitation has "Cancel" and "Resend" buttons
- [x] Cancelling invitation updates status to "cancelled"
- [x] Resending invitation generates new token and extends expiry
- [x] Status badges color-coded (pending: yellow, accepted: green, cancelled: gray)
- [x] Empty state shows "No pending invitations"

**Technical Notes:**

- Files: `src/modules/settings/components/InvitationsList.tsx`
- Backend APIs: `api.invitations.list`, `api.invitations.cancel`, `api.invitations.resend`
- Rate limiting: `resendInvitation` (5/hour per org)

### US-001.7: Member Management UI

**Description:** As a salon owner, I want to view all members and manage their roles, so that I can control access levels.

**Complexity:** Medium

**Type:** Frontend

**Acceptance Criteria:**

- [x] Settings page shows "Members" section
- [x] Members list shows: name, email, role, joined date
- [x] Each member has role dropdown (owner cannot be changed)
- [x] Each member has "Remove" button (cannot remove owner)
- [x] Changing role updates immediately with optimistic UI
- [x] Removing member shows confirmation dialog
- [x] Current user can "Leave Organization" (not if owner)
- [x] Leaving organization redirects to dashboard or onboarding

**Technical Notes:**

- Files: `src/modules/settings/components/MembersList.tsx`
- Backend APIs: `api.members.list`, `api.members.updateRole`, `api.members.remove`, `api.members.leave`

### US-001.8: Ownership Transfer

**Description:** As a salon owner, I want to transfer ownership to another member, so that I can hand over control of the organization.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Settings page shows "Transfer Ownership" section (owner only)
- [x] Owner selects new owner from member dropdown
- [x] Transfer requires 2-step confirmation
- [x] Transfer updates roles: old owner → admin, new owner → owner
- [x] Transfer logs audit event
- [x] Only one owner allowed per organization (enforced)

**Technical Notes:**

- Files: `src/modules/settings/components/TransferOwnershipDialog.tsx`, `convex/members.ts` - Add `transferOwnership` mutation
- Use `ownerMutation` (owner only)

### US-001.9: Settings Sub-Forms

**Description:** As a salon owner, I want to edit organization details in organized sections, so that I can easily update specific information.

**Complexity:** Low

**Type:** Frontend

**Acceptance Criteria:**

- [x] Settings page has tabs: General, Contact, Address, Members, Invitations
- [x] General tab: Organization name, slug (read-only), logo upload
- [x] Contact tab: Phone, email, website
- [x] Address tab: Street, city, postal code, country
- [x] Each form section saves independently
- [x] Forms use optimistic updates
- [x] Success toast notification after save

**Technical Notes:**

- Files: `src/modules/settings/components/GeneralInfoForm.tsx`, `ContactInfoForm.tsx`, `AddressForm.tsx`
- Use shadcn/ui Tabs component
- Backend mutation: `api.organizations.update`

### US-001.10: File Storage System

**Description:** As a system, I want a secure file upload system for images, so that users can upload logos and staff photos.

**Complexity:** High

**Type:** Backend

**Acceptance Criteria:**

- [x] 3-step upload flow: Generate URL → Upload to storage → Save metadata
- [x] Generate signed upload URL with expiry (1 hour)
- [x] Upload directly to Convex storage from client
- [x] Store file metadata in database (URL, size, type, uploader)
- [x] Support image types: JPEG, PNG, WebP
- [x] Max file size: 5MB
- [x] Files are organization-scoped
- [x] Deletion removes file from storage and database

**Technical Notes:**

- Files: `convex/files.ts` (192 lines), `src/components/logo-upload/LogoUpload.tsx`
- Mutations: `generateUploadUrl`, `saveFileMetadata`, `deleteFile`
- Rate limiting: `generateUploadUrl` (20/hour per org)

### US-001.11: Logo Upload Component

**Description:** As a salon owner, I want to upload my salon logo, so that my brand appears on bookings and emails.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**

- [x] Settings General tab has logo upload area
- [x] Shows current logo if exists
- [x] Drag-and-drop or click to upload
- [x] Upload progress indicator
- [x] Image preview before confirming
- [x] Replace existing logo (deletes old file)
- [x] Upload validates file type and size
- [x] Logo appears in organization switcher

**Technical Notes:**

- File: `src/components/logo-upload/LogoUpload.tsx`
- Upload flow: Select → Validate → Generate URL → Upload → Save metadata → Update org record → Delete old

### US-001.12: Return Validators Infrastructure

**Description:** As a developer, I want all Convex functions to have return type validators, so that type safety is enforced at runtime.

**Complexity:** Medium

**Type:** Backend

**Acceptance Criteria:**

- [x] All queries/mutations have `returns:` property
- [x] Shared validators defined in `convex/lib/validators.ts`
- [x] Document validators include `_id` and `_creationTime`
- [x] Sub-validators are reusable (e.g., `roleValidator`)
- [x] Composite validators for enriched queries
- [x] Validators documented with JSDoc comments

**Technical Notes:**

- File: `convex/lib/validators.ts` (231 lines)
- Pattern: Sub-validators, document validators, composite validators
- Used in all query/mutation definitions with `returns:` property

### US-001.13: Rate Limiting Configuration

**Description:** As a system, I want to rate limit sensitive operations, so that abuse is prevented.

**Complexity:** Low

**Type:** Backend

**Acceptance Criteria:**

- [x] Rate limiter configured for all creation operations
- [x] Invitation creation: 10/hour per organization
- [x] Invitation resend: 5/hour per organization
- [x] Organization creation: 3/hour per user
- [x] Member addition: 20/hour per organization
- [x] File upload: 20/hour per organization
- [x] Rate limit errors return clear messages
- [x] Rate limits use token bucket or fixed window algorithm

**Technical Notes:**

- File: `convex/lib/rateLimits.ts` (104 lines)
- Uses `@convex-dev/rate-limiter` package
- Usage: `await rateLimiter.limit(ctx, "createInvitation", { key: ctx.organizationId })`

## Functional Requirements

- FR-1.1: Organization slug must be unique across all organizations
- FR-1.2: Business hours are stored in Europe/Istanbul timezone by default
- FR-1.3: Invitation tokens expire after 7 days (604,800,000ms)
- FR-1.4: User creating organization is automatically assigned owner role
- FR-1.5: Owner role cannot be removed (only transferred)
- FR-1.6: Each organization must have exactly one owner at all times
- FR-1.7: Staff profile images must be <5MB
- FR-1.8: Logo images must be <5MB
- FR-1.9: Supported image formats: JPEG, PNG, WebP
- FR-1.10: File upload URLs expire after 1 hour
- FR-1.11: Ownership transfer requires typing "TRANSFER" for confirmation

## Non-Goals (Out of Scope)

- Multi-location support — single location per organization
- Custom branding/white-labeling
- API keys for third-party integrations
- Organization billing — deferred to Milestone 6
- Email notifications — deferred to Milestone 7
- Advanced permissions — beyond owner/admin/member
- Video uploads — images only for MVP
- Custom file storage provider — use Convex storage
- Audit log viewer UI — table exists, UI deferred to Milestone 8

## Technical Considerations

### Database Schema Design

```typescript
// Core tables created in Milestone 1
organization: defineTable({
  name: v.string(),
  slug: v.string(),
  address: v.string(),
  city: v.string(),
  country: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  logoUrl: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_slug", ["slug"]),

organizationSettings: defineTable({
  organizationId: v.id("organization"),
  timezone: v.string(),
  businessHours: v.any(),
  bookingSettings: v.any(),
}).index("by_organization", ["organizationId"]),

member: defineTable({
  userId: v.id("users"),
  organizationId: v.id("organization"),
  role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  joinedAt: v.number(),
}).index("by_user", ["userId"])
  .index("by_organization", ["organizationId"])
  .index("by_user_organization", ["userId", "organizationId"]),

staff: defineTable({
  memberId: v.id("member"),
  organizationId: v.id("organization"),
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  bio: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  schedule: v.any(),
  status: v.union(v.literal("active"), v.literal("inactive")),
}).index("by_organization", ["organizationId"])
  .index("by_member", ["memberId"]),

invitation: defineTable({
  organizationId: v.id("organization"),
  email: v.string(),
  role: v.union(v.literal("admin"), v.literal("member")),
  token: v.string(),
  invitedBy: v.id("users"),
  status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("cancelled")),
  expiresAt: v.number(),
  createdAt: v.number(),
}).index("by_token", ["token"])
  .index("by_organization", ["organizationId"]),

files: defineTable({
  storageId: v.string(),
  organizationId: v.id("organization"),
  uploadedBy: v.id("users"),
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
  url: v.string(),
}).index("by_organization", ["organizationId"]),
```

### Custom Function Wrappers

Located in `convex/lib/functions.ts`:

- Wrap standard Convex `query()` and `mutation()`
- Add authentication checks via Better Auth
- Add membership and role validation
- Auto-inject `organizationId` from args for `orgQuery`/`orgMutation`
- Provide typed context: `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff`
- Throw `ConvexError` with structured error codes

### File Storage Architecture

- **Storage Provider**: Convex built-in file storage
- **Upload Pattern**: Client → Convex signed URL → Storage
- **Metadata**: Stored in `files` table for querying
- **Security**: Signed URLs with 1-hour expiry, organization-scoped access
- **Deletion**: Cascade delete (remove from storage + database)

### Rate Limiting Strategy

- **Library**: `@convex-dev/rate-limiter`
- **Algorithms**: Token Bucket (smooth) and Fixed Window (simple)
- **Keys**: Scoped by organizationId or userId
- **Storage**: Rate limit state stored in Convex tables

## Success Metrics

- [x] User can complete onboarding in <2 minutes
- [x] Organization creation succeeds 100% of the time
- [x] Invitation acceptance succeeds 100% of the time
- [x] Zero cross-organization data leaks
- [x] All routes properly protected
- [x] Organization switcher works across all pages
- [x] Staff profile editing works for all staff members
- [x] File uploads succeed >95% of the time
- [x] Logo appears in organization switcher after upload
- [x] Member role changes update within 500ms
- [x] Ownership transfer requires double confirmation
- [x] Rate limiting prevents >10 invitations/hour

## Implementation Order

### Phase 1: Database Schema (1-2 hours) ✅

1. Define all tables in `convex/schema.ts`
2. Run `bunx convex dev` to generate types
3. Verify indexes are created

### Phase 2: Custom Function Wrappers (2-3 hours) ✅

1. Create `convex/lib/functions.ts`
2. Implement all custom wrappers
3. Add error handling with `ConvexError`

### Phase 3: Backend Mutations (3-4 hours) ✅

1. Create organization, member, staff, invitation CRUD
2. Add return validators to `convex/lib/validators.ts` (231 lines)

### Phase 4: Onboarding Wizard (3-4 hours) ✅

1. Create onboarding page and forms
2. Build business hours editor component
3. Wire up form submission

### Phase 5: Organization Context (2-3 hours) ✅

1. Create OrganizationProvider
2. Create useOrganization() hook
3. Build OrganizationSwitcher component

### Phase 6: Invitation Flow (2-3 hours) ✅

1. Build invitation acceptance page
2. Add invitation banner
3. Test full invitation flow

### Phase 7: Middleware & Protection (1-2 hours) ✅

1. Create middleware with auth checks
2. Configure public/protected routes

### Phase 8: Settings Page (2 hours) ✅

1. Create settings layout with tabs
2. Add business hours editor
3. Add organization info editors

### Phase 9: Return Validators & Rate Limiting (3-4 hours) ✅

1. Create `convex/lib/validators.ts` (231 lines)
2. Create `convex/lib/rateLimits.ts` (104 lines)
3. Add validators to all existing functions
4. Add rate limit checks to creation mutations

### Phase 10: File Storage Backend (3-4 hours) ✅

1. Create `convex/files.ts` (192 lines)
2. Implement 3-step upload flow
3. Add file validators

### Phase 11: Logo Upload UI (2-3 hours) ✅

1. Create LogoUpload component
2. Implement drag-and-drop
3. Add to Settings General tab

### Phase 12: Staff Profile Management (3-4 hours) ✅

1. Create staff detail page
2. Build profile edit form
3. Build schedule editor
4. Add staff image upload

### Phase 13: Member & Invitation Management UI (3-4 hours) ✅

1. Create MembersList component
2. Add role change, remove member
3. Create InvitationsList component
4. Add cancel/resend buttons

### Phase 14: Ownership Transfer (2-3 hours) ✅

1. Create transferOwnership mutation
2. Create TransferOwnershipDialog
3. Implement 2-step confirmation

### Phase 15: Settings Sub-Forms (2-3 hours) ✅

1. Create GeneralInfoForm, ContactInfoForm, AddressForm
2. Add tabs to Settings page
3. Wire up update mutations

### Phase 16: Integration & Testing (3-4 hours) ✅

1. Test all flows end-to-end
2. Verify RLS enforcement
3. Test file upload flow
4. Test ownership transfer
5. Verify rate limiting

## Completion Summary

**Completion Date:** 2026-02-06 (Combined Milestone 1 + 1.5)

**Status:** ✅ COMPLETED

**Deliverables Completed:**

**Foundation (Milestone 1.0):**

- ✅ Database schema with 6 core tables
- ✅ Custom function wrappers with RLS enforcement
- ✅ Onboarding wizard (2-step flow)
- ✅ Business hours editor
- ✅ Staff invitation system (backend)
- ✅ Organization switcher
- ✅ Protected routes middleware

**Enhancements (Milestone 1.5):**

- ✅ Staff profile detail page & edit form
- ✅ Staff schedule editor
- ✅ File storage system (192 lines in `convex/files.ts`)
- ✅ Logo upload component
- ✅ Members management UI
- ✅ Invitations management UI
- ✅ Ownership transfer with 2-step confirmation
- ✅ Settings sub-forms (General, Contact, Address)
- ✅ Return validators (231 lines in `convex/lib/validators.ts`)
- ✅ Rate limiting configuration (104 lines in `convex/lib/rateLimits.ts`)

**Total Lines of Code Added:**

- `convex/lib/validators.ts`: 231 lines
- `convex/lib/rateLimits.ts`: 104 lines
- `convex/files.ts`: 192 lines
- Backend mutations (organizations, members, staff, invitations): ~600 lines
- Frontend components: ~1,200 lines

**Key Learnings:**

- Custom function wrappers are critical for RLS enforcement
- Organization slug must be validated for uniqueness
- Invitation tokens should be cryptographically secure (UUID)
- 3-step upload flow provides security and progress tracking
- Return validators catch type errors before production
- Rate limiting prevents abuse without hurting UX
- Ownership transfer requires extra confirmation due to irreversibility
- Optimistic updates improve perceived performance

**Next Milestone:**
Milestone 2 will build on this foundation to add service catalog, staff service assignments, and customer database management.

[/PRD]
