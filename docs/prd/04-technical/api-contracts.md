# API Contracts

> **Last Updated:** 2026-02-04
> **Status:** Active

This document defines the Convex function signatures (queries, mutations, actions) that form the API surface of the Salon Management SaaS.

---

## Conventions

### Naming

- **Queries:** `get*`, `list*`, `search*`
- **Mutations:** `create*`, `update*`, `delete*`, verb-based (`cancelAppointment`)
- **Actions:** `send*`, `process*` (for external service calls)

### Return Types

All functions return typed responses. Errors throw `ConvexError` with structured data:

```typescript
throw new ConvexError({
  code: "SLOT_UNAVAILABLE",
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

## Organization APIs

### `organizations.getBySlug`

```typescript
export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
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
export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
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
    // Requires owner role
  },
});
```

---

## Staff APIs

### `staff.list`

```typescript
export const list = query({
  args: {
    organizationId: v.id("organizations"),
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
    role: v.string(),
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

### `staff.invite`

```typescript
export const invite = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("staff")),
    serviceIds: v.optional(v.array(v.id("services"))),
    defaultSchedule: v.optional(v.any()),
  },
  returns: v.object({
    staffId: v.id("staff"),
    invitationSent: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Requires admin+ role
    // Creates pending staff record
    // Generates invitation token
    // Triggers invitation email
  },
});
```

### `staff.getSchedule`

```typescript
export const getSchedule = query({
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
export const updateSchedule = mutation({
  args: {
    staffId: v.id("staff"),
    defaultSchedule: v.object({
      monday: v.optional(v.object({ start: v.number(), end: v.number() })),
      tuesday: v.optional(v.object({ start: v.number(), end: v.number() })),
      wednesday: v.optional(v.object({ start: v.number(), end: v.number() })),
      thursday: v.optional(v.object({ start: v.number(), end: v.number() })),
      friday: v.optional(v.object({ start: v.number(), end: v.number() })),
      saturday: v.optional(v.object({ start: v.number(), end: v.number() })),
      sunday: v.optional(v.object({ start: v.number(), end: v.number() })),
    }),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `staff.createScheduleOverride`

```typescript
export const createScheduleOverride = mutation({
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

## Service APIs

### `services.list`

```typescript
export const list = query({
  args: {
    organizationId: v.id("organizations"),
    categoryId: v.optional(v.id("serviceCategories")),
    status: v.optional(v.literal("active")),
    showOnlineOnly: v.optional(v.boolean()),
  },
  returns: v.array(v.object({
    _id: v.id("services"),
    name: v.string(),
    description: v.optional(v.string()),
    duration: v.number(),
    price: v.number(),
    priceType: v.string(),
    imageUrl: v.optional(v.string()),
    categoryId: v.optional(v.id("serviceCategories")),
    categoryName: v.optional(v.string()),
    isPopular: v.boolean(),
    staffCount: v.number(), // Number of staff who can perform
  })),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `services.create`

```typescript
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    duration: v.number(),
    bufferTime: v.optional(v.number()),
    price: v.number(),
    priceType: v.union(
      v.literal("fixed"),
      v.literal("starting_from"),
      v.literal("variable")
    ),
    categoryId: v.optional(v.id("serviceCategories")),
    imageUrl: v.optional(v.string()),
    isPopular: v.optional(v.boolean()),
    showOnline: v.optional(v.boolean()),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `services.getCategories`

```typescript
export const getCategories = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.array(v.object({
    _id: v.id("serviceCategories"),
    name: v.string(),
    description: v.optional(v.string()),
    serviceCount: v.number(),
    sortOrder: v.number(),
  })),
  handler: async (ctx, args) => { /* ... */ },
});
```

### `services.update`

```typescript
export const update = mutation({
  args: {
    serviceId: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    duration: v.optional(v.number()),
    bufferTime: v.optional(v.number()),
    price: v.optional(v.number()),
    priceType: v.optional(v.union(
      v.literal("fixed"),
      v.literal("starting_from"),
      v.literal("variable")
    )),
    categoryId: v.optional(v.id("serviceCategories")),
    imageUrl: v.optional(v.string()),
    isPopular: v.optional(v.boolean()),
    showOnline: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Requires admin+ role
    // Validate service exists and belongs to org
    // Update service fields
    // Create audit log
  },
});
```

### `services.delete`

```typescript
export const deleteService = mutation({
  args: {
    serviceId: v.id("services"),
  },
  returns: v.object({
    success: v.boolean(),
    softDeleted: v.boolean(), // True if has booking history
  }),
  handler: async (ctx, args) => {
    // Requires admin+ role
    // Check if service has booking history
    // If has history: soft delete (set status = "inactive")
    // If no history: hard delete
    // Remove from staff service assignments
  },
});
```

---

## Appointment APIs

### `appointments.getAvailableSlots`

```typescript
export const getAvailableSlots = query({
  args: {
    organizationId: v.id("organizations"),
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
    organizationId: v.id("organizations"),
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
    organizationId: v.id("organizations"),
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
export const getByDate = query({
  args: {
    organizationId: v.id("organizations"),
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
export const updateStatus = mutation({
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
export const list = query({
  args: {
    organizationId: v.id("organizations"),
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
export const getProfile = query({
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
export const update = mutation({
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
export const merge = mutation({
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
export const advancedSearch = query({
  args: {
    organizationId: v.id("organizations"),
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
export const request = mutation({
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
export const listPending = query({
  args: {
    organizationId: v.id("organizations"),
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
export const approve = mutation({
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
export const reject = mutation({
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
export const getMyRequests = query({
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
export const create = mutation({
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
export const deleteOvertime = mutation({
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
export const getMyOvertime = query({
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
export const list = query({
  args: {
    organizationId: v.id("organizations"),
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
export const search = query({
  args: {
    organizationId: v.id("organizations"),
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
export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
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
export const update = mutation({
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
export const deleteProduct = mutation({
  args: {
    productId: v.id("products"),
  },
  returns: v.object({
    success: v.boolean(),
    softDeleted: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Requires admin+ role
    // Check for inventory transactions (keep for history)
    // Soft delete: set status = "inactive"
  },
});
```

### `products.adjustStock`

```typescript
export const adjustStock = mutation({
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
export const getDashboardMetrics = query({
  args: {
    organizationId: v.id("organizations"),
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
export const getRevenueReport = query({
  args: {
    organizationId: v.id("organizations"),
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
export const list = query({
  args: {
    organizationId: v.id("organizations"),
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
export const markRead = mutation({
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
export const getCurrent = query({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.union(
    v.object({
      _id: v.id("organizationSubscriptions"),
      status: v.union(
        v.literal("active"),
        v.literal("past_due"),
        v.literal("cancelled"),
        v.literal("incomplete")
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
export const getBillingHistory = query({
  args: {
    organizationId: v.id("organizations"),
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
    organizationId: v.id("organizations"),
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
export const cancel = mutation({
  args: {
    organizationId: v.id("organizations"),
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
    organizationId: v.id("organizations"),
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
export const reactivate = mutation({
  args: {
    organizationId: v.id("organizations"),
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
    const expiredOrgs = await ctx.db
      .query("organizations")
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
