# Convex-Helpers Reference

Comprehensive reference for all `convex-helpers` features used or planned in this project.

**Package:** `convex-helpers@^0.1.111` (installed)

## Feature Summary

| # | Feature | Import Path | Status | Location |
|---|---------|------------|--------|----------|
| 1 | Custom Functions | `convex-helpers/server/customFunctions` | Implemented | `convex/lib/functions.ts` |
| 2 | Triggers | `convex-helpers/server/triggers` | Implemented | `convex/lib/triggers.ts` |
| 3 | Validator Utilities | `convex-helpers/validators` | Implemented | `convex/lib/validators.ts` |
| 4 | `pick` | `convex-helpers` | Implemented | `convex/lib/validators.ts` |
| 5 | `makeUseQueryWithStatus` | `convex-helpers/react` | Dead code | `src/hooks/useQueryWithStatus.ts` |
| 6 | Action Retry Wrapper | `convex-helpers/server/retries` | Planned (M10) | `convex/lib/retries.ts` (to create) |
| 7 | Relationship Helpers | `convex-helpers/server/relationships` | Planned | Multiple convex files |
| 8 | Manual Pagination | `convex-helpers/server/pagination` | Planned | `convex/admin.ts`, `convex/notifications.ts` |

---

## Implemented Features

### 1. Custom Functions

**Import:** `convex-helpers/server/customFunctions`
**File:** `convex/lib/functions.ts`
**Exports used:** `customQuery`, `customMutation`, `customCtx`

Enables building a typed auth wrapper hierarchy by layering context enrichment onto base Convex functions. This is the foundation of all query/mutation auth in the project.

#### How It's Used

All public Convex functions use one of the wrappers below instead of raw `query()` or `mutation()`:

| Wrapper | Auth | Added to `ctx` |
|---------|------|----------------|
| `publicQuery/Mutation` | None | — |
| `authedQuery/Mutation` | Logged in | `ctx.user` |
| `orgQuery/Mutation` | Logged in + org member | `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` |
| `ownerQuery/Mutation` | Logged in + owner role | same as org + `ctx.role: "owner"` |
| `superAdminQuery/Mutation` | Logged in + env email | `ctx.user`, `ctx.isSuperAdmin: true` |

The mutation wrappers chain through a `triggerMutation` base (built with `customCtx`) that wraps the DB with trigger-aware write proxies:

```typescript
// convex/lib/functions.ts
const triggerMutation = customMutation(baseMutation, customCtx(triggers.wrapDB));

export const orgMutation = customMutation(triggerMutation, {
  args: { organizationId: v.id("organization") },
  input: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const { member, staff } = await resolveOrgContext(ctx, user, args.organizationId);
    if (!member) throw new ConvexError({ code: ErrorCode.FORBIDDEN, ... });
    return { ctx: { user, organizationId: args.organizationId, member, staff }, args: {} };
  },
});
```

#### Rules

- All Convex functions **must** use one of the wrappers above — never raw `query()` or `mutation()`.
- Org-scoped wrappers (`orgQuery/Mutation`, `ownerQuery/Mutation`) accept `organizationId` from the frontend but inject it into `ctx`. Do **not** re-declare `organizationId` in handler `args`.
- All functions **must** have a `returns:` validator.

---

### 2. Triggers

**Import:** `convex-helpers/server/triggers`
**File:** `convex/lib/triggers.ts`
**Exports used:** `Triggers`

Runs code automatically inside the same transaction when a document is inserted, updated, or deleted. The project registers one trigger on the `appointments` table that fires notifications and emails on every appointment change.

#### How It's Used

```typescript
// convex/lib/triggers.ts
const triggers = new Triggers<DataModel>();

triggers.register("appointments", async (ctx, change) => {
  const { operation, oldDoc, newDoc } = change;
  // change.operation: "insert" | "update" | "delete"
  // change.oldDoc: null on insert
  // change.newDoc: null on delete
});
```

#### Registered Events

| Event | Trigger condition | Side effect |
|-------|------------------|-------------|
| INSERT | Any new appointment | `notifyAllStaff` (new_booking) + `sendBookingConfirmation` email |
| UPDATE | `status` → `"confirmed"` | `createNotification` for assigned staff (status_change) |
| UPDATE | `status` → `"cancelled"` | `createNotification` for assigned staff (cancellation) + `sendCancellationEmail` |
| UPDATE | `rescheduleCount` increased | `createNotification` for assigned staff (reschedule) |
| UPDATE | `status` → `"no_show"` | `createNotification` for assigned staff (no_show) |

The trigger is wired via `customCtx(triggers.wrapDB)` into `triggerMutation`, which is the base for all mutation wrappers (see Custom Functions above).

#### Rules

- Mutations **must not** call `ctx.scheduler.runAfter()` for appointment notifications directly — the trigger handles it automatically.
- Triggers run in the same transaction. Avoid writing to high-contention documents (global counters) inside triggers — this causes OCC conflicts under load.
- To register a trigger on a new table, add `triggers.register("tableName", ...)` in `convex/lib/triggers.ts`.

---

### 3. Validator Utilities

**Import:** `convex-helpers/validators`
**File:** `convex/lib/validators.ts`
**Exports used:** `typedV`, `literals`, `nullable`, `withSystemFields`

Extends Convex's built-in `v` validator with schema-aware and ergonomic helpers.

#### `typedV`

Creates a schema-typed validator builder. Used once to produce `vv`:

```typescript
const vv = typedV(schema);
```

`vv` is then used across `validators.ts` for:
- `vv.doc("tableName")` — full document validator (20 tables: organization, member, staff, appointments, customers, services, etc.)
- `vv.id("tableName")` — typed ID validator (3 uses in `productPublicValidator`)

#### `literals`

Creates a `v.union(v.literal(...), ...)` from a list of string values. Used for all enum-like fields (24 validators):

```typescript
export const appointmentStatusValidator = literals(
  "pending", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"
);
```

Replaces verbose `v.union(v.literal("pending"), v.literal("confirmed"), ...)` with a clean one-liner.

#### `nullable`

Wraps a validator with `v.union(validator, v.null())`:

```typescript
nullable(v.string())      // v.union(v.string(), v.null())
nullable(subscriptionStatusValidator)
```

Used for optional fields that can be explicitly null (vs `v.optional` which means "field absent").

#### `withSystemFields`

Prepends `_id` and `_creationTime` system fields to a custom field object, producing a complete document shape:

```typescript
export const serviceWithCategoryValidator = v.object(
  withSystemFields("services", {
    name: v.string(),
    categoryName: v.optional(v.string()),
    // ...
  })
);
```

Used in 13 composite validators for enriched return types that combine fields from multiple tables.

---

### 4. `pick`

**Import:** `convex-helpers` (root)
**File:** `convex/lib/validators.ts`

Selects a subset of fields from a validator object. Used to create lightweight return types that expose only the fields the frontend needs:

```typescript
import { pick } from "convex-helpers";

export const customerListItemValidator = v.object(
  withSystemFields("customers", pick(vv.doc("customers").fields, [
    "name", "phone", "email", "accountStatus", "totalVisits",
    "totalSpend", "notes", "source", "createdAt", "updatedAt",
    "tags", "loyaltyPoints",
  ]))
);
```

Used in 3 validators: `customerListItemValidator`, `customerSearchResultValidator`, `adminActionLogValidator`.

---

### 5. `makeUseQueryWithStatus` (Dead Code)

**Import:** `convex-helpers/react`
**File:** `src/hooks/useQueryWithStatus.ts`

```typescript
export const useQueryWithStatus = makeUseQueryWithStatus(useQueries);
```

**Status: never used.** The exported hook has zero consumers in `src/`. Either wire it into existing queries (it provides `{ status, data, error }` shape instead of raw data) or delete the file.

---

## Planned Additions

### Dependencies

- Story 6 (Action Retry) is a prerequisite for Milestone 10 Story 3 (AI credit error recovery).
- Stories 7 and 8 are independent improvements.
- All three can be developed in parallel.

---

### Story 6: Action Retry Wrapper

**Priority:** High
**Prerequisite for:** M10 Story 3 (credit error recovery)

#### Context

Milestone 10 AI features call external APIs (OpenAI via AI Gateway, fal.ai for image processing). These actions deduct credits before calling the API. If the external call fails transiently (network timeout, 5xx), the action should be retried with exponential backoff before giving up and refunding credits.

`makeActionRetrier` is a factory that creates a `runWithRetries` function and an internal `retry` mutation. The `retry` mutation polls the `_scheduled_functions` system table, detects failures, and re-schedules the action up to `maxFailures` times with jittered exponential backoff.

#### API

```typescript
import { makeActionRetrier } from "convex-helpers/server/retries";

// convex/lib/retries.ts
export const { runWithRetries, retry } = makeActionRetrier("lib/retries:retry", {
  waitBackoff: 100,   // delay before first status check (ms)
  retryBackoff: 500,  // delay before first retry on failure (ms)
  base: 2,            // backoff multiplier (500ms → 1s → 2s)
  maxFailures: 3,     // stop after 3 failures (not the default 16)
});

// Usage in a mutation (M10):
await runWithRetries(ctx, internal.ai.generateHairAnalysis, {
  recordId,
  imageUrl,
});
```

#### Implementation

1. Create `convex/lib/retries.ts`:
   - Export `runWithRetries` and `retry` from `makeActionRetrier("lib/retries:retry")`
   - `maxFailures: 3` — AI actions should fail fast before refunding credits
   - `retryBackoff: 500` — 500ms, 1s, 2s with jitter

2. AI action pattern (M10):
   - Mutation deducts credits → calls `runWithRetries(ctx, internal.ai.someAction, args)`
   - Action calls external API; if it throws, retrier re-schedules automatically
   - After `maxFailures` exhausted, action's final failure triggers credit refund

#### Acceptance Criteria

- [ ] `convex/lib/retries.ts` exports both `runWithRetries` and `retry`
- [ ] `retry` is a **named export** (the retrier references it by the string `"lib/retries:retry"`)
- [ ] `maxFailures` is 3
- [ ] `retryBackoff` starts at 500ms
- [ ] Verify: `runWithRetries` retries a deliberately-failing action up to 3 times (visible in Convex dashboard → Scheduled Functions)
- [ ] No lint errors: `bunx biome check convex/lib/retries.ts`
- [ ] Build passes: `bun run build`

#### Notes

- `makeActionRetrier` returns an `internalMutationGeneric` — it does **not** use our custom `internalMutation` wrapper. This is correct; the retry mutation is infrastructure, not user-facing.
- The library's `retry` mutation uses `v.any()` for `actionArgs`. Suppress the resulting Biome lint warning with `// biome-ignore lint/suspicious/noExplicitAny`.
- Actions must be idempotent for retries to be safe. AI actions are idempotent because the record ID is passed in args (not generated inside the action).

---

### Story 7: Relationship Helpers

**Priority:** Medium

#### Context

The codebase has ~20 instances of the pattern:

```typescript
const related = await Promise.all(items.map(item => ctx.db.get(item.relatedId)));
```

While Convex executes these concurrently, the pattern is verbose and provides no null-safety guarantees. `getAll` from `convex-helpers/server/relationships` is a direct semantic replacement.

#### Available Helpers

```typescript
import { getAll, getOneFrom, getManyFrom, getManyVia } from "convex-helpers/server/relationships";

// getAll: batch fetch by ID array — order-preserving, (Doc | null)[]
const docs = await getAll(ctx.db, ids);

// getOneFrom: 1:1 via index field
const profile = await getOneFrom(ctx.db, "profiles", "userId", user._id);

// getManyFrom: 1:N via index
const posts = await getManyFrom(ctx.db, "posts", "by_authorId", author._id);

// getManyVia: M:N via join table
const categories = await getManyVia(ctx.db, "postCategories", "categoryId", "by_post", post._id);
```

#### Target Refactoring Locations

| File | Line(s) | Function | Pattern |
|------|---------|----------|---------|
| `convex/appointments.ts` | 90–92 | `batchEnrichAppointments` | `Promise.all(customerIds.map(...))` + `Promise.all(staffIds.map(...))` |
| `convex/appointments.ts` | 664–667 | `listForCurrentUser` | `Promise.all(orgIds.map(...))` |
| `convex/appointments.ts` | 1256 | `listByCustomer` | `Promise.all(staffIds.map(...))` |
| `convex/services.ts` | 52–53 | `listPublic` | `Promise.all(categoryIds.map(...))` |
| `convex/services.ts` | 123–124 | `list` | `Promise.all(categoryIds.map(...))` |
| `convex/products.ts` | 54–58 | `list` | `Promise.all(uniqueCategoryIds.map(...))` |
| `convex/customers.ts` | 735–736 | `getMyProfiles` | `Promise.all(orgIds.map(...))` |
| `convex/organizations.ts` | 173–183 | `listForUser` | `map(m => ctx.db.get(m.organizationId))` |
| `convex/invitations.ts` | 65–78 | `listForUser` | `map(inv => ctx.db.get(inv.organizationId))` |
| `convex/favoriteSalons.ts` | 32–33 | `list` | `Promise.all(orgIds.map(...))` |
| `convex/timeOffRequests.ts` | 85 | `list` | `Promise.all(staffIds.map(...))` |
| `convex/inventoryTransactions.ts` | 48–53 | `listByProduct` | `Promise.all(staffIds.map(...))` |
| `convex/inventoryTransactions.ts` | 99–107 | `listRecent` | `Promise.all([...products, ...staff])` |

#### Implementation

1. No new file needed — import `getAll` directly in each file:
   ```typescript
   import { getAll } from "convex-helpers/server/relationships";
   ```

2. Replace each `Promise.all(ids.map(id => ctx.db.get(id)))` with `getAll(ctx.db, ids)`.
   - `getAll` returns `(Doc | null)[]` in the same order as the input IDs.
   - Most callers already `.filter(Boolean)` the result — no behavior change.

3. The `appointmentServices` N+1 (`appointments.ts:107–113`) is a separate case — each appointment requires one index query, not a `db.get`. `getManyFrom` is semantically cleaner but doesn't reduce query count. The better fix is a pre-fetch-into-Map:
   ```typescript
   const allServices = await ctx.db.query("appointmentServices")
     .withIndex("by_organization", q => q.eq("organizationId", orgId))
     .collect();
   const servicesByAppointment = new Map<Id<"appointments">, Doc<"appointmentServices">[]>();
   for (const s of allServices) {
     const list = servicesByAppointment.get(s.appointmentId) ?? [];
     list.push(s);
     servicesByAppointment.set(s.appointmentId, list);
   }
   ```
   This optimization is optional for this story — `getAll` refactors are the primary scope.

#### Acceptance Criteria

- [ ] All 13 locations in the table above are refactored to use `getAll`
- [ ] No behavioral change — each function returns identical data before and after
- [ ] `getAll` nulls handled correctly (`.filter(Boolean)` or explicit null checks where required)
- [ ] No lint errors: `bun run lint`
- [ ] Build passes: `bun run build`
- [ ] Visual verification: appointment list, services, customer profiles, and admin pages render identically

---

### Story 8: Manual Pagination (`getPage` / `paginator`)

**Priority:** Medium

#### Context

The codebase has several unbounded `.collect()` calls that will degrade as data grows. The most critical are in the admin panel, which collects entire tables with no limit.

The backend has one cursor-based endpoint (`appointments.listPaginated`) using Convex's built-in `.paginate()`, but no frontend component calls it — `usePaginatedQuery` has zero consumers in `src/`.

`convex-helpers/server/pagination` provides two APIs:

- **`getPage`** — low-level, index-key-based: returns `{ page, hasMore, indexKeys }`. The last `indexKey` becomes the next `startIndexKey`.
- **`paginator`** — high-level, cursor-based: mirrors `.paginate(opts)` but can be called multiple times per query and produces unencrypted cursors. Requires the schema to be passed in.

#### API

```typescript
import { getPage, paginator } from "convex-helpers/server/pagination";
import schema from "../schema";

// paginator (recommended for admin tables)
const result = await paginator(ctx.db, schema)
  .query("organization")
  .order("desc")
  .paginate({ cursor: args.cursor ?? null, numItems: args.numItems ?? 20 });
// result.page: Doc<"organization">[]
// result.continueCursor: string  (pass back to client for next page)
// result.isDone: boolean

// getPage (useful for range-bounded pages)
const result = await getPage(ctx, {
  table: "appointments",
  index: "by_org_date",
  startIndexKey: [orgId, startDate],
  endIndexKey:   [orgId, endDate],
  targetMaxRows: 50,
  order: "desc",
  schema,
});
// result.page: Doc<"appointments">[]
// result.hasMore: boolean
// result.indexKeys: IndexKey[]
```

#### Target Locations

| Priority | File | Function | Current Issue | Solution |
|----------|------|----------|---------------|---------|
| P0 | `convex/admin.ts:117` | `listOrganizations` | Collects entire `organization`, `member`, `customers`, `appointments` tables | `paginator` with cursor + numItems args |
| P0 | `convex/admin.ts:494` | `listUsers` | Collects all `member` + `bannedUsers` rows | `paginator` with cursor + numItems args |
| P1 | `convex/notifications.ts:32` | `list` | Collects all, slices to 50 in JS | `.order("desc").take(50)` (notifications auto-expire after 7 days, no true pagination needed) |
| P1 | `convex/notifications.ts:56` | `getUnreadCount` | Collects all unread for `.length` | `.take(100)` + return `Math.min(count, 99)` |
| P1 | `convex/customers.ts:86` | `list` | `.take(500)` with no cursor | `paginator` with cursor args |
| P2 | `convex/reports.ts:716` | `getCustomerReport` | All appointments from 2020 | Batched aggregation via `getPage` loop |

#### Implementation

P0 targets (admin tables) and P1 targets (notifications) are the required scope. Customer list and reports are optional.

1. **`listOrganizations`** (`convex/admin.ts`):
   - Add `cursor: v.optional(v.string())` and `numItems: v.optional(v.number())` to args
   - Replace unbounded fetches with `paginator(ctx.db, schema).query("organization").paginate({ cursor: args.cursor ?? null, numItems: args.numItems ?? 20 })`
   - Return `{ items, continueCursor, isDone }` instead of a flat array
   - Update admin frontend to show "Load More" when `!isDone`

2. **`listUsers`** (`convex/admin.ts`): same pattern as above.

3. **Notification `list`**: replace `.collect()` + JS slice with `.order("desc").take(50)`.

4. **Notification `getUnreadCount`**: replace `.collect().length` with `.take(100)` + `Math.min(result.length, 99)`.

5. Note: `paginator` requires `schema` from `../schema`. The `schema` import is already present in `convex/lib/validators.ts`; add it to the individual function files as needed.

#### Acceptance Criteria

- [ ] `listOrganizations` and `listUsers` accept cursor/numItems and return `{ items, continueCursor, isDone }`
- [ ] Admin frontend shows "Load More" button when `isDone === false`
- [ ] `notifications.list` uses `.order("desc").take(50)` instead of `.collect()` + JS slice
- [ ] `notifications.getUnreadCount` uses `.take(100)` instead of `.collect().length`
- [ ] `schema` imported from `"../schema"` wherever `paginator` is used
- [ ] No lint errors: `bun run lint`
- [ ] Build passes: `bun run build`
- [ ] Visual verification: admin tables and notification dropdown work correctly

---

## Quality Gates

Every planned story must pass before merge:

1. `bun run lint` — zero errors
2. `bun run build` — zero errors
3. Visual browser verification for any UI changes
4. No behavioral regressions

## Non-Goals

- **Row-Level Security (RLS):** The project uses custom function wrappers for auth. No plan to add RLS.
- **Workpool:** Not needed currently. AI actions are low-concurrency per salon. Revisit if OCC issues appear during M10.
- **`makeUseQueryWithStatus` (Feature 5):** Wire it in or delete it. Not in scope for any current story.
