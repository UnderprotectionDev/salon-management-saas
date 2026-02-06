# API Contracts

> **Last Updated:** 2026-02-06
> **Status:** Active

This document defines the Convex function signatures (queries, mutations, actions) that form the API surface of the Salon Management SaaS.

> **Terminology Note:** Function signatures use `organization` and `organizationId` to match database schema. Custom function wrappers (`orgQuery`, `orgMutation`) auto-inject `organizationId` from args. See [Glossary - Organization](../appendix/glossary.md#organization) for terminology guidelines.

---

## Conventions

### Naming

- **Queries:** `get*`, `list*`, `search*`
- **Mutations:** `create*`, `update*`, `delete*`, verb-based (`cancelAppointment`)
- **Actions:** `send*`, `process*` (for external service calls)

### Return Types

All functions return typed responses. Errors throw `ConvexError` with structured data:

```typescript
// import { ErrorCode } from "./lib/validators"
throw new ConvexError({
  code: ErrorCode.VALIDATION_ERROR,
  message: "This time slot is no longer available",
  details: { suggestedSlots: [...] }
});
```

### Common Types

```typescript
// Reusable type definitions
const paginatedArgs = {
  limit: v.optional(v.number()),
  cursor: v.optional(v.string()),
};

const paginatedReturn = (itemSchema: Validator) => v.object({
  items: v.array(itemSchema),
  nextCursor: v.optional(v.string()),
  hasMore: v.boolean(),
});

const timestampFields = {
  createdAt: v.number(),
  updatedAt: v.number(),
};
```

---

## Shared Validators (convex/lib/validators.ts)

> **File:** `convex/lib/validators.ts` (309 lines)
> **Status:** ✅ Implemented
> **Purpose:** Centralized validator library for consistent type checking and return value validation across all Convex functions

All queries and mutations use return validators from this shared library. This ensures type safety and consistent data shapes across the API.

### Sub-Validators (Reusable Building Blocks)

Small, focused validators that are composed into larger validators:

| Validator | Type | Values | Usage |
|-----------|------|--------|-------|
| `memberRoleValidator` | Union | `owner` \| `admin` \| `member` | Member role in `member` table |
| `invitationRoleValidator` | Union | `admin` \| `member` | Invitation role (no owner invitations) |
| `invitationStatusValidator` | Union | `pending` \| `accepted` \| `expired` \| `cancelled` \| `rejected` | Invitation lifecycle status |
| `staffStatusValidator` | Union | `active` \| `inactive` \| `pending` | Staff employment status |
| `subscriptionStatusValidator` | Union | `active` \| `trialing` \| `past_due` \| `canceled` \| `unpaid` | Subscription billing status |
| `servicePriceTypeValidator` | Union | `fixed` \| `starting_from` \| `variable` | Service pricing model |
| `serviceStatusValidator` | Union | `active` \| `inactive` | Service availability status |
| `addressValidator` | Object | Optional street, city, state, postalCode, country | Physical address |
| `businessHoursValidator` | Object | Weekly schedule with open/close/closed fields | Organization operating hours |
| `businessHoursDayValidator` | Object | Single day: `{ open, close, closed }` | One day's business hours |
| `bookingSettingsValidator` | Object | Booking rules (advance time, slots, deposit, etc.) | Booking configuration |
| `staffScheduleValidator` | Object | Weekly schedule with start/end/available fields | Staff availability |
| `staffDayScheduleValidator` | Object | Single day: `{ start, end, available }` | One day's staff availability |

### Document Validators (With System Fields)

These validators include Convex system fields (`_id`, `_creationTime`) for returning complete database documents:

| Validator | Purpose | System Fields |
|-----------|---------|---------------|
| `organizationDocValidator` | Organization document | `_id: v.id("organization")`, `_creationTime: v.number()` |
| `memberDocValidator` | Member document | `_id: v.id("member")`, `_creationTime: v.number()` |
| `invitationDocValidator` | Invitation document | `_id: v.id("invitation")`, `_creationTime: v.number()` |
| `organizationSettingsDocValidator` | Settings document | `_id: v.id("organizationSettings")`, `_creationTime: v.number()` |
| `staffDocValidator` | Staff profile document | `_id: v.id("staff")`, `_creationTime: v.number()` |
| `serviceCategoryDocValidator` | Category document | `_id: v.id("serviceCategories")`, `_creationTime: v.number()` |
| `serviceDocValidator` | Service document | `_id: v.id("services")`, `_creationTime: v.number()` |

**Key difference:** Arguments use bare validators (e.g., `v.optional(staffStatusValidator)`), but document validators always include required system fields.

### Composite Validators (Enriched Return Types)

Validators for enriched query results that combine data from multiple tables:

| Validator | Purpose | Additional Fields |
|-----------|---------|------------------|
| `organizationWithRoleValidator` | Organization + user's role/membership | Adds `role: memberRoleValidator` and `memberId: v.id("member")` |
| `invitationWithOrgValidator` | Invitation + organization info | Adds `organizationName: v.string()` and `organizationSlug: v.string()` |
| `serviceWithCategoryValidator` | Service + category name | Extends serviceDoc with `categoryName: v.optional(v.string())` |
| `serviceCategoryWithCountValidator` | Category + service count | Extends categoryDoc with `serviceCount: v.number()` |

### Usage Example

```typescript
// File: convex/staff.ts
import { staffDocValidator, staffStatusValidator } from "./lib/validators";

export const list = orgQuery({
  args: {
    status: v.optional(staffStatusValidator), // Optional in args
  },
  returns: v.array(staffDocValidator), // Returns full documents with system fields
  handler: async (ctx, args) => {
    return await ctx.db
      .query("staff")
      .withIndex("organizationId_status", (q) =>
        q.eq("organizationId", ctx.organizationId)
         .eq("status", args.status ?? "active")
      )
      .collect();
  },
});
```

**Why this matters:**
- All return types are validated at runtime
- TypeScript types are automatically generated from validators
- Prevents accidental shape mismatches between backend and frontend
- Single source of truth for data structures

**See also:** [Convex Schema](./convex-schema.md) for database table definitions

---

## Organization APIs

### `organizations.getBySlug`

```typescript
export const getBySlug = publicQuery({
  args: {
    slug: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("organization"),
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
      address: v.optional(v.object({
        street: v.string(),
        city: v.string(),
        district: v.optional(v.string()),
      })),
      phone: v.optional(v.string()),
      businessHours: v.any(),
      bookingSettings: v.any(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `organizations.update`

```typescript
export const update = ownerMutation({
  args: {
    // organizationId auto-injected by ownerMutation
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      district: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.string(),
    })),
    businessHours: v.optional(v.any()),
    bookingSettings: v.optional(v.any()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Requires owner role (ownerMutation)
  },
});
```

---

## Staff APIs

### `staff.list`

```typescript
export const list = orgQuery({
  args: {
    // organizationId auto-injected by orgQuery
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("pending")
    )),
    includeServices: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    _id: v.id("staff"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    role: v.string(), // from member table: "owner" | "admin" | "member"
    status: v.string(),
    serviceCount: v.number(),
    services: v.optional(v.array(v.object({
      _id: v.id("services"),
      name: v.string(),
    }))),
  })),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `invitations.create`

```typescript
export const create = adminMutation({
  args: {
    // organizationId auto-injected by adminMutation
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    serviceIds: v.optional(v.array(v.id("services"))),
    defaultSchedule: v.optional(v.any()),
  },
  returns: v.id("invitation"),
  handler: async (ctx, args) => {
    // Requires admin+ role (adminMutation)
    // Creates invitation record
    // Generates invitation token
    // Triggers invitation email
  },
});
```

### `staff.getSchedule`

```typescript
export const getSchedule = orgQuery({
  args: {
    staffId: v.id("staff"),
    startDate: v.string(), // ISO date
    endDate: v.string(),   // ISO date
  },
  returns: v.array(v.object({
    date: v.string(),
    isWorking: v.boolean(),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    isOverride: v.boolean(),
    overrideReason: v.optional(v.string()),
    appointments: v.array(v.object({
      _id: v.id("appointments"),
      startTime: v.number(),
      endTime: v.number(),
      customerName: v.string(),
      serviceName: v.string(),
      status: v.string(),
    })),
  })),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `staff.updateSchedule`

```typescript
export const updateSchedule = orgMutation({
  args: {
    staffId: v.id("staff"),
    defaultSchedule: v.object({
      monday: v.optional(v.object({ start: v.string(), end: v.string() })),    // e.g. "09:00"
      tuesday: v.optional(v.object({ start: v.string(), end: v.string() })),
      wednesday: v.optional(v.object({ start: v.string(), end: v.string() })),
      thursday: v.optional(v.object({ start: v.string(), end: v.string() })),
      friday: v.optional(v.object({ start: v.string(), end: v.string() })),
      saturday: v.optional(v.object({ start: v.string(), end: v.string() })),
      sunday: v.optional(v.object({ start: v.string(), end: v.string() })),
    }),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `staff.createScheduleOverride`

```typescript
export const createScheduleOverride = adminMutation({
  args: {
    staffId: v.id("staff"),
    date: v.string(),
    type: v.union(v.literal("custom_hours"), v.literal("day_off")),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    overrideId: v.id("scheduleOverrides"),
    affectedAppointments: v.array(v.id("appointments")),
  }),
  handler: async (ctx, args) => {
    // Check for conflicting appointments
    // Create override
    // Return list of affected appointments for handling
  },
});
```

---

## Service APIs — ✅ Implemented (Sprint 2A)

> **Files:** `convex/services.ts` (353 lines), `convex/serviceCategories.ts` (188 lines)
> **Status:** ✅ Implemented

### `serviceCategories.list`

```typescript
export const list = orgQuery({
  args: {
    // organizationId auto-injected by orgQuery
  },
  returns: v.array(serviceCategoryWithCountValidator),
  handler: async (ctx, args) => {
    // Returns categories sorted by sortOrder with serviceCount
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
    // Reassigns services to uncategorized, then deletes category
  },
});
```

### `services.list`

```typescript
export const list = orgQuery({
  args: {
    // organizationId auto-injected by orgQuery
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
    price: v.number(),             // kuruş (15000 = ₺150.00)
    priceType: servicePriceTypeValidator,
    categoryId: v.optional(v.id("serviceCategories")),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    // Rate limited (createService), validates category,
    // auto sortOrder, defaults: isPopular=false, showOnline=true, status=active
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
    // Partial update, validates category if provided
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
    // Removes service from all staff.serviceIds arrays
  },
});
```

### `services.assignStaff`

```typescript
export const assignStaff = adminMutation({
  args: {
    serviceId: v.id("services"),
    staffId: v.id("staff"),
    assign: v.boolean(),  // true = add, false = remove
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

## Appointment APIs

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
    formattedEndTime: v.string(),   // "15:30"
  })),
  handler: async (ctx, args) => {
    // Calculate total duration from services
    // Get eligible staff (can perform all services)
    // For each staff: get schedule, existing appointments, active locks
    // Calculate available windows
    // Generate 15-minute slots
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
    // Check no existing appointment
    // Check no conflicting lock
    // Create lock with 2-minute TTL
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
    // Verify lock exists and belongs to session
    // Find or create customer
    // Create appointment with services
    // Delete lock
    // Schedule confirmation email
    // Schedule reminder
  },
});
```

### `appointments.getByDate`

```typescript
export const getByDate = orgQuery({
  args: {
    // organizationId auto-injected by orgQuery
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
    // Validate status transition
    // Update appointment
    // Update customer stats if completed/no_show
    // Create audit log
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
    // Validate can cancel (timing, status)
    // Update status to cancelled
    // Send cancellation notification
    // Cancel scheduled reminder
    // Create audit log
  },
});
```

### `appointments.reschedule`

```typescript
export const reschedule = mutation({
  args: {
    appointmentId: v.id("appointments"),
    newDate: v.string(),
    newStartTime: v.number(),
    newStaffId: v.optional(v.id("staff")),
    sessionId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    newAppointmentId: v.id("appointments"),
  }),
  handler: async (ctx, args) => {
    // Verify new slot is available
    // Acquire lock for new slot
    // Cancel old appointment
    // Create new appointment
    // Send reschedule notification
  },
});
```

---

## Customer APIs

### `customers.list`

```typescript
export const list = orgQuery({
  args: {
    // organizationId auto-injected by orgQuery
    search: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal("name"),
      v.literal("lastVisit"),
      v.literal("totalSpent"),
      v.literal("totalVisits")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    ...paginatedArgs,
  },
  returns: paginatedReturn(v.object({
    _id: v.id("customers"),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    totalVisits: v.number(),
    totalSpent: v.number(),
    lastVisitDate: v.optional(v.string()),
    tags: v.array(v.string()),
  })),
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
    recentAppointments: v.array(v.object({
      _id: v.id("appointments"),
      date: v.string(),
      services: v.array(v.string()),
      total: v.number(),
      status: v.string(),
    })),
    notes: v.optional(v.string()),
    tags: v.array(v.string()),
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
    // Separate notes
    customerNotes: v.optional(v.string()), // Customer-visible
    staffNotes: v.optional(v.string()), // Internal only
    tags: v.optional(v.array(v.string())),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Staff can update staffNotes
    // Customer can update customerNotes, preferences
    // Admin can update all fields
  },
});
```

### `customers.merge`

```typescript
export const merge = adminMutation({
  args: {
    primaryCustomerId: v.id("customers"),
    duplicateCustomerId: v.id("customers"),
  },
  returns: v.object({
    success: v.boolean(),
    mergedAppointments: v.number(),
  }),
  handler: async (ctx, args) => {
    // Requires admin+ role
    // Move all appointments from duplicate to primary
    // Combine stats (totalVisits, totalSpent)
    // Keep newer contact info
    // Merge tags
    // Delete duplicate record
    // Create audit log
  },
});
```

### `customers.advancedSearch`

```typescript
export const advancedSearch = orgQuery({
  args: {
    // organizationId auto-injected by orgQuery
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
      noShowCount: v.optional(v.object({
        min: v.optional(v.number()),
        max: v.optional(v.number()),
      })),
      tags: v.optional(v.array(v.string())),
      source: v.optional(v.union(
        v.literal("online"),
        v.literal("walk_in"),
        v.literal("phone"),
        v.literal("import")
      )),
      accountStatus: v.optional(v.union(
        v.literal("guest"),
        v.literal("recognized"),
        v.literal("prompted"),
        v.literal("registered")
      )),
    })),
    sort: v.optional(v.object({
      field: v.union(
        v.literal("name"),
        v.literal("lastVisit"),
        v.literal("totalVisits"),
        v.literal("totalSpent")
      ),
      direction: v.union(v.literal("asc"), v.literal("desc")),
    })),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    customers: v.array(v.object({
      _id: v.id("customers"),
      name: v.string(),
      email: v.string(),
      phone: v.string(),
      accountStatus: v.string(),
      totalVisits: v.number(),
      totalSpent: v.number(),
      lastVisitDate: v.optional(v.string()),
      noShowCount: v.number(),
      tags: v.array(v.string()),
    })),
    nextCursor: v.optional(v.string()),
    totalCount: v.number(),
  }),
  handler: async (ctx, args) => { /* ... */ },
});
```

---

## Time-Off APIs

### `timeOff.request`

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
  returns: v.object({
    requestId: v.id("timeOffRequests"),
    affectedAppointments: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get current staff from auth
    // Check for existing appointments in date range
    // Create pending request
    // Notify admins/owner
  },
});
```

### `timeOff.listPending`

```typescript
export const listPending = adminQuery({
  args: {
    // organizationId auto-injected by adminQuery
  },
  returns: v.array(v.object({
    _id: v.id("timeOffRequests"),
    staff: v.object({
      _id: v.id("staff"),
      name: v.string(),
      imageUrl: v.optional(v.string()),
    }),
    startDate: v.string(),
    endDate: v.string(),
    type: v.string(),
    reason: v.optional(v.string()),
    affectedAppointments: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    // Requires admin+ role
  },
});
```

### `timeOff.approve`

```typescript
export const approve = adminMutation({
  args: {
    requestId: v.id("timeOffRequests"),
    appointmentAction: v.union(
      v.literal("reassign"),
      v.literal("cancel")
    ),
    reassignTo: v.optional(v.id("staff")),
  },
  returns: v.object({
    success: v.boolean(),
    appointmentsHandled: v.number(),
  }),
  handler: async (ctx, args) => {
    // Requires admin+ role
    // Handle affected appointments (reassign or cancel)
    // Create schedule overrides for date range
    // Update request status to approved
    // Notify staff of approval
  },
});
```

### `timeOff.reject`

```typescript
export const reject = adminMutation({
  args: {
    requestId: v.id("timeOffRequests"),
    reason: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Requires admin+ role
    // Update request status to rejected
    // Store rejection reason
    // Notify staff of rejection
  },
});
```

### `timeOff.getMyRequests`

```typescript
export const getMyRequests = orgQuery({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    )),
  },
  returns: v.array(v.object({
    _id: v.id("timeOffRequests"),
    startDate: v.string(),
    endDate: v.string(),
    type: v.string(),
    status: v.string(),
    reason: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    approvedBy: v.optional(v.object({
      name: v.string(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    // Get requests for current staff
  },
});
```

---

## Overtime APIs

### `overtime.create`

```typescript
export const create = orgMutation({
  args: {
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    note: v.optional(v.string()),
  },
  returns: v.id("staffOvertime"),
  handler: async (ctx, args) => {
    // Staff can create their own overtime
    // Validate time range
    // Check for conflicts with existing overtime
  },
});
```

### `overtime.delete`

```typescript
export const deleteOvertime = orgMutation({
  args: {
    overtimeId: v.id("staffOvertime"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Staff can delete their own overtime
    // Check no appointments booked in this slot
  },
});
```

### `overtime.getMyOvertime`

```typescript
export const getMyOvertime = orgQuery({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("staffOvertime"),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    note: v.optional(v.string()),
    hasAppointments: v.boolean(),
  })),
  handler: async (ctx, args) => {
    // Get overtime slots for current staff
  },
});
```

---

## Product APIs

### `products.list`

```typescript
export const list = adminQuery({
  args: {
    // organizationId auto-injected by adminQuery
    categoryId: v.optional(v.id("productCategories")),
    status: v.optional(v.string()),
    showOnlineOnly: v.optional(v.boolean()),
    lowStockOnly: v.optional(v.boolean()),
    ...paginatedArgs,
  },
  returns: paginatedReturn(v.object({
    _id: v.id("products"),
    name: v.string(),
    brand: v.optional(v.string()),
    price: v.number(),
    stockQuantity: v.number(),
    lowStockThreshold: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    status: v.string(),
    categoryName: v.optional(v.string()),
  })),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `products.search`

```typescript
export const search = publicQuery({
  args: {
    organizationId: v.id("organization"),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("products"),
    name: v.string(),
    brand: v.optional(v.string()),
    price: v.number(),
    imageUrl: v.optional(v.string()),
    stockQuantity: v.number(),
  })),
  handler: async (ctx, args) => {
    // Use Convex search index
  },
});
```

### `products.create`

```typescript
export const create = adminMutation({
  args: {
    // organizationId auto-injected by adminMutation
    name: v.string(),
    description: v.optional(v.string()),
    brand: v.optional(v.string()),
    sku: v.optional(v.string()),
    barcode: v.optional(v.string()),
    // Pricing (Showcase model - display only)
    sellingPrice: v.number(),
    costPrice: v.optional(v.number()),
    profitMargin: v.optional(v.number()),
    // Inventory
    trackInventory: v.boolean(),
    stockQuantity: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    // Supplier
    supplier: v.optional(v.object({
      name: v.string(),
      contactInfo: v.optional(v.string()),
    })),
    batchNumber: v.optional(v.string()),
    // Display
    categoryId: v.optional(v.id("productCategories")),
    imageUrl: v.optional(v.string()),
    showOnShowcase: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    // Requires admin+ role
    // Calculate profit margin if cost price provided
    // Create product record
    // Create inventory transaction if stock added
  },
});
```

### `products.update`

```typescript
export const update = adminMutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    brand: v.optional(v.string()),
    sellingPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    categoryId: v.optional(v.id("productCategories")),
    imageUrl: v.optional(v.string()),
    showOnShowcase: v.optional(v.boolean()),
    featured: v.optional(v.boolean()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive")
    )),
    lowStockThreshold: v.optional(v.number()),
    supplier: v.optional(v.object({
      name: v.string(),
      contactInfo: v.optional(v.string()),
    })),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Requires admin+ role
    // Recalculate profit margin if prices changed
  },
});
```

### `products.delete`

```typescript
export const deleteProduct = adminMutation({
  args: {
    productId: v.id("products"),
  },
  returns: v.object({
    success: v.boolean(),
    softDeleted: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Requires admin+ role (adminMutation)
    // Check for inventory transactions (keep for history)
    // Soft delete: set status = "inactive"
  },
});
```

### `products.adjustStock`

```typescript
export const adjustStock = adminMutation({
  args: {
    productId: v.id("products"),
    newQuantity: v.number(),
    type: v.union(
      v.literal("restock"),
      v.literal("adjustment"),
      v.literal("damaged"),
      v.literal("return")
    ),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    newStock: v.number(),
    isLowStock: v.boolean(),
  }),
  handler: async (ctx, args) => { /* ... */ },
});
```

---

## Analytics APIs

### `analytics.getDashboardMetrics`

```typescript
export const getDashboardMetrics = orgQuery({
  args: {
    // organizationId auto-injected by orgQuery
  },
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
      averagePerDay: v.number(),
    }),
    thisMonth: v.object({
      revenue: v.number(),
      percentChange: v.number(),
      totalBookings: v.number(),
      averageTicket: v.number(),
      newCustomers: v.number(),
    }),
  }),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `analytics.getRevenueReport`

```typescript
export const getRevenueReport = adminQuery({
  args: {
    // organizationId auto-injected by adminQuery
    startDate: v.string(),
    endDate: v.string(),
    groupBy: v.optional(v.union(
      v.literal("day"),
      v.literal("week"),
      v.literal("month")
    )),
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
      percentChangeVsPrevious: v.number(),
    }),
    timeline: v.array(v.object({
      period: v.string(),
      revenue: v.number(),
      bookings: v.number(),
    })),
    byService: v.array(v.object({
      serviceId: v.id("services"),
      serviceName: v.string(),
      revenue: v.number(),
      count: v.number(),
      percentage: v.number(),
    })),
    byStaff: v.array(v.object({
      staffId: v.id("staff"),
      staffName: v.string(),
      revenue: v.number(),
      count: v.number(),
      percentage: v.number(),
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
    // organizationId auto-injected by orgQuery
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
    data: v.optional(v.any()),
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

## Action APIs (External Services)

### `emails.sendConfirmation`

```typescript
export const sendConfirmation = action({
  args: {
    appointmentId: v.id("appointments"),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Fetch appointment details
    // Render email template
    // Send via Resend
    // Update appointment.confirmationSentAt
  },
});
```

### `emails.sendReminder`

```typescript
export const sendReminder = action({
  args: {
    appointmentId: v.id("appointments"),
  },
  returns: v.object({
    success: v.boolean(),
    messageId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Fetch appointment details
    // Check if still valid (not cancelled)
    // Render email template
    // Send via Resend
    // Update appointment.reminderSentAt
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
    // That haven't had reminder sent
    // Send reminder emails
    // Update reminderSentAt
  },
});
```

---

## Subscription APIs (Polar.sh Integration)

### `subscriptions.getCurrent`

```typescript
export const getCurrent = ownerQuery({
  args: {
    // organizationId auto-injected by ownerQuery
  },
  returns: v.union(
    v.object({
      _id: v.id("organizationSubscriptions"),
      status: v.union(
        v.literal("active"),
        v.literal("past_due"),
        v.literal("canceled"),
        v.literal("unpaid")
      ),
      plan: v.union(
        v.literal("standard_monthly"),
        v.literal("standard_yearly")
      ),
      currentPeriodStart: v.number(),
      currentPeriodEnd: v.number(),
      cancelAtPeriodEnd: v.boolean(),
      daysUntilExpiry: v.number(),
      gracePeriodEndsAt: v.optional(v.number()),
      daysUntilSuspension: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Requires owner role
    // Return current subscription with computed fields
  },
});
```

### `subscriptions.getBillingHistory`

```typescript
export const getBillingHistory = ownerQuery({
  args: {
    // organizationId auto-injected by ownerQuery
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    events: v.array(v.object({
      _id: v.id("subscriptionEvents"),
      eventType: v.string(),
      createdAt: v.number(),
      data: v.object({
        amount: v.optional(v.number()),
        currency: v.optional(v.string()),
        status: v.optional(v.string()),
        invoiceUrl: v.optional(v.string()),
      }),
    })),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Requires owner role
    // Return payment events for billing history
  },
});
```

### `subscriptions.createCheckout`

```typescript
export const createCheckout = action({
  args: {
    organizationId: v.id("organization"), // actions don't use custom wrappers
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
    // Requires owner role
    // Create Polar checkout session
    // Return redirect URL to Polar checkout
  },
});
```

### `subscriptions.cancel`

```typescript
export const cancel = ownerMutation({
  args: {
    // organizationId auto-injected by ownerMutation
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    accessEndsAt: v.number(),
  }),
  handler: async (ctx, args) => {
    // Requires owner role
    // Mark subscription as cancelAtPeriodEnd
    // Return when access will end
  },
});
```

### `subscriptions.getPortalUrl`

```typescript
export const getPortalUrl = action({
  args: {
    organizationId: v.id("organization"), // actions don't use custom wrappers
  },
  returns: v.object({
    portalUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    // Requires owner role
    // Generate Polar customer portal URL
    // Customer can manage payment method, view invoices
  },
});
```

### `subscriptions.reactivate`

```typescript
export const reactivate = ownerMutation({
  args: {
    // organizationId auto-injected by ownerMutation
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Requires owner role
    // Only valid if cancelAtPeriodEnd is true
    // Remove cancellation flag
  },
});
```

---

## File Upload APIs

> **File:** `convex/files.ts` (253 lines)
> **Status:** ✅ Implemented
> **Purpose:** Handles file uploads using Convex File Storage for organization logos, staff profile images, and service images

Convex provides built-in file storage with CDN distribution. The upload process follows a 3-step flow:

1. **Generate Upload URL** (client requests a temporary upload URL)
2. **Upload File** (client uploads directly to Convex storage)
3. **Save Reference** (backend saves the file URL to the database)

### `files.generateUploadUrl`

Generates a temporary upload URL for client-side file uploads.

```typescript
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
```

**Returns:** Temporary upload URL (valid for ~1 hour)

**Usage:** Called by client before file upload. No authentication required (URL itself is the auth).

### `files.saveOrganizationLogo`

Saves organization logo after upload. Validates file size and type.

```typescript
export const saveOrganizationLogo = adminMutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  returns: v.string(), // Returns CDN URL
  handler: async (ctx, args) => {
    // Validates size (max 2MB) and type (JPEG/PNG/WebP)
    // Gets CDN URL from storage
    // Updates organization.logo
  },
});
```

**Permissions:** Admin or owner role required

**Validation:**
- Max file size: 2MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`

**Returns:** CDN URL of uploaded logo

### `files.deleteOrganizationLogo`

Removes organization logo reference (file remains in storage for caching).

```typescript
export const deleteOrganizationLogo = adminMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Sets organization.logo to undefined
    // Note: Does not delete from storage (Convex handles cleanup)
  },
});
```

**Permissions:** Admin or owner role required

### `files.saveStaffImage`

Saves staff profile image after upload. Checks permission (own profile or admin).

```typescript
export const saveStaffImage = authedMutation({
  args: {
    staffId: v.id("staff"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  returns: v.string(), // Returns CDN URL
  handler: async (ctx, args) => {
    // Validates size and type
    // Checks permission: own profile OR admin/owner
    // Updates staff.imageUrl
  },
});
```

**Permissions:** Staff member (own profile) OR admin/owner (any profile)

**Validation:**
- Max file size: 2MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`

**Returns:** CDN URL of uploaded image

### Upload Flow Example

```typescript
// Client-side upload flow
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

async function uploadLogo(file: File) {
  // Step 1: Get upload URL
  const uploadUrl = await generateUploadUrl();

  // Step 2: Upload file directly to Convex storage
  const response = await fetch(uploadUrl, {
    method: "POST",
    body: file,
  });
  const { storageId } = await response.json();

  // Step 3: Save reference in database
  const logoUrl = await saveOrganizationLogo({
    storageId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });

  return logoUrl; // CDN URL for display
}
```

### File Storage Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max file size | 2MB | Sufficient for profile images/logos, prevents abuse |
| Allowed formats | JPEG, PNG, WebP | Standard web image formats, WebP for modern browsers |
| Storage retention | Permanent | Files not deleted (CDN caching), Convex handles cleanup |
| Upload URL TTL | ~1 hour | Temporary URL expires after generation |
| CDN distribution | Global | Convex provides automatic CDN distribution |

### `files.saveServiceImage`

Saves service image after upload. Validates file size and type.

```typescript
export const saveServiceImage = adminMutation({
  args: {
    serviceId: v.id("services"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  returns: v.string(), // Returns CDN URL
  handler: async (ctx, args) => {
    // Validates size (max 2MB) and type (JPEG/PNG/WebP)
    // Gets CDN URL from storage
    // Updates services.imageUrl
  },
});
```

**Permissions:** Admin or owner role required

**Validation:**
- Max file size: 2MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`

**Returns:** CDN URL of uploaded service image

**See also:**
- [File Storage Documentation](./architecture.md#file-storage) for architecture details
- [Logo Upload Component](../../../src/components/logo-upload/LogoUpload.tsx) for frontend implementation

---

## Subscription Webhook Handler

### `POST /webhooks/polar`

```typescript
// convex/http.ts
export const polarWebhook = httpAction(async (ctx, request) => {
  // 1. Verify webhook signature
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
      // Create subscription record
      // Update organization status
      await ctx.runMutation(internal.subscriptions.handleCheckoutCompleted, {
        event,
      });
      break;

    case "subscription.updated":
      // Update subscription record
      await ctx.runMutation(internal.subscriptions.handleSubscriptionUpdated, {
        event,
      });
      break;

    case "subscription.cancelled":
      // Mark subscription cancelled
      await ctx.runMutation(internal.subscriptions.handleSubscriptionCancelled, {
        event,
      });
      break;

    case "payment.failed":
      // Update org to past_due
      // Start grace period
      // Schedule reminder emails
      await ctx.runMutation(internal.subscriptions.handlePaymentFailed, {
        event,
      });
      break;

    case "payment.succeeded":
      // Update org to active
      // Clear grace period
      await ctx.runMutation(internal.subscriptions.handlePaymentSucceeded, {
        event,
      });
      break;
  }

  // 4. Log event for audit
  await ctx.runMutation(internal.subscriptions.logEvent, {
    event,
  });

  return new Response("OK", { status: 200 });
});
```

### Webhook Event Types

| Event | Description | Action |
|-------|-------------|--------|
| `checkout.completed` | Customer completed checkout | Create subscription, activate org |
| `subscription.updated` | Plan changed, period renewed | Update subscription record |
| `subscription.cancelled` | Customer cancelled | Mark cancelled, set end date |
| `payment.failed` | Card declined | Set past_due, start grace period |
| `payment.succeeded` | Payment processed | Clear past_due, update period |

---

## Subscription Scheduled Jobs

### `schedulers.checkGracePeriods`

```typescript
// Runs every hour
export const checkGracePeriods = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Find orgs with expired grace periods
    // Note: subscriptionStatus/gracePeriodEndsAt live on organizationSettings table
    const expiredOrgs = await ctx.db
      .query("organizationSettings")
      .withIndex("by_subscription_status", (q) =>
        q.eq("subscriptionStatus", "past_due")
      )
      .filter((q) =>
        q.and(
          q.neq(q.field("gracePeriodEndsAt"), undefined),
          q.lt(q.field("gracePeriodEndsAt"), now)
        )
      )
      .collect();

    // Suspend expired orgs
    for (const org of expiredOrgs) {
      await ctx.db.patch(org._id, {
        subscriptionStatus: "suspended",
        updatedAt: now,
      });

      // Send suspension notification
      await ctx.scheduler.runAfter(0, internal.emails.sendSuspensionNotice, {
        organizationId: org._id,
      });
    }

    return { suspended: expiredOrgs.length };
  },
});
```

### `schedulers.sendGracePeriodReminders`

```typescript
// Runs daily
export const sendGracePeriodReminders = internalAction({
  handler: async (ctx) => {
    // Find orgs in grace period
    // Send reminders based on days remaining
    // Day 1, 3, 5, 7 schedule
  },
});
```

---

## See Also

**Related Documentation:**
- [Convex Schema](./convex-schema.md) - Database tables referenced in these APIs
- [System Architecture](./architecture.md) - Multi-tenancy, auth, and rate limiting
- [Rate Limiting](./architecture.md#rate-limiting) - Rate limit configuration details
- [Glossary - Organization](../appendix/glossary.md#organization) - Terminology guidelines

**Key Sections in This Document:**
- [Shared Validators](#shared-validators-convexlibvalidatorsts) - Centralized type validators
- [File Upload APIs](#file-upload-apis) - File storage implementation
- [Organization APIs](#organization-apis) - Tenant management
- [Staff APIs](#staff-apis) - Staff and invitation management
- [Subscription APIs](#subscription-apis-polarsh-integration) - Billing integration

**Implementation Files:**
- `convex/lib/validators.ts` - All shared validators (309 lines)
- `convex/lib/rateLimits.ts` - Rate limit configuration (118 lines)
- `convex/files.ts` - File upload implementation (253 lines)
- `convex/organizations.ts` - Organization CRUD operations
- `convex/staff.ts` - Staff profile management
- `convex/invitations.ts` - Invitation lifecycle
- `convex/members.ts` - Member and role management
- `convex/serviceCategories.ts` - Service category CRUD (188 lines)
- `convex/services.ts` - Service CRUD + staff assignment (353 lines)
- `convex/users.ts` - User queries (10 lines)
