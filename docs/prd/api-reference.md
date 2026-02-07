# API Reference

> **Last Updated:** 2026-02-06
> **Status:** Active
> **Version:** 1.0

This document defines the complete Convex API surface for the Salon Management SaaS platform, including all queries, mutations, actions, and their type contracts.

---

## Table of Contents

1. [Conventions](#conventions)
2. [Shared Validators](#shared-validators)
3. [Authentication APIs](#authentication-apis)
4. [Organization APIs](#organization-apis)
5. [Staff Management APIs](#staff-management-apis)
6. [Service Catalog APIs](#service-catalog-apis)
7. [Appointment & Booking APIs](#appointment--booking-apis)
8. [Customer Management APIs](#customer-management-apis)
9. [Schedule & Time-Off APIs](#schedule--time-off-apis)
10. [Product & Inventory APIs](#product--inventory-apis)
11. [Analytics & Reporting APIs](#analytics--reporting-apis)
12. [Notification APIs](#notification-apis)
13. [File Storage APIs](#file-storage-apis)
14. [Subscription & Billing APIs](#subscription--billing-apis)
15. [Webhook Handlers](#webhook-handlers)

---

## Conventions

### Function Naming

- **Queries:** `get*`, `list*`, `search*`
- **Mutations:** `create*`, `update*`, `delete*`, verb-based (`cancelAppointment`)
- **Actions:** `send*`, `process*` (for external service calls)

### Custom Function Wrappers

> **Critical:** Always use custom wrappers from `convex/lib/functions.ts` instead of base `query()`/`mutation()`.

| Wrapper | Auth | Context Added | Use Case |
|---------|------|---------------|----------|
| `publicQuery` | None | — | Public data (org info by slug) |
| `maybeAuthedQuery` | Optional | `ctx.user \| null` | Works for authed/unauthed |
| `authedQuery/Mutation` | Required | `ctx.user` | User-scoped data |
| `orgQuery/Mutation` | Required + membership | `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` | All org-scoped operations |
| `adminQuery/Mutation` | Required + admin/owner | Same as org + role check | Staff management, settings |
| `ownerQuery/Mutation` | Required + owner only | Same as org + owner check | Billing, org deletion |

**Key Behavior:**
- `orgQuery`/`orgMutation` auto-inject `organizationId` from args
- Functions using these wrappers don't need `organizationId` in their own args
- Membership and role checks are automatic
- All throw structured `ConvexError` with `ErrorCode` on failure

### Error Handling

All functions throw `ConvexError` with structured data:

```typescript
throw new ConvexError({
  code: ErrorCode.VALIDATION_ERROR,
  message: "This time slot is no longer available",
  details: { suggestedSlots: [...] }
});
```

### Return Type Validation

> **All queries/mutations MUST have `returns:` validators.**

```typescript
export const get = orgQuery({
  args: { staffId: v.id("staff") },
  returns: v.union(staffDocValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.staffId);
  },
});
```

---

## Shared Validators

> **File:** `convex/lib/validators.ts` (309 lines)
> **Status:** ✅ Implemented

Centralized validator library for consistent type checking across all Convex functions.

### Sub-Validators

Small, focused validators composed into larger validators:

| Validator | Type | Values | Usage |
|-----------|------|--------|-------|
| `memberRoleValidator` | Union | `owner` \| `admin` \| `member` | Member role in `member` table |
| `invitationRoleValidator` | Union | `admin` \| `member` | Invitation role (no owner invitations) |
| `invitationStatusValidator` | Union | `pending` \| `accepted` \| `expired` \| `cancelled` \| `rejected` | Invitation lifecycle |
| `staffStatusValidator` | Union | `active` \| `inactive` \| `pending` | Staff employment status |
| `subscriptionStatusValidator` | Union | `active` \| `trialing` \| `past_due` \| `canceled` \| `unpaid` | Subscription billing status |
| `servicePriceTypeValidator` | Union | `fixed` \| `starting_from` \| `variable` | Service pricing model |
| `serviceStatusValidator` | Union | `active` \| `inactive` | Service availability |
| `addressValidator` | Object | Optional street, city, state, postalCode, country | Physical address |
| `businessHoursValidator` | Object | Weekly schedule with open/close/closed fields | Organization operating hours |
| `bookingSettingsValidator` | Object | Booking rules (advance time, slots, deposit, etc.) | Booking configuration |
| `staffScheduleValidator` | Object | Weekly schedule with start/end/available fields | Staff availability |

### Document Validators

Include Convex system fields (`_id`, `_creationTime`):

| Validator | Purpose | System Fields |
|-----------|---------|---------------|
| `organizationDocValidator` | Organization document | `_id`, `_creationTime` |
| `memberDocValidator` | Member document | `_id`, `_creationTime` |
| `invitationDocValidator` | Invitation document | `_id`, `_creationTime` |
| `staffDocValidator` | Staff profile document | `_id`, `_creationTime` |
| `serviceCategoryDocValidator` | Category document | `_id`, `_creationTime` |
| `serviceDocValidator` | Service document | `_id`, `_creationTime` |
| `scheduleOverrideDocValidator` | Schedule override document | `_id`, `_creationTime` |
| `timeOffRequestDocValidator` | Time-off request document | `_id`, `_creationTime` |
| `staffOvertimeDocValidator` | Overtime entry document | `_id`, `_creationTime` |

### Composite Validators

Enriched return types combining multiple tables:

| Validator | Purpose | Additional Fields |
|-----------|---------|-------------------|
| `organizationWithRoleValidator` | Organization + user's role | Adds `role`, `memberId` |
| `invitationWithOrgValidator` | Invitation + organization info | Adds `organizationName`, `organizationSlug` |
| `serviceWithCategoryValidator` | Service + category name | Extends with `categoryName` |
| `serviceCategoryWithCountValidator` | Category + service count | Extends with `serviceCount` |
| `timeOffRequestWithStaffValidator` | Time-off + staff info | Adds `staffName`, `approvedByName` |

---

## Authentication APIs

### `users.getCurrentUser`

```typescript
export const getCurrentUser = authedQuery({
  args: {},
  returns: v.union(
    v.object({
      userId: v.string(),
      email: v.string(),
      name: v.string(),
      imageUrl: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Returns current authenticated user
  },
});
```

---

## Organization APIs

### `organizations.getBySlug`

```typescript
export const getBySlug = publicQuery({
  args: {
    slug: v.string(),
  },
  returns: v.union(organizationDocValidator, v.null()),
  handler: async (ctx, args) => {
    // Public query - no auth required
  },
});
```

### `organizations.create`

```typescript
export const create = authedMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.object({
    organizationId: v.id("organization"),
    memberId: v.id("member"),
  }),
  handler: async (ctx, args) => {
    // Rate limited: createOrganization (3/day per user)
    // Creates org + owner member + default settings
  },
});
```

### `organizations.update`

```typescript
export const update = ownerMutation({
  args: {
    // organizationId auto-injected
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(addressValidator),
    businessHours: v.optional(businessHoursValidator),
    bookingSettings: v.optional(bookingSettingsValidator),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Owner only
  },
});
```

### `organizations.listMine`

```typescript
export const listMine = authedQuery({
  args: {},
  returns: v.array(organizationWithRoleValidator),
  handler: async (ctx) => {
    // Returns all organizations user belongs to, with their role
  },
});
```

---

## Staff Management APIs

### `staff.list`

```typescript
export const list = orgQuery({
  args: {
    status: v.optional(staffStatusValidator),
  },
  returns: v.array(staffDocValidator),
  handler: async (ctx, args) => {
    // Returns staff filtered by status
  },
});
```

### `staff.get`

```typescript
export const get = orgQuery({
  args: {
    staffId: v.id("staff"),
  },
  returns: v.union(staffDocValidator, v.null()),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `staff.update`

```typescript
export const update = adminMutation({
  args: {
    staffId: v.id("staff"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    bio: v.optional(v.string()),
    defaultSchedule: v.optional(staffScheduleValidator),
  },
  returns: v.id("staff"),
  handler: async (ctx, args) => {
    // Admin+ can update any staff
    // Staff can update own profile (handler-level check)
  },
});
```

### `invitations.create`

```typescript
export const create = adminMutation({
  args: {
    email: v.string(),
    name: v.string(),
    role: invitationRoleValidator,
    serviceIds: v.optional(v.array(v.id("services"))),
  },
  returns: v.id("invitation"),
  handler: async (ctx, args) => {
    // Rate limited: createInvitation (10/day per org)
    // Generates token, sends email
  },
});
```

### `invitations.accept`

```typescript
export const accept = authedMutation({
  args: {
    token: v.string(),
  },
  returns: v.object({
    organizationId: v.id("organization"),
    organizationSlug: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    // Creates member + staff records
    // Updates invitation status
  },
});
```

### `members.updateRole`

```typescript
export const updateRole = ownerMutation({
  args: {
    memberId: v.id("member"),
    role: memberRoleValidator,
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Owner only
    // Cannot demote self
  },
});
```

---

## Service Catalog APIs

> **Status:** ✅ Implemented (Sprint 2A)

### `serviceCategories.list`

```typescript
export const list = orgQuery({
  args: {},
  returns: v.array(serviceCategoryWithCountValidator),
  handler: async (ctx) => {
    // Returns categories with service count, sorted by sortOrder
  },
});
```

### `serviceCategories.create`

```typescript
export const create = adminMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("serviceCategories"),
  handler: async (ctx, args) => {
    // Duplicate name check, auto sortOrder
  },
});
```

### `serviceCategories.update`

```typescript
export const update = adminMutation({
  args: {
    categoryId: v.id("serviceCategories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.id("serviceCategories"),
  handler: async (ctx, args) => {
    // Duplicate name check on rename
  },
});
```

### `serviceCategories.remove`

```typescript
export const remove = adminMutation({
  args: {
    categoryId: v.id("serviceCategories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Reassigns services to uncategorized, then deletes
  },
});
```

### `services.list`

```typescript
export const list = orgQuery({
  args: {
    categoryId: v.optional(v.id("serviceCategories")),
    status: v.optional(serviceStatusValidator),
  },
  returns: v.array(serviceWithCategoryValidator),
  handler: async (ctx, args) => {
    // Enriched with categoryName, sorted by sortOrder
  },
});
```

### `services.get`

```typescript
export const get = orgQuery({
  args: {
    serviceId: v.id("services"),
  },
  returns: v.union(serviceWithCategoryValidator, v.null()),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `services.create`

```typescript
export const create = adminMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    duration: v.number(),
    bufferTime: v.optional(v.number()),
    price: v.number(), // kuruş (15000 = ₺150.00)
    priceType: servicePriceTypeValidator,
    categoryId: v.optional(v.id("serviceCategories")),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    // Rate limited: createService
    // Validates category, auto sortOrder
  },
});
```

### `services.update`

```typescript
export const update = adminMutation({
  args: {
    serviceId: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    duration: v.optional(v.number()),
    bufferTime: v.optional(v.number()),
    price: v.optional(v.number()),
    priceType: v.optional(servicePriceTypeValidator),
    categoryId: v.optional(v.id("serviceCategories")),
    isPopular: v.optional(v.boolean()),
    showOnline: v.optional(v.boolean()),
    status: v.optional(serviceStatusValidator),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    // Partial update, validates category
  },
});
```

### `services.remove`

```typescript
export const remove = adminMutation({
  args: {
    serviceId: v.id("services"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Soft-delete: sets status="inactive"
    // Removes from all staff.serviceIds
  },
});
```

### `services.assignStaff`

```typescript
export const assignStaff = adminMutation({
  args: {
    serviceId: v.id("services"),
    staffId: v.id("staff"),
    assign: v.boolean(), // true = add, false = remove
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Toggles service in staff.serviceIds array
  },
});
```

### `services.getStaffForService`

```typescript
export const getStaffForService = orgQuery({
  args: {
    serviceId: v.id("services"),
  },
  returns: v.array(v.object({
    _id: v.id("staff"),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    assigned: v.boolean(),
  })),
  handler: async (ctx, args) => {
    // Returns all active staff with assignment status
  },
});
```

---

## Appointment & Booking APIs

### `appointments.getAvailableSlots`

```typescript
export const getAvailableSlots = publicQuery({
  args: {
    organizationId: v.id("organization"),
    date: v.string(), // ISO date: "2024-03-15"
    serviceIds: v.array(v.id("services")),
    staffId: v.optional(v.id("staff")),
  },
  returns: v.array(v.object({
    staffId: v.id("staff"),
    staffName: v.string(),
    staffImageUrl: v.optional(v.string()),
    startTime: v.number(), // Minutes from midnight
    endTime: v.number(),
    formattedStartTime: v.string(), // "14:30"
    formattedEndTime: v.string(),
  })),
  handler: async (ctx, args) => {
    // Calculates available slots based on:
    // 1. Service durations
    // 2. Staff schedules (default + overrides + overtime)
    // 3. Existing appointments
    // 4. Active locks
  },
});
```

### `appointments.acquireLock`

```typescript
export const acquireLock = mutation({
  args: {
    organizationId: v.id("organization"),
    staffId: v.id("staff"),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    sessionId: v.string(),
  },
  returns: v.object({
    lockId: v.id("slotLocks"),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    // Prevents double-booking
    // 2-minute TTL
  },
});
```

### `appointments.create`

```typescript
export const create = mutation({
  args: {
    organizationId: v.id("organization"),
    staffId: v.id("staff"),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    serviceIds: v.array(v.id("services")),
    customer: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
      notes: v.optional(v.string()),
    }),
    sessionId: v.string(), // For lock verification
    source: v.optional(v.union(
      v.literal("online"),
      v.literal("walk_in"),
      v.literal("phone"),
      v.literal("staff")
    )),
  },
  returns: v.object({
    appointmentId: v.id("appointments"),
    confirmationCode: v.string(),
    customerId: v.id("customers"),
  }),
  handler: async (ctx, args) => {
    // Rate limited: createBooking
    // Verifies lock, creates customer, schedules reminder
  },
});
```

### `appointments.getByDate`

```typescript
export const getByDate = orgQuery({
  args: {
    date: v.string(),
    staffId: v.optional(v.id("staff")),
  },
  returns: v.array(v.object({
    _id: v.id("appointments"),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    formattedTime: v.string(),
    customer: v.object({
      _id: v.id("customers"),
      name: v.string(),
      phone: v.string(),
    }),
    staff: v.object({
      _id: v.id("staff"),
      name: v.string(),
      imageUrl: v.optional(v.string()),
    }),
    services: v.array(v.object({
      name: v.string(),
      duration: v.number(),
    })),
    status: v.string(),
    total: v.number(),
    source: v.string(),
  })),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `appointments.updateStatus`

```typescript
export const updateStatus = orgMutation({
  args: {
    appointmentId: v.id("appointments"),
    status: v.union(
      v.literal("checked_in"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("no_show")
    ),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Validates status transition
    // Updates customer stats if completed/no_show
  },
});
```

### `appointments.cancel`

```typescript
export const cancel = mutation({
  args: {
    appointmentId: v.id("appointments"),
    reason: v.string(),
    cancelledBy: v.union(
      v.literal("customer"),
      v.literal("staff"),
      v.literal("system")
    ),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Rate limited: cancelBooking (5/hour per appointment)
    // 2-hour cancellation policy for customers
    // Releases slot, cancels reminder
  },
});
```

---

## Customer Management APIs

### `customers.list`

```typescript
export const list = orgQuery({
  args: {
    search: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal("name"),
      v.literal("lastVisit"),
      v.literal("totalSpent"),
      v.literal("totalVisits")
    )),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    customers: v.array(v.object({
      _id: v.id("customers"),
      name: v.string(),
      email: v.string(),
      phone: v.string(),
      totalVisits: v.number(),
      totalSpent: v.number(),
      lastVisitDate: v.optional(v.string()),
      tags: v.array(v.string()),
    })),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `customers.getProfile`

```typescript
export const getProfile = orgQuery({
  args: {
    customerId: v.id("customers"),
  },
  returns: v.object({
    _id: v.id("customers"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    phoneVerified: v.boolean(),
    preferredStaff: v.optional(v.object({
      _id: v.id("staff"),
      name: v.string(),
    })),
    notificationPreferences: v.object({
      emailReminders: v.boolean(),
      smsReminders: v.boolean(),
    }),
    stats: v.object({
      totalVisits: v.number(),
      totalSpent: v.number(),
      noShowCount: v.number(),
      memberSince: v.string(),
    }),
    customerNotes: v.optional(v.string()), // Customer-visible
    staffNotes: v.optional(v.string()), // Staff-only
  }),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `customers.update`

```typescript
export const update = orgMutation({
  args: {
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    preferredStaffId: v.optional(v.id("staff")),
    notificationPreferences: v.optional(v.object({
      emailReminders: v.boolean(),
      smsReminders: v.boolean(),
    })),
    customerNotes: v.optional(v.string()),
    staffNotes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Separate permissions for customer vs staff notes
  },
});
```

### `customers.advancedSearch`

```typescript
export const advancedSearch = orgQuery({
  args: {
    query: v.optional(v.string()),
    filters: v.optional(v.object({
      lastVisit: v.optional(v.union(
        v.literal("today"),
        v.literal("7days"),
        v.literal("30days"),
        v.literal("90days"),
        v.literal("over90days")
      )),
      totalVisits: v.optional(v.object({
        min: v.optional(v.number()),
        max: v.optional(v.number()),
      })),
      totalSpending: v.optional(v.object({
        min: v.optional(v.number()),
        max: v.optional(v.number()),
      })),
      tags: v.optional(v.array(v.string())),
    })),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    customers: v.array(/* ... */),
    totalCount: v.number(),
  }),
  handler: async (ctx, args) => { /* ... */ },
});
```

---

## Schedule & Time-Off APIs

> **Status:** ✅ Implemented (Milestone 2B)

### `scheduleOverrides.listByStaff`

```typescript
export const listByStaff = orgQuery({
  args: {
    staffId: v.id("staff"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.array(scheduleOverrideDocValidator),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `scheduleOverrides.create`

```typescript
export const create = orgMutation({
  args: {
    staffId: v.id("staff"),
    date: v.string(),
    type: v.union(
      v.literal("custom_hours"),
      v.literal("day_off"),
      v.literal("time_off")
    ),
    startTime: v.optional(v.string()), // "HH:MM"
    endTime: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  returns: v.id("scheduleOverrides"),
  handler: async (ctx, args) => {
    // Rate limited: createScheduleOverride (30/day per org)
    // Permission: self OR admin/owner
  },
});
```

### `timeOffRequests.listByOrg`

```typescript
export const listByOrg = orgQuery({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    )),
  },
  returns: v.array(timeOffRequestWithStaffValidator),
  handler: async (ctx, args) => {
    // Admins see all, members see only their own
  },
});
```

### `timeOffRequests.request`

```typescript
export const request = orgMutation({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    type: v.union(
      v.literal("vacation"),
      v.literal("sick"),
      v.literal("personal"),
      v.literal("other")
    ),
    reason: v.optional(v.string()),
  },
  returns: v.id("timeOffRequests"),
  handler: async (ctx, args) => {
    // Rate limited: createTimeOffRequest (5/day per staff)
  },
});
```

### `timeOffRequests.approve`

```typescript
export const approve = adminMutation({
  args: {
    requestId: v.id("timeOffRequests"),
  },
  returns: v.id("timeOffRequests"),
  handler: async (ctx, args) => {
    // Auto-creates schedule overrides (type="time_off")
  },
});
```

### `staffOvertime.create`

```typescript
export const create = orgMutation({
  args: {
    staffId: v.id("staff"),
    date: v.string(),
    startTime: v.string(), // "HH:MM"
    endTime: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.id("staffOvertime"),
  handler: async (ctx, args) => {
    // Rate limited: createOvertime (10/day per staff)
    // Permission: self OR admin/owner
  },
});
```

### `staff.getResolvedSchedule`

```typescript
export const getResolvedSchedule = orgQuery({
  args: {
    staffId: v.id("staff"),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(v.object({
    date: v.string(),
    available: v.boolean(),
    effectiveStart: v.union(v.string(), v.null()),
    effectiveEnd: v.union(v.string(), v.null()),
    overtimeWindows: v.array(v.object({
      start: v.string(),
      end: v.string(),
    })),
    overrideType: v.union(
      v.literal("custom_hours"),
      v.literal("day_off"),
      v.literal("time_off"),
      v.null()
    ),
    isTimeOff: v.boolean(),
  })),
  handler: async (ctx, args) => {
    // Combines: default schedule + overrides + overtime
  },
});
```

---

## Product & Inventory APIs

### `products.list`

```typescript
export const list = adminQuery({
  args: {
    categoryId: v.optional(v.id("productCategories")),
    status: v.optional(v.string()),
    lowStockOnly: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    _id: v.id("products"),
    name: v.string(),
    brand: v.optional(v.string()),
    sellingPrice: v.number(),
    costPrice: v.number(),
    profitMargin: v.number(),
    stockQuantity: v.number(),
    lowStockThreshold: v.number(),
    status: v.string(),
  })),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `products.create`

```typescript
export const create = adminMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    brand: v.optional(v.string()),
    sellingPrice: v.number(),
    costPrice: v.number(),
    supplier: v.optional(v.object({
      name: v.string(),
      contactEmail: v.optional(v.string()),
    })),
    stockQuantity: v.number(),
    lowStockThreshold: v.number(),
    batchNumber: v.optional(v.string()),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    // Calculates profit margin
  },
});
```

### `products.recordInventoryTransaction`

```typescript
export const recordInventoryTransaction = adminMutation({
  args: {
    productId: v.id("products"),
    type: v.union(
      v.literal("purchase"),
      v.literal("sold"),
      v.literal("used"),
      v.literal("adjustment"),
      v.literal("damaged"),
      v.literal("returned")
    ),
    quantity: v.number(),
    unitCost: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    newStock: v.number(),
    isLowStock: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Updates stock, records transaction
  },
});
```

---

## Analytics & Reporting APIs

### `analytics.getDashboardMetrics`

```typescript
export const getDashboardMetrics = orgQuery({
  args: {},
  returns: v.object({
    today: v.object({
      totalAppointments: v.number(),
      completed: v.number(),
      upcoming: v.number(),
      noShows: v.number(),
      walkIns: v.number(),
      revenue: v.number(),
    }),
    thisWeek: v.object({
      totalBookings: v.number(),
      percentChange: v.number(),
      busiestDay: v.string(),
    }),
    thisMonth: v.object({
      revenue: v.number(),
      percentChange: v.number(),
      averageTicket: v.number(),
    }),
  }),
  handler: async (ctx) => { /* ... */ },
});
```

### `analytics.getRevenueReport`

```typescript
export const getRevenueReport = adminQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
    staffId: v.optional(v.id("staff")),
    categoryId: v.optional(v.id("serviceCategories")),
  },
  returns: v.object({
    summary: v.object({
      totalRevenue: v.number(),
      serviceRevenue: v.number(),
      productRevenue: v.number(),
      totalBookings: v.number(),
      averageTicket: v.number(),
    }),
    timeline: v.array(v.object({
      date: v.string(),
      revenue: v.number(),
      bookings: v.number(),
    })),
    byService: v.array(v.object({
      serviceName: v.string(),
      revenue: v.number(),
      count: v.number(),
    })),
  }),
  handler: async (ctx, args) => { /* ... */ },
});
```

---

## Notification APIs

### `notifications.list`

```typescript
export const list = orgQuery({
  args: {
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("notifications"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `notifications.markRead`

```typescript
export const markRead = orgMutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => { /* ... */ },
});
```

---

## File Storage APIs

> **File:** `convex/files.ts` (253 lines)
> **Status:** ✅ Implemented

### `files.generateUploadUrl`

```typescript
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
```

**Returns:** Temporary upload URL (valid ~1 hour)

### `files.saveOrganizationLogo`

```typescript
export const saveOrganizationLogo = adminMutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  returns: v.string(), // CDN URL
  handler: async (ctx, args) => {
    // Validates size (max 2MB) and type (JPEG/PNG/WebP)
    // Updates organization.logo
  },
});
```

### `files.saveStaffImage`

```typescript
export const saveStaffImage = authedMutation({
  args: {
    staffId: v.id("staff"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  returns: v.string(), // CDN URL
  handler: async (ctx, args) => {
    // Permission: own profile OR admin/owner
    // Updates staff.imageUrl
  },
});
```

### `files.saveServiceImage`

```typescript
export const saveServiceImage = adminMutation({
  args: {
    serviceId: v.id("services"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Updates services.imageUrl
  },
});
```

### Upload Flow

```typescript
// Client-side example
const uploadUrl = await generateUploadUrl();
const response = await fetch(uploadUrl, {
  method: "POST",
  body: file,
});
const { storageId } = await response.json();
const logoUrl = await saveOrganizationLogo({
  storageId,
  fileName: file.name,
  fileType: file.type,
  fileSize: file.size,
});
```

---

## Subscription & Billing APIs

### `subscriptions.getCurrent`

```typescript
export const getCurrent = ownerQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("organizationSubscriptions"),
      status: subscriptionStatusValidator,
      plan: v.union(
        v.literal("standard_monthly"),
        v.literal("standard_yearly")
      ),
      currentPeriodStart: v.number(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      daysUntilExpiry: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    // Owner only
  },
});
```

### `subscriptions.getBillingHistory`

```typescript
export const getBillingHistory = ownerQuery({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.object({
    events: v.array(v.object({
      _id: v.id("subscriptionEvents"),
      eventType: v.string(),
      createdAt: v.number(),
      data: v.object({
        amount: v.optional(v.number()),
        invoiceUrl: v.optional(v.string()),
      }),
    })),
  }),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `subscriptions.createCheckout`

```typescript
export const createCheckout = action({
  args: {
    organizationId: v.id("organization"),
    plan: v.union(
      v.literal("standard_monthly"),
      v.literal("standard_yearly")
    ),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  returns: v.object({
    checkoutUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    // Creates Polar checkout session
  },
});
```

---

## Webhook Handlers

### `POST /webhooks/polar`

```typescript
export const polarWebhook = httpAction(async (ctx, request) => {
  // 1. Verify signature
  const signature = request.headers.get("polar-signature");
  const body = await request.text();

  if (!verifyPolarSignature(body, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  // 2. Parse event
  const event = JSON.parse(body);

  // 3. Handle event types
  switch (event.type) {
    case "checkout.completed":
      await ctx.runMutation(internal.subscriptions.handleCheckoutCompleted, { event });
      break;
    case "subscription.updated":
      await ctx.runMutation(internal.subscriptions.handleSubscriptionUpdated, { event });
      break;
    case "subscription.cancelled":
      await ctx.runMutation(internal.subscriptions.handleSubscriptionCancelled, { event });
      break;
    case "payment.failed":
      await ctx.runMutation(internal.subscriptions.handlePaymentFailed, { event });
      break;
    case "payment.succeeded":
      await ctx.runMutation(internal.subscriptions.handlePaymentSucceeded, { event });
      break;
  }

  return new Response("OK", { status: 200 });
});
```

---

## Rate Limits

> **File:** `convex/lib/rateLimits.ts` (118 lines)

Rate limits configured using `@convex-dev/rate-limiter`:

| Function | Limit | Key | Notes |
|----------|-------|-----|-------|
| `createInvitation` | 10/day | organizationId | Prevent spam invitations |
| `resendInvitation` | 5/day | invitationId | Per invitation |
| `createOrganization` | 3/day | userId | New org creation |
| `addMember` | 20/day | organizationId | Member additions |
| `createService` | 50/day | organizationId | Service catalog |
| `createBooking` | 10/hour | userId/sessionId | Booking creation |
| `cancelBooking` | 5/hour | appointmentId | Per appointment |
| `createScheduleOverride` | 30/day | organizationId | Schedule changes |
| `createTimeOffRequest` | 5/day | staffId | Per staff member |
| `createOvertime` | 10/day | staffId | Per staff member |

**Usage:**

```typescript
import { rateLimiter } from "./lib/rateLimits";

export const create = adminMutation({
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "createInvitation", {
      key: ctx.organizationId,
    });
    // ... proceed
  },
});
```

---

## Scheduled Jobs

### `schedulers.cleanupExpiredLocks`

```typescript
// Runs every minute
export const cleanupExpiredLocks = internalMutation({
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("slotLocks")
      .withIndex("by_expiry")
      .filter((q) => q.lt(q.field("expiresAt"), Date.now()))
      .collect();

    for (const lock of expired) {
      await ctx.db.delete(lock._id);
    }

    return { deleted: expired.length };
  },
});
```

### `schedulers.sendScheduledReminders`

```typescript
// Runs every hour
export const sendScheduledReminders = internalAction({
  handler: async (ctx) => {
    // Find appointments 24-25 hours from now
    // Send reminder emails
  },
});
```

### `schedulers.checkGracePeriods`

```typescript
// Runs every hour
export const checkGracePeriods = internalMutation({
  handler: async (ctx) => {
    // Find orgs with expired grace periods
    // Suspend expired orgs
  },
});
```

---

## See Also

- [Database Schema](./database-schema.md) - Complete schema reference
- [System Architecture](./system-architecture.md) - Multi-tenancy, auth, rate limiting
- [Glossary](./glossary.md) - Terminology guidelines

---

## Navigation

- [← Back to README](./README.md)
- [Database Schema →](./database-schema.md)
