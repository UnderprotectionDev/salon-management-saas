# AGENTS.md

Guide for AI coding agents working in this repository.

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Next.js dev server (localhost:3000)
bunx convex dev          # Convex backend + type generation (run in separate terminal)
bun run lint             # Biome check (linter + formatter)
bun run format           # Biome auto-format
bun run build            # Production build (includes TypeScript type check)
bun run email:dev        # React Email preview server (port 3001)
```

Always use `bun`, never `npm` or `yarn`. No test framework is configured; there are no test files.

Schema changes require `bunx convex dev` running to regenerate types in `convex/_generated/`.

## Tech Stack

- **Frontend:** Next.js 16, React 19 + React Compiler, Tailwind CSS v4, shadcn/ui (New York)
- **Backend:** Convex (database, real-time functions), convex-helpers (triggers, custom functions)
- **Auth:** Better Auth via `@convex-dev/better-auth`
- **Payments:** Polar via `@convex-dev/polar`
- **Forms:** TanStack Form + Zod 4 validation
- **Linter/Formatter:** Biome (no ESLint or Prettier)

## Code Style

### Formatting

- **Indentation:** 2 spaces
- **Semicolons / quotes:** Biome defaults (semicolons on, double quotes)
- **Imports:** Auto-organized by Biome (`assist.actions.source.organizeImports`)
- **Path alias:** `@/*` maps to `./src/*`

### TypeScript

- Strict mode enabled. No `any` unless unavoidable.
- Use `type` imports for type-only references: `import type { Foo } from "..."`
- Convex auto-generated files (`convex/_generated/`) have pre-existing lint errors — ignore them.

### React

- **React Compiler is active.** Do NOT use `useMemo`, `useCallback`, or `React.memo` — the compiler handles optimization. Manual memoization may conflict with it.
- Prefer function declarations for components. Use `"use client"` directive only when hooks or browser APIs are needed.
- TanStack Form: `form.state.values` is NOT reactive — use `form.Subscribe` for reactive UI. Never call `form.reset()` during render; use `key={id}` prop instead.

### Tailwind CSS v4

- No `tailwind.config.js` — all config lives in CSS (`@theme`, `@custom-variant`, CSS variables in `src/app/globals.css`).
- Prefer utility classes over `@apply`.

### Naming Conventions

- **Files:** kebab-case for utilities (`auth-client.ts`), PascalCase for components (`OrganizationProvider.tsx`)
- **Variables/functions:** camelCase
- **Types/interfaces:** PascalCase
- **Convex tables:** camelCase singular or plural as defined in schema (`organization`, `member`, `services`, `customers`)
- **Terminology:** Code/database uses `organization`, UI displays `salon`, architecture docs say `tenant`

## Project Structure

```
convex/                  # Backend (Convex functions + schema)
  schema.ts              # Database schema (source of truth)
  lib/functions.ts       # Auth wrappers + ErrorCode enum
  lib/validators.ts      # Shared return type validators (derived from schema)
  lib/triggers.ts        # Auto-fire notifications/emails on appointment changes
  lib/rateLimits.ts      # Rate limiting config

src/
  app/                   # Next.js App Router pages
    [slug]/(authenticated)/  # Protected org routes
    [slug]/(public)/         # Public routes (booking, confirmation)
    (auth)/                  # Sign-in pages
  components/ui/         # shadcn/ui primitives
  modules/               # Feature modules (domain-driven)
  lib/                   # Utilities (cn(), auth helpers)
  emails/                # React Email templates
```

## Convex Function Wrappers

Always use custom wrappers from `convex/lib/functions.ts`, never raw `query()`/`mutation()`:

| Wrapper | Auth Level | Context |
|---------|-----------|---------|
| `publicQuery` | None | — |
| `authedQuery/Mutation` | Required | `ctx.user` |
| `orgQuery/Mutation` | Required + membership | `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` |
| `adminQuery/Mutation` | Required + owner role | Same as org + role check |
| `ownerQuery/Mutation` | Required + owner only | Same as org + owner check |
| `superAdminQuery/Mutation` | Required + env email | `ctx.user`, `ctx.isSuperAdmin` |

### Organization-scoped Wrappers

`orgQuery`/`orgMutation` (and `adminQuery`/`adminMutation`, `ownerQuery`/`ownerMutation`) require `organizationId` to be passed from the **frontend**, then automatically move it from `args` to `ctx.organizationId`.

**Your handler should NOT define `organizationId` in `args`** — it's already handled by the wrapper and available via `ctx.organizationId`.

```typescript
// ❌ WRONG - don't add organizationId to handler args
export const getSettings = orgQuery({
  args: { organizationId: v.id("organization") }, // ❌ Already handled by wrapper
  handler: async (ctx) => { ... },
});

// ✅ CORRECT - organizationId comes from context
export const getSettings = orgQuery({
  args: {}, // ✅ Empty (or your own params)
  handler: async (ctx) => {
    const orgId = ctx.organizationId; // ✅ Available in context
    // ...
  },
});

// Frontend must pass organizationId
useQuery(api.organizations.getSettings, { 
  organizationId: activeOrganization._id // ✅ Required
});
```

All queries and mutations must have a `returns:` validator. Shared validators live in `convex/lib/validators.ts` and are derived from the schema via `typedV(schema)`.

## Error Handling

Throw `ConvexError` with an `ErrorCode`:

```typescript
import { ConvexError } from "convex/values";
import { ErrorCode } from "./lib/functions";

throw new ConvexError({ code: ErrorCode.NOT_FOUND, message: "Staff not found" });
```

Available codes: `UNAUTHENTICATED`, `FORBIDDEN`, `ADMIN_REQUIRED`, `OWNER_REQUIRED`, `NOT_FOUND`, `ALREADY_EXISTS`, `VALIDATION_ERROR`, `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL_ERROR`

## Domain Rules

- **Pricing:** Stored as kurus integers (15000 = 150.00 TL). Convert at UI layer with `formatPrice()`.
- **Phone numbers:** Turkish format (+90 5XX XXX XX XX). Validated via `convex/lib/phone.ts`.
- **Confirmation codes:** 6-char alphanumeric (excludes 0/O/I/1).
- **Soft delete:** Services use `status: "inactive"`. Customers use hard delete.
- **Roles:** Only `"owner"` and `"staff"` — no admin/member roles.
- **Multi-tenancy:** Every table has `organizationId`. Custom wrappers enforce tenant isolation.
- **Slot locks:** Temporary (2-min TTL, cleaned by cron) to prevent double-booking.
- **Date ranges:** Use index range queries (`.gte()/.lte()`), never per-day loops.

## Convex Gotchas

- Actions (`"use node"`) cannot access `ctx.db` — use `ctx.runQuery(internal.xxx)` / `ctx.runMutation(internal.xxx)`.
- Triggers in `convex/lib/triggers.ts` auto-fire on appointment changes. All mutations use `triggerMutation` base.
- Schema changes require the Convex dev server to regenerate types.
- `convex/_generated/` files are auto-generated — never edit them.
- Avoid N+1 queries: pre-fetch into Maps, use index range queries.

## Adding a Feature

1. Update `convex/schema.ts`
2. Wait for type regeneration (`bunx convex dev` must be running)
3. Add validators to `convex/lib/validators.ts` (use `vv.doc("tableName")` for doc validators)
4. Create Convex functions using appropriate wrappers
5. Create frontend module in `src/modules/<feature>/`
6. Run `bun run lint` before committing
