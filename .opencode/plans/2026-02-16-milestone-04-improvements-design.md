# Milestone 04 Improvements: Booking Operations

**Date:** 2026-02-16
**Status:** Approved - Ready for Implementation
**Scope:** Bug fixes, performance, security, error handling, 1 new feature

## Problem Statement

Milestone 04 (Booking Operations) is complete but has critical bugs, performance bottlenecks, security gaps, and error handling weaknesses discovered during code audit.

## Success Criteria

- All 4 critical bugs fixed (timezone, reminderSentAt collision, rate limit)
- All performance queries use indexes or bounded fetches
- Public endpoints have rate limiting
- Consistent error handling across frontend
- Staff receive real-time toast notifications for new bookings

## Explicitly Out of Scope

- Reschedule/confirmation/completion email templates (deferred)
- Payment/deposit integration (deferred)
- Waitlist system (deferred)
- Guest booking without auth (deferred)
- SMS notifications (deferred)
- ICS calendar attachments in emails (deferred)
- Email delivery tracking/retry visibility (deferred)

---

## Phase 1: Critical Bug Fixes (Priority: HIGH)

### 1.1 Timezone Fix - 30-min Reminder

**File:** `convex/notifications.ts:256`
**Bug:** Uses `new Date().getHours() * 60 + getMinutes()` (UTC) to compare against appointment times stored in Istanbul local time. Reminders fire 3 hours early.

**Fix:** Use `dateTimeToEpoch` from `convex/lib/dateTime.ts` with `Europe/Istanbul` timezone, or compute current Istanbul time explicitly:

```typescript
// Before (UTC):
const now = new Date();
const currentMinutes = now.getHours() * 60 + now.getMinutes();

// After (Istanbul):
const nowIstanbul = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
const currentMinutes = nowIstanbul.getHours() * 60 + nowIstanbul.getMinutes();
```

Also need to compare dates in Istanbul timezone for the "today" check.

### 1.2 Timezone Fix - 24-hour Email Reminder

**File:** `convex/email_helpers.ts:135`
**Bug:** Uses `getUTCFullYear()`/`getUTCMonth()`/`getUTCDate()` for "tomorrow" calculation. At 22:00 Istanbul (19:00 UTC), "tomorrow" in UTC is actually "today+2" in Istanbul near midnight.

**Fix:** Compute tomorrow in Istanbul timezone:

```typescript
const now = new Date();
const istanbulNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
const tomorrow = new Date(istanbulNow);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
```

### 1.3 reminderSentAt Field Split

**File:** `convex/schema.ts` (appointments table)
**Bug:** Both 24-hour email and 30-min in-app notification check/write the same `reminderSentAt` field. If 24h email fires first, 30-min notification is skipped.

**Fix:**
1. Add `emailReminderSentAt` and `notificationReminderSentAt` optional fields to schema
2. Update `email_helpers.ts` to write `emailReminderSentAt`
3. Update `notifications.ts` to write `notificationReminderSentAt`
4. Keep `reminderSentAt` for backward compatibility (don't remove yet)
5. Update validators in `convex/lib/validators.ts`

### 1.4 getByConfirmationCode -> HTTP Action + Rate Limit

**File:** `convex/appointments.ts` (getByConfirmationCode - publicQuery)
**Bug:** `confirmationCodeLookup` rate limit defined in `rateLimits.ts` but never applied. Public endpoint vulnerable to brute-force enumeration.

**Fix:**
1. Create HTTP action in `convex/http.ts`:
   ```
   GET /api/appointments/by-confirmation?code=XXX&orgId=YYY
   ```
2. Move logic from `getByConfirmationCode` to an `internalQuery`
3. Apply rate limiting in HTTP action (by IP or org+code combo)
4. Update frontend (`/[slug]/(public)/appointment/[code]/page.tsx`) to use `fetch` instead of `useQuery`
5. Handle loading/error states since we lose Convex reactivity

---

## Phase 2: Performance Improvements (Priority: MEDIUM)

### 2.1 searchByPhone Optimization

**File:** `convex/customers.ts:302-308`
**Problem:** `.collect()` on ALL org customers, then in-memory phone filter.
**Fix:** Add `.take(200)` limit on the index query, then filter. Or better: use `by_org_phone` index with range if phone format is consistent.

### 2.2 Cron Reminder Optimization

**Files:** `convex/notifications.ts:264`, `convex/email_helpers.ts:137`
**Problem:** Both iterate ALL organizations every run.
**Fix:** Query appointments directly by status+date range using `by_org_status_date` index. Approach: query all `confirmed` appointments for today/tomorrow across all orgs using a global status-date query. May need a new index `by_status_date` (without org prefix) for global queries.

### 2.3 slotLocks Index

**File:** `convex/schema.ts` (slotLocks table)
**Problem:** `slots.available` makes N queries (one per staff) for slot locks.
**Fix:** Add `by_org_date` index: `["organizationId", "date"]`. Requires adding `organizationId` to slotLocks table if not present (check schema).

### 2.4 availableDates Override Support

**File:** `convex/slots.ts:462`
**Problem:** Date picker skips overrides/overtime for performance, showing incorrect availability.
**Fix:** Batch fetch overrides for the date range (single index query), then apply to date filtering. Minimal query cost since overrides are sparse.

### 2.5 appointments.list -> Paginated

**File:** `convex/appointments.ts:695`
**Problem:** Fetches ALL org appointments with no date limit.
**Fix:** Switch `AppointmentList.tsx` to use `listPaginated` (already exists). Or add default date range (last 30 days) to `list` query.

### 2.6 listForCurrentUser Bounds

**File:** `convex/appointments.ts:571`
**Problem:** Up to 50 customers x 100 appointments = 5000 docs.
**Fix:** Add `.take(20)` limit on customer fetch, `.take(50)` on appointments per customer, and add optional date range filter.

---

## Phase 3: Security Improvements (Priority: MEDIUM)

### 3.1 Slot Query Rate Limiting

**Files:** `convex/slots.ts` (available, availableDates)
**Fix:** Add org-based rate limiting using existing rate limiter. Key: `organizationId`. Limit: 60 requests/minute per org. This preserves Convex reactivity while preventing abuse.

### 3.2 cancelByUser Rate Limit Key

**File:** `convex/appointments.ts:1543`
**Problem:** Rate limit keyed by `organizationId` - one user's cancellations affect all customers.
**Fix:** Change key from `args.organizationId` to `ctx.user._id`.

### 3.3 SessionId Strengthening

**File:** `src/modules/booking/hooks/useBookingFlow.ts:18-19`
**Problem:** `Date.now()-Math.random()` is predictable.
**Fix:** Use `crypto.randomUUID()` (supported in all modern browsers).

### 3.4 Date Format Validation

**Files:** Multiple query functions accepting `date` string.
**Fix:** Create shared validator function in `convex/lib/dateTime.ts`:
```typescript
export function validateDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}
```
Apply in `getByDate`, `getByDateRange`, `reschedule`, `createByStaff`.

---

## Phase 4: Error Handling (Priority: MEDIUM)

### 4.1 Error Boundary

**File:** New `src/app/[slug]/(public)/book/error.tsx`
**Fix:** Create Next.js error boundary with retry button and user-friendly message.

### 4.2 extractConvexError Utility

**File:** New `src/lib/errors.ts`
**Fix:** Centralized error extraction:
```typescript
import { ConvexError } from "convex/values";

export function getErrorMessage(error: unknown, fallback = "Bir hata olustu"): string {
  if (error instanceof ConvexError) {
    const data = error.data as { message?: string; code?: string };
    return data?.message ?? fallback;
  }
  return fallback;
}
```
Update all catch blocks to use this utility.

### 4.3 Slot Lock Retry

**File:** `src/modules/booking/components/TimeSlotGrid.tsx:70`
**Fix:** On lock failure, auto-retry once after 500ms delay. If still fails, show toast with "Tekrar Dene" action button.

### 4.4 Silent Error Logging

**File:** `src/modules/booking/components/ConfirmBookingDialog.tsx:128-131`
**Fix:** Replace `.catch(() => {})` with `.catch((e) => console.error("Operation failed:", e))`.

### 4.5 Enrichment Null Safety

**File:** `convex/appointments.ts:54-55`
**Fix:** Return structured null indicator instead of "Unknown" strings:
```typescript
customer: customer
  ? { name: customer.name, phone: customer.phone, ... }
  : { name: "Silinen Musteri", isDeleted: true, ... }
```
Frontend can then show a "Deleted" badge.

---

## Phase 5: New Feature - Staff Toast Notification

### 5.1 getLatestNotification Query

**File:** `convex/notifications.ts`
**Fix:** New `orgQuery` that returns the most recent notification for the current staff member:
```typescript
export const getLatest = orgQuery({
  args: {},
  returns: v.union(notificationValidator, v.null()),
  handler: async (ctx) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_org_staff", q => q.eq("organizationId", ctx.organizationId).eq("staffId", ctx.staff._id))
      .order("desc")
      .first();
  },
});
```

### 5.2 Reactive Toast Component

**File:** New hook `src/modules/notifications/hooks/useNotificationToast.ts`
**Approach:**
1. Subscribe to `getLatest` query
2. Track previous notification ID with `useRef`
3. When ID changes (new notification), show toast with notification content
4. Toast includes: notification title, message, and link to appointment
5. Use sonner toast with action button

**Integration:** Add to the authenticated layout that wraps staff pages.

---

## Implementation Order

1. Phase 1 (Critical Bugs) - Do first, these are production bugs
2. Phase 3.2-3.4 (Simple Security) - Quick wins
3. Phase 2 (Performance) - Schema changes can be batched
4. Phase 4 (Error Handling) - Frontend improvements
5. Phase 3.1 (Slot Rate Limit) - Needs testing
6. Phase 5 (Toast Feature) - New functionality last

## Files Modified (Estimated)

| File | Changes |
|------|---------|
| `convex/schema.ts` | +2 fields, +1 index |
| `convex/appointments.ts` | Rate limit fix, date validation, enrichment, HTTP internal query |
| `convex/notifications.ts` | Timezone fix, getLatest query |
| `convex/email_helpers.ts` | Timezone fix, field rename |
| `convex/customers.ts` | searchByPhone limit |
| `convex/slots.ts` | Rate limit, override batch |
| `convex/http.ts` | New confirmation code endpoint |
| `convex/lib/dateTime.ts` | Date validation helper |
| `convex/lib/validators.ts` | New reminder fields |
| `convex/lib/rateLimits.ts` | New rate limit configs |
| `src/lib/errors.ts` | New utility |
| `src/modules/booking/hooks/useBookingFlow.ts` | SessionId fix |
| `src/modules/booking/components/TimeSlotGrid.tsx` | Retry mechanism |
| `src/modules/booking/components/ConfirmBookingDialog.tsx` | Error logging |
| `src/app/[slug]/(public)/book/error.tsx` | New error boundary |
| `src/app/[slug]/(public)/appointment/[code]/page.tsx` | HTTP action migration |
| `src/modules/notifications/hooks/useNotificationToast.ts` | New hook |
| Staff layout file | Toast integration |
