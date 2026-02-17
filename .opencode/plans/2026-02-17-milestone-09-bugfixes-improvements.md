# Milestone 9: Dashboard Bug Fixes & Improvements

**Date:** 2026-02-17
**Status:** Ready for Implementation

## Phase 1: Bug Fixes

### Bug 1: Rate Limiter Key in rescheduleByUser (HIGH)

**File:** `convex/appointments.ts:1764-1768`

**Problem:** `rescheduleByUser` rate limiter is keyed on `appointment.organizationId` instead of `ctx.user._id`. This means one user's reschedule attempts count against ALL users of that organization.

**Compare with `cancelByUser` (line 1671)** which correctly uses `ctx.user._id`.

**Fix:**
```typescript
// BEFORE (line 1767)
{ key: appointment.organizationId },

// AFTER
{ key: ctx.user._id },
```

Also update the comment on line 1763:
```typescript
// BEFORE
// Rate limit (before ownership check to prevent enumeration)

// AFTER
// Rate limit by user ID (not org) to prevent one user's reschedules
// from affecting all customers in the organization
```

---

### Bug 2: Hardcoded Cancellation Policy (HIGH)

**Problem:** Frontend `canModifyAppointment()` hardcodes 2-hour policy, but backend reads `organizationSettings.bookingSettings.cancellationPolicyHours` (which defaults to 2 but can be configured per-salon).

**3-step fix:**

#### Step 2a: Add field to validator

**File:** `convex/lib/validators.ts:407-421`

Add `cancellationPolicyHours` to `userAppointmentValidator`:
```typescript
export const userAppointmentValidator = v.object({
  _id: v.id("appointments"),
  date: v.string(),
  startTime: v.number(),
  endTime: v.number(),
  status: appointmentStatusValidator,
  confirmationCode: v.string(),
  staffName: v.string(),
  staffImageUrl: v.optional(v.string()),
  total: v.number(),
  organizationName: v.string(),
  organizationSlug: v.string(),
  organizationLogo: v.optional(v.string()),
  services: v.array(serviceItemNoId),
  cancellationPolicyHours: v.number(),  // NEW
});
```

#### Step 2b: Fetch cancellationPolicyHours in listForCurrentUser

**File:** `convex/appointments.ts:620-716`

After fetching org docs, also batch-fetch orgSettings for each org:
```typescript
// After orgMap and staffMap creation (line ~675), add:
const orgSettingsDocs = await Promise.all(
  orgIds.map((id) =>
    ctx.db
      .query("organizationSettings")
      .withIndex("organizationId", (q) => q.eq("organizationId", id))
      .first(),
  ),
);
const policyMap = new Map(
  orgIds.map((id, i) => [
    id,
    orgSettingsDocs[i]?.bookingSettings?.cancellationPolicyHours ?? 2,
  ]),
);
```

Then in the return mapping, add the field:
```typescript
return {
  // ... existing fields ...
  cancellationPolicyHours: policyMap.get(appt.organizationId) ?? 2,
};
```

#### Step 2c: Update frontend canModifyAppointment

**File:** `src/app/dashboard/page.tsx:101-113`

```typescript
// BEFORE
function canModifyAppointment(
  date: string,
  startTime: number,
  status: string,
): boolean {
  if (!isActiveStatus(status)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const hours = Math.floor(startTime / 60);
  const minutes = startTime % 60;
  const appointmentDate = new Date(year, month - 1, day, hours, minutes);
  const twoHoursBefore = appointmentDate.getTime() - 2 * 60 * 60 * 1000;
  return Date.now() < twoHoursBefore;
}

// AFTER
function canModifyAppointment(
  date: string,
  startTime: number,
  status: string,
  cancellationPolicyHours: number = 2,
): boolean {
  if (!isActiveStatus(status)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const hours = Math.floor(startTime / 60);
  const minutes = startTime % 60;
  const appointmentDate = new Date(year, month - 1, day, hours, minutes);
  const policyBefore = appointmentDate.getTime() - cancellationPolicyHours * 60 * 60 * 1000;
  return Date.now() < policyBefore;
}
```

Update the call site (~line 434):
```typescript
// BEFORE
const isActive = canModifyAppointment(
  appointment.date,
  appointment.startTime,
  appointment.status,
);

// AFTER
const isActive = canModifyAppointment(
  appointment.date,
  appointment.startTime,
  appointment.status,
  appointment.cancellationPolicyHours,
);
```

Also update the `UserAppointment` type (~line 417-431) to include `cancellationPolicyHours: number`.

---

### Bug 3: Error Handling Pattern (MEDIUM)

**Problem:** 3 locations use unsafe type assertion instead of `ConvexError` instanceof check.

**Files affected:** `src/app/dashboard/page.tsx` lines 185-188, 306-309, 657-660

**Fix:** Add `ConvexError` import and update all 3 catch blocks:

```typescript
// Add to imports
import { ConvexError } from "convex/values";

// BEFORE (3 locations)
toast.error(
  (error as { data?: { message?: string } })?.data?.message ??
    "Failed to ...",
);

// AFTER (3 locations)
toast.error(
  error instanceof ConvexError
    ? (error.data as { message?: string })?.message ?? "An error occurred"
    : "Unexpected error occurred",
);
```

---

## Phase 2: Brainstorming (After Bug Fixes)

After bug fixes, brainstorm for:
- Favorite Salons feature (schema + backend + UI)
- Customer Notifications system
- General UX/performance improvements
- Security hardening based on convex-security-check skill

## Implementation Order

1. Bug 1 (rate limiter) - single line change
2. Bug 2a (validator) - add field
3. Bug 2b (backend query) - fetch org settings, add to response
4. Bug 2c (frontend) - update function, type, and call site
5. Bug 3 (error handling) - 3 catch blocks + 1 import
6. Lint check
7. Brainstorming session
