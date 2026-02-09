# Milestone 1: Multi-Tenant Foundation ✅

**Status:** Completed | **User Stories:** 13 | **Completed:** 2026-02-06

## Summary

Established complete multi-tenant architecture: organization CRUD, member roles (owner/admin/member), staff profiles, RLS via custom function wrappers, file storage (3-step upload), invitation system, ownership transfer, and settings pages.

## What Was Built

- **Database:** organization, organizationSettings, member, staff, invitation, files tables
- **RLS:** Custom wrappers in `convex/lib/functions.ts` (publicQuery → ownerMutation hierarchy)
- **Validators:** `convex/lib/validators.ts` (231 lines initial)
- **Rate Limits:** `convex/lib/rateLimits.ts` (104 lines initial)
- **File Storage:** `convex/files.ts` - 3-step upload (generate URL → upload → save metadata)
- **Frontend:** Onboarding wizard, org switcher, staff profile/schedule editor, settings tabs (General/Contact/Address/Members/Invitations), logo upload, ownership transfer dialog

## User Stories

| ID | Title | Type |
|----|-------|------|
| US-001 | Organization Onboarding Wizard | Full-Stack |
| US-030 | Business Hours Configuration | Full-Stack |
| US-001.1 | Staff Invitation System | Full-Stack |
| US-001.2 | Organization Switcher | Frontend |
| US-001.3 | Row-Level Security (RLS) | Backend |
| US-001.4 | Protected Routes Middleware | Backend |
| US-001.5 | Staff Profile Detail Page | Full-Stack |
| US-001.6 | Invitation Management UI | Frontend |
| US-001.7 | Member Management UI | Frontend |
| US-001.8 | Ownership Transfer | Full-Stack |
| US-001.9 | Settings Sub-Forms | Frontend |
| US-001.10 | File Storage System | Backend |
| US-001.11 | Logo Upload Component | Full-Stack |
| US-001.12 | Return Validators Infrastructure | Backend |
| US-001.13 | Rate Limiting Configuration | Backend |

## Key Files

| File | Purpose |
|------|---------|
| `convex/lib/functions.ts` | Custom wrappers + ErrorCode enum |
| `convex/lib/validators.ts` | Shared return validators |
| `convex/lib/rateLimits.ts` | Rate limiting config |
| `convex/files.ts` | File storage mutations |
| `convex/organizations.ts` | Organization CRUD |
| `convex/members.ts` | Member management |
| `convex/staff.ts` | Staff profiles |
| `convex/invitations.ts` | Invitation system |
| `src/modules/organization/` | OrganizationProvider, switcher, hooks |
| `src/modules/settings/` | Settings forms |
| `src/app/onboarding/` | Onboarding wizard |
| `src/middleware.ts` | Auth middleware |

## Key Decisions

- Invitation tokens: `crypto.randomUUID()`, 7-day expiry
- Ownership transfer requires typing "TRANSFER" for confirmation
- File uploads: max 5MB, JPEG/PNG/WebP only
- Organization slug: auto-generated, unique, 3-30 chars
