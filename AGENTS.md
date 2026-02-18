# AGENTS.md

Guide for AI coding agents working in this repository.

## Commands

```bash
# Development
bun install                          # Install dependencies
bun run dev                          # Next.js dev server (localhost:3000)
bun x convex dev                     # Convex backend + type generation (separate terminal, REQUIRED)
bun run email:dev                    # React Email preview (port 3001)
bun x shadcn@latest add <component>  # Add a shadcn/ui component

# Linting & Formatting
bun run lint                         # Biome check — entire project
bun x biome check convex/foo.ts      # Lint a single file or directory
bun run format                       # Biome auto-format with --write

# Build & Type Checking
bun run build                        # Production build (TypeScript + Next.js)
bun run sync-products                # Sync Polar products (once after billing setup)
```

**Important:** Always use `bun` / `bun x`. Never `npm`, `yarn`, or `npx`. No test framework — no tests to run.

**Critical:** Schema changes require `bun x convex dev` running to regenerate `convex/_generated/`.

## Tech Stack

- **Frontend:** Next.js 16, React 19 + React Compiler, Tailwind CSS v4, shadcn/ui (New York)
- **Backend:** Convex 1.31.7, convex-helpers (triggers, custom functions, validators)
- **Auth:** Better Auth via `@convex-dev/better-auth`
- **Payments:** Polar via `@convex-dev/polar`
- **Email:** Resend + React Email
- **AI:** `@convex-dev/agent` v0.3.2 (LLM), `@ai-sdk/fal` (image generation), Vercel AI SDK v6
- **Forms:** TanStack Form + Zod 4
- **Linter/Formatter:** Biome 2.2 (no ESLint, no Prettier)

## Code Style

### Formatting (Biome)
- **Indentation:** 2 spaces. **Semicolons:** on. **Quotes:** double.
- **Imports:** Auto-organized by Biome. Use `type` imports for type-only references.
- **Path alias:** `@/*` → `./src/*`
- `convex/_generated/` has pre-existing lint errors — ignore them, never edit those files.

### TypeScript
- Strict mode. Avoid `any`; use `biome-ignore lint/suspicious/noExplicitAny: <reason>` inline when unavoidable.
- Export types/interfaces as PascalCase. Keep `as const` for literal objects.

### React
- **React Compiler is active** — do NOT use `useMemo`, `useCallback`, or `React.memo`. The compiler handles memoization; manual memoization will conflict.
- Prefer function declarations for components. Add `"use client"` only for hooks or browser APIs.
- **TanStack Form:** `form.state.values` is NOT reactive — use `form.Subscribe`. Never call `form.reset()` during render; use `key={id}` instead.

### Tailwind CSS v4
- No `tailwind.config.js` — all config in `src/app/globals.css` (`@theme`, CSS variables).
- Colors: **oklch** color space. Border radius: `0.2rem` (brutalist). Prefer utility classes over `@apply`.

### Naming Conventions
- **Files:** kebab-case for utilities, PascalCase for components.
- **Variables/functions:** camelCase. **Types/interfaces:** PascalCase.
- **Convex tables:** camelCase (`organization`, `member`, `services`, `customers`).
- **Terminology:** database/code uses `organization`; UI shows `salon`; docs say `tenant`.

## Project Structure

```
convex/                      # Backend
  schema.ts                  # Database schema (source of truth)
  convex.config.ts           # Components: betterAuth, polar, rateLimiter
  lib/functions.ts           # Auth wrappers + ErrorCode enum + internalMutation re-export
  lib/validators.ts          # All return-type validators (derived from schema)
  lib/triggers.ts            # Notification/email triggers on appointment changes
  lib/rateLimits.ts          # Rate limiting config
  lib/aiConstants.ts         # CREDIT_COSTS, CREDIT_PACKAGES, salon type maps
  email.tsx                  # Email actions ("use node", can import from ../src/)
src/
  app/                       # Next.js App Router
    [slug]/(authenticated)/  # Protected org routes
    [slug]/(public)/         # Public booking/confirmation routes
    (auth)/                  # Sign-in pages
  components/ui/             # shadcn/ui primitives
  modules/                   # Feature modules — each has index.ts public API
  lib/                       # Utilities (cn(), auth helpers, formatPrice())
  emails/                    # React Email JSX templates
```

## Convex Function Wrappers

Always use wrappers from `convex/lib/functions.ts`. Never use raw `query()`/`mutation()`:

| Wrapper | Auth | Injected ctx |
|---------|------|--------------|
| `publicQuery/Mutation` | None | — |
| `authedQuery/Mutation` | Logged in | `ctx.user` |
| `orgQuery/Mutation` | Member of org | `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` |
| `ownerQuery/Mutation` | Owner role | same + `ctx.role` |
| `superAdminQuery/Mutation` | Env email match | `ctx.user`, `ctx.isSuperAdmin` |
| `internalMutation` | Internal only | raw ctx (re-exported from functions.ts) |

**Org-scoped wrappers** consume `organizationId` from the caller — do NOT redeclare it in `args`:

```typescript
// WRONG
export const get = orgQuery({ args: { organizationId: v.id("organization") }, ... });

// CORRECT — organizationId is in ctx, not args
export const get = orgQuery({
  args: {},
  handler: async (ctx) => { const orgId = ctx.organizationId; },
});
// Frontend call: useQuery(api.foo.get, { organizationId: org._id });
```

Every query/mutation **must** have a `returns:` validator. Use `convex/lib/validators.ts`:
- `vv.doc("tableName")` — full document validator (via `typedV(schema)`)
- `withSystemFields("table", { ...fields })` — add `_id` + `_creationTime` to composite types
- `pick(validator, ["field1", "field2"])` — lightweight subset validators
- `literals("a", "b")`, `nullable(v.string())` — from convex-helpers

All mutations use `triggerMutation` as base — **never** manually schedule notification side-effects in mutations. Triggers in `convex/lib/triggers.ts` auto-fire on appointment insert/update.

## Organization Context (Frontend)

Use hooks from `@/modules/organization` — never read org data directly from auth:

- `useOrganization()` — full context (`activeOrganization`, `organizations`, `currentStaff`, `currentRole`)
- `useActiveOrganization()` — current org only
- `useCurrentStaff()` — user's staff profile in active org

## Rate Limiting

Apply in mutations via `convex/lib/rateLimits.ts`:

```typescript
import { rateLimiter } from "./lib/rateLimits";
await rateLimiter.limit(ctx, "createBooking", { key: userId, throws: true });
```

Available limits: `createBooking`, `createInvitation`, `resendInvitation`, `createService`, `createCustomer`, `createOrganization`, `createScheduleOverride`, `createTimeOffRequest`, `createOvertime`, `acquireSlotLock`, `cancelBooking`, `rescheduleBooking`, `addMember`, `cancelSubscription`, `banUser`, `suspendOrganization`, `deleteOrganization`, `deleteAccount`, `toggleFavoriteSalon`, `updateCustomerProfile`, `linkCustomerToUser`, `confirmationCodeLookup`, `aiPhotoAnalysis`, `aiCareSchedule`, `aiVirtualTryOn`, `aiCreditPurchase`, `aiClaimTestCredits`

## Error Handling

**Backend** — throw `ConvexError` with an `ErrorCode`:
```typescript
import { ErrorCode } from "./lib/functions";
throw new ConvexError({ code: ErrorCode.NOT_FOUND, message: "Staff not found" });
```
Codes: `UNAUTHENTICATED`, `FORBIDDEN`, `OWNER_REQUIRED`, `SUPER_ADMIN_REQUIRED`, `NOT_FOUND`, `ALREADY_EXISTS`, `VALIDATION_ERROR`, `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL_ERROR`

**Frontend** — catch from mutations:
```typescript
try {
  await mutation({ organizationId, ...args });
  toast.success("Done");
} catch (error) {
  toast.error(error instanceof ConvexError ? (error.data.message ?? "Error") : "Unexpected error");
}
```

## Domain Rules

- **Pricing:** Stored as kuruş integers (15000 = 150.00 TL). Convert at UI layer with `formatPrice()` from `@/lib`.
- **Phone numbers:** Turkish format (`+90 5XX XXX XX XX`). Validated via `convex/lib/phone.ts`.
- **Confirmation codes:** 6-char alphanumeric (excludes 0/O/I/1). See `convex/lib/confirmation.ts`.
- **Timestamps:** `createdAt`/`updatedAt` stored as epoch ms integers (`Date.now()`). Dates as `"YYYY-MM-DD"` strings.
- **Time:** `startTime`/`endTime` stored as minutes-from-midnight (540 = 09:00).
- **Soft delete:** Services use `status: "inactive"`. Customers use hard delete.
- **Roles:** Only `"owner"` and `"staff"` — no admin/member distinction beyond these two.
- **Multi-tenancy:** Every table has `organizationId`. Wrappers enforce tenant isolation automatically.
- **Slot locks:** 2-min TTL, cleaned by cron every 1 min to prevent double-booking.
- **Queries:** Use index range queries (`.gte()/.lte()`), never per-day loops or unbounded `.collect()`.

## Convex Gotchas

- Actions (`"use node"`) cannot access `ctx.db` — use `ctx.runQuery`/`ctx.runMutation` with `internal.*`.
- `convex/email.tsx` uses `"use node"` and can import from `../src/` — esbuild handles JSX.
- Schema changes require Convex dev server running to regenerate types.
- Avoid N+1 queries: pre-fetch related docs into Maps, use parallel `Promise.all`, use compound indexes.
- `getAuthUser` checks `bannedUsers` table before returning; super admins bypass the ban check.
- `ConvexError` is a permanent failure — do not retry it (unlike transient network/timeout errors).
- AI actions: service recommendations pass `{ id: name }` maps to the LLM for ID-based matching (not fuzzy strings).

## Adding a Feature

1. Update `convex/schema.ts` (add table or fields, add necessary indexes)
2. Wait for type regeneration (`bun x convex dev` must be running)
3. Add validators to `convex/lib/validators.ts`
4. Create Convex functions using appropriate wrappers (with `returns:` validators)
5. Apply rate limiting in user-initiated mutations
6. Create frontend module in `src/modules/<feature>/` with an `index.ts` public API
7. Run `bun x biome check <changed-files>` before finishing
