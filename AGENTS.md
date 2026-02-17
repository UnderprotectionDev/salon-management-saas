# AGENTS.md

Guide for AI coding agents working in this repository. See `CLAUDE.md` for deeper architectural details.

## Commands

```bash
# Development
bun install                        # Install dependencies
bun run dev                        # Next.js dev server (localhost:3000)
bunx convex dev                    # Convex backend + type generation (MUST run in separate terminal)
bun run email:dev                  # React Email preview server (port 3001)
bunx shadcn@latest add <component> # Add a shadcn/ui component

# Linting & Formatting
bun run lint                       # Biome check (linter + formatter) — entire project
bunx biome check src/modules/booking/  # Lint a specific directory
bunx biome check path/to/file.ts       # Lint a single file
bun run format                     # Biome auto-format with --write

# Build & Type Checking
bun run build                      # Production build (TypeScript type check + Next.js build)
bun run sync-products              # Sync Polar products (run once after billing setup)
```

**Important:** Always use `bun`, never `npm` or `yarn`. No test framework is configured — there are no tests to run.

**Critical:** Schema changes require `bunx convex dev` running to regenerate types in `convex/_generated/`.

## Tech Stack

- **Frontend:** Next.js 16, React 19 + React Compiler, Tailwind CSS v4, shadcn/ui (New York)
- **Backend:** Convex (database, real-time functions), convex-helpers (triggers, custom functions)
- **Auth:** Better Auth via `@convex-dev/better-auth`
- **Payments:** Polar via `@convex-dev/polar`
- **Email:** Resend + React Email (transactional emails with JSX templates)
- **Forms:** TanStack Form + Zod 4 validation
- **Linter/Formatter:** Biome 2.2 (no ESLint or Prettier)

## Code Style

### Formatting (Biome)

- **Indentation:** 2 spaces. **Semicolons:** on. **Quotes:** double.
- **Imports:** Auto-organized by Biome (`organizeImports`). Use `type` imports for type-only references.
- **Path alias:** `@/*` maps to `./src/*`
- **Lint rules:** `recommended` + Next.js/React domains. `noUnknownAtRules` is off (Tailwind v4 `@theme`).

### TypeScript

- Strict mode. No `any` unless unavoidable.
- `convex/_generated/` files have pre-existing lint errors — ignore them, never edit them.

### React

- **React Compiler is active.** Do NOT use `useMemo`, `useCallback`, or `React.memo` — the compiler handles memoization. Manual memoization will conflict.
- Prefer function declarations for components. Use `"use client"` only when hooks or browser APIs are needed.
- TanStack Form: `form.state.values` is NOT reactive — use `form.Subscribe` for reactive UI. Never call `form.reset()` during render; use `key={id}` prop instead.

### Tailwind CSS v4

- No `tailwind.config.js` — all config in CSS (`@theme`, `@custom-variant`, CSS variables in `src/app/globals.css`).
- Colors use **oklch** color space. Border radius is `0.2rem` (brutalist). Prefer utility classes over `@apply`.

### Naming Conventions

- **Files:** kebab-case for utilities (`auth-client.ts`), PascalCase for components (`OrganizationProvider.tsx`)
- **Variables/functions:** camelCase. **Types/interfaces:** PascalCase.
- **Convex tables:** camelCase as defined in schema (`organization`, `member`, `services`, `customers`)
- **Terminology:** Code/database uses `organization`, UI displays `salon`, architecture docs say `tenant`.

## Project Structure

```
convex/                      # Backend (Convex functions + schema)
  schema.ts                  # Database schema (source of truth)
  convex.config.ts           # Registered components (betterAuth, polar, rateLimiter)
  lib/functions.ts           # Auth wrappers + ErrorCode enum
  lib/validators.ts          # Shared return type validators (derived from schema)
  lib/triggers.ts            # Auto-fire notifications/emails on appointment changes
  lib/rateLimits.ts          # Rate limiting config
src/
  app/                       # Next.js App Router pages
    [slug]/(authenticated)/  # Protected org routes
    [slug]/(public)/         # Public routes (booking, confirmation)
    (auth)/                  # Sign-in pages
  components/ui/             # shadcn/ui primitives
  modules/                   # Feature modules (auth, billing, booking, calendar,
                             #   customers, dashboard, notifications, onboarding,
                             #   organization, reports, services, settings, staff)
  lib/                       # Utilities (cn(), auth helpers)
  emails/                    # React Email templates
```

## Convex Function Wrappers

Always use custom wrappers from `convex/lib/functions.ts`, never raw `query()`/`mutation()`:

| Wrapper | Auth | Context |
|---------|------|---------|
| `publicQuery` | None | — |
| `publicMutation` | None | — |
| `authedQuery/Mutation` | Logged in | `ctx.user` |
| `orgQuery/Mutation` | Logged in + org member | `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` |
| `ownerQuery/Mutation` | Logged in + owner role | Same as org + `ctx.role` |
| `superAdminQuery/Mutation` | Logged in + env email match | `ctx.user`, `ctx.isSuperAdmin` |

**Org-scoped wrappers** (`orgQuery/Mutation`, `ownerQuery/Mutation`) require `organizationId` from the frontend but auto-inject it into `ctx`. Do NOT define `organizationId` in your handler's `args`:

```typescript
// WRONG — organizationId already handled by wrapper
export const get = orgQuery({ args: { organizationId: v.id("organization") }, ... });

// CORRECT — access via ctx
export const get = orgQuery({
  args: {},
  handler: async (ctx) => { const orgId = ctx.organizationId; },
});
// Frontend: useQuery(api.foo.get, { organizationId: org._id });
```

All queries/mutations **must** have a `returns:` validator. Use validators from `convex/lib/validators.ts` (`vv.doc("tableName")` for doc validators, composite validators for enriched types).

All mutations use `triggerMutation` as base — triggers in `convex/lib/triggers.ts` auto-fire notifications and emails on appointment insert/update. Do NOT manually schedule notification side-effects in mutations.

## Organization Context (Frontend)

Use hooks from `@/modules/organization` — never read org data directly from auth:

- `useOrganization()` — Full context (`activeOrganization`, `organizations`, `currentStaff`, `currentRole`)
- `useActiveOrganization()` — Current organization only
- `useCurrentStaff()` — User's staff profile in active org

## Rate Limiting

Apply rate limits in mutations via `convex/lib/rateLimits.ts`:

```typescript
import { rateLimiter } from "./lib/rateLimits";
await rateLimiter.limit(ctx, "createInvitation", { key: ctx.organizationId });
```

Available limits: `createBooking`, `createInvitation`, `createService`, `createCustomer`, `createOrganization`, `createScheduleOverride`, `createTimeOffRequest`, `createOvertime`, `cancelBooking`, `rescheduleBooking`, `resendInvitation`, `addMember`, `cancelSubscription`, `banUser`, `suspendOrganization`, `deleteOrganization`

## Error Handling

**Backend** — throw `ConvexError` with an `ErrorCode`:
```typescript
throw new ConvexError({ code: ErrorCode.NOT_FOUND, message: "Staff not found" });
```
Codes: `UNAUTHENTICATED`, `FORBIDDEN`, `OWNER_REQUIRED`, `SUPER_ADMIN_REQUIRED`, `NOT_FOUND`, `ALREADY_EXISTS`, `VALIDATION_ERROR`, `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL_ERROR`

**Frontend** — catch `ConvexError` from mutations:
```typescript
try {
  await mutation({ organizationId, ...args });
  toast.success("Done");
} catch (error) {
  toast.error(error instanceof ConvexError ? (error.data.message || "Error") : "Unexpected error");
}
```

## Domain Rules

- **Pricing:** Stored as kurus integers (15000 = 150.00 TL). Convert at UI layer with `formatPrice()`.
- **Phone numbers:** Turkish format (+90 5XX XXX XX XX). Validated via `convex/lib/phone.ts`.
- **Confirmation codes:** 6-char alphanumeric (excludes 0/O/I/1). Generated by `convex/lib/confirmation.ts`.
- **Soft delete:** Services use `status: "inactive"`. Customers use hard delete.
- **Roles:** Only `"owner"` and `"staff"` — no admin/member roles.
- **Multi-tenancy:** Every table has `organizationId`. Wrappers enforce tenant isolation.
- **Slot locks:** Temporary (2-min TTL, cleaned by cron every 1 min) to prevent double-booking.
- **Date ranges:** Use index range queries (`.gte()/.lte()`), never per-day loops.
- **Time:** `startTime`/`endTime` stored as minutes-from-midnight integers.

## Convex Gotchas

- Actions (`"use node"`) cannot access `ctx.db` — call `ctx.runQuery`/`ctx.runMutation` with `internal.*` functions.
- `convex/email.tsx` uses `"use node"` and can import from `../src/` — esbuild handles JSX for email rendering.
- Schema changes require the Convex dev server running to regenerate types.
- `convex/_generated/` is auto-generated — never edit.
- Avoid N+1 queries: pre-fetch into Maps, use index range queries.
- `getAuthUser` checks `bannedUsers` table before returning (super admins bypass).

## Adding a Feature

1. Update `convex/schema.ts`
2. Wait for type regeneration (`bunx convex dev` must be running)
3. Add validators to `convex/lib/validators.ts`
4. Create Convex functions using appropriate wrappers (with `returns:` validators)
5. Apply rate limiting in mutations if the operation is user-initiated
6. Create frontend module in `src/modules/<feature>/` with an `index.ts` public API
7. Run `bun run lint` before committing
