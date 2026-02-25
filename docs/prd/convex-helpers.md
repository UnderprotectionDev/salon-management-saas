# Convex-Helpers Reference

**Package:** `convex-helpers@^0.1.111` (installed)

## Feature Summary

| # | Feature | Import Path | Status | Location |
|---|---------|------------|--------|----------|
| 1 | Custom Functions | `convex-helpers/server/customFunctions` | Implemented | `convex/lib/functions.ts` |
| 2 | Triggers | `convex-helpers/server/triggers` | Implemented | `convex/lib/triggers.ts` |
| 3 | Validator Utilities | `convex-helpers/validators` | Implemented | `convex/lib/validators.ts` |
| 4 | `pick` | `convex-helpers` | Implemented | `convex/lib/validators.ts` |
| 5 | `makeUseQueryWithStatus` | `convex-helpers/react` | Dead code | `src/hooks/useQueryWithStatus.ts` |
| 6 | Action Retry Wrapper | `convex-helpers/server/retries` | Planned (M10) | `convex/lib/retries.ts` |
| 7 | Relationship Helpers | `convex-helpers/server/relationships` | Planned | Multiple convex files |
| 8 | Manual Pagination | `convex-helpers/server/pagination` | Planned | `convex/admin.ts`, `convex/notifications.ts` |

---

## Implemented Features

### 1. Custom Functions

**File:** `convex/lib/functions.ts` — Exports: `customQuery`, `customMutation`, `customCtx`

All public Convex functions use wrappers (see CLAUDE.md → Convex Custom Function Wrappers table). Mutation wrappers chain through `triggerMutation` base built with `customCtx(triggers.wrapDB)`.

**Rules:**
- All functions **must** use wrappers — never raw `query()` or `mutation()`
- Org-scoped wrappers accept `organizationId` from frontend but inject into `ctx` — don't redeclare in handler `args`
- All functions **must** have a `returns:` validator

### 2. Triggers

**File:** `convex/lib/triggers.ts` — One trigger on `appointments` table.

| Event | Trigger condition | Side effect |
|-------|------------------|-------------|
| INSERT | Any new appointment | `notifyAllStaff` (new_booking) + `sendBookingConfirmation` email |
| UPDATE | `status` → `"confirmed"` | `createNotification` for assigned staff |
| UPDATE | `status` → `"cancelled"` | `createNotification` + `sendCancellationEmail` |
| UPDATE | `rescheduleCount` increased | `createNotification` for assigned staff |
| UPDATE | `status` → `"no_show"` | `createNotification` for assigned staff |

**Rules:**
- Don't call `ctx.scheduler.runAfter()` for appointment notifications — trigger handles it
- Triggers run in same transaction — avoid writing to high-contention documents
- Register new triggers in `convex/lib/triggers.ts`

### 3. Validator Utilities

**File:** `convex/lib/validators.ts` — Exports: `typedV`, `literals`, `nullable`, `withSystemFields`

- `typedV(schema)` → `vv` for `vv.doc("tableName")` (20 tables) and `vv.id("tableName")`
- `literals(...)` — creates `v.union(v.literal(...), ...)` from string values (24 validators)
- `nullable(validator)` — wraps with `v.union(validator, v.null())`
- `withSystemFields("table", fields)` — prepends `_id` and `_creationTime` (13 composite validators)

### 4. `pick`

**File:** `convex/lib/validators.ts` — Selects field subset from validator object. Used in `customerListItemValidator`, `customerSearchResultValidator`, `adminActionLogValidator`.

### 5. `makeUseQueryWithStatus` (Dead Code)

**File:** `src/hooks/useQueryWithStatus.ts` — Zero consumers. Wire it in or delete.

---

## Planned Additions

### Story 6: Action Retry Wrapper (High Priority — prereq for M10 Story 3)

Create `convex/lib/retries.ts` with `makeActionRetrier("lib/retries:retry")`. Config: `maxFailures: 3`, `retryBackoff: 500ms` (500ms → 1s → 2s). Used by AI actions: mutation deducts credits → `runWithRetries` → action calls external API → on exhausted retries, refund credits.

Notes: `retry` must be a **named export**. The library's `retry` mutation uses `v.any()` (suppress Biome warning). Actions must be idempotent.

### Story 7: Relationship Helpers (Medium Priority)

Replace ~13 instances of `Promise.all(ids.map(id => ctx.db.get(id)))` with `getAll(ctx.db, ids)` from `convex-helpers/server/relationships`. Returns `(Doc | null)[]` in same order. Target files: appointments.ts, services.ts, products.ts, customers.ts, organizations.ts, invitations.ts, favoriteSalons.ts, timeOffRequests.ts, inventoryTransactions.ts.

### Story 8: Manual Pagination (Medium Priority)

Use `paginator(ctx.db, schema)` for admin tables (`listOrganizations`, `listUsers`) — add `cursor`/`numItems` args, return `{ items, continueCursor, isDone }`. For notifications: replace `.collect()` + JS slice with `.order("desc").take(50)`.

---

## Quality Gates

Every story must pass: `bun run lint`, `bun run build`, visual browser verification.

## Non-Goals

- Row-Level Security (RLS) — using custom function wrappers instead
- Workpool — not needed currently
- `makeUseQueryWithStatus` — wire it in or delete, not in scope
