# Milestone 2: Services, Staff & Customers

**Status:** ✅ Complete | **User Stories:** 4

## Summary

Built the three core data entities for booking: service catalog with categories and pricing, staff schedule/service assignments, and customer database with Turkish phone validation and search.

## What Was Built

- **Service Catalog:** Categories + services with pricing (kuruş integers), soft-delete, sort ordering
- **Staff Enhancements:** Schedule overrides, time-off requests (approve/reject workflow), overtime windows, schedule resolver
- **Customer Database:** CRUD + search + merge, phone validation (+90 format), hard-delete, advanced search

## User Stories

| ID | Title | Type |
|----|-------|------|
| US-002 | Service Catalog Management | Full-Stack |
| US-003 | Staff Profile & Schedule Management | Full-Stack |
| US-006 | Customer Database | Full-Stack |
| US-030 | Service Assignment to Staff | Backend |

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `convex/serviceCategories.ts` | 188 | Category CRUD |
| `convex/services.ts` | 353 | Service CRUD + staff assignment |
| `convex/customers.ts` | ~600 | Customer CRUD + search + merge |
| `convex/scheduleOverrides.ts` | 178 | Schedule override CRUD |
| `convex/timeOffRequests.ts` | 335 | Time-off workflow |
| `convex/staffOvertime.ts` | 155 | Overtime management |
| `convex/lib/scheduleResolver.ts` | 163 | Schedule resolution logic |
| `convex/lib/phone.ts` | — | Turkish phone validation |
| `src/modules/services/` | 9 files | Service catalog UI |
| `src/modules/customers/` | 7 files | Customer database UI |
| `src/modules/staff/` | 10+ files | Staff management UI |

## Key Decisions

- Pricing: kuruş integers (15000 = ₺150.00), `formatPrice()` at UI
- Staff-service assignment via `staff.serviceIds` array (not junction table)
- Phone uniqueness per org via indexes
- Schedule resolution priority: time-off > override > default schedule
- Time-off approve auto-creates schedule overrides (type="time_off")
