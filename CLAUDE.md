# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant salon management platform with real-time booking, staff scheduling, and client management.

## Commands

| Command                              | Description                               |
| ------------------------------------ | ----------------------------------------- |
| `bun install`                        | Install dependencies                      |
| `bun run dev`                        | Start Next.js dev server (localhost:3000) |
| `bunx convex dev`                    | Start Convex backend + type generation    |
| `bun run lint`                       | Run Biome check (linter + formatter)      |
| `bun run format`                     | Format code with Biome                    |
| `bun run build`                      | Production build                          |
| `bun start`                          | Start production server                   |
| `bunx shadcn@latest add <component>` | Add shadcn/ui component                   |

> **Note:** Always run `bunx convex dev` in a separate terminal when working with Convex. Schema changes require Convex dev server to be running to regenerate types.

## Tech Stack

- **Frontend:** Next.js 16, React 19, React Compiler, Tailwind CSS v4, shadcn/ui (New York)
- **Backend:** Convex (database, functions, real-time), convex-helpers (RLS, triggers)
- **Auth:** Better Auth (@convex-dev/better-auth) with Convex adapter
- **Payments:** Polar (planned - @convex-dev/polar for subscriptions)
- **Forms:** TanStack Form + Zod validation
- **Tools:** Bun (package manager), Biome (linter/formatter)

## Documentation

**Comprehensive PRD available in `docs/prd/`:**
- [Product Overview](docs/prd/01-product-overview.md) - Vision, goals, personas
- [System Architecture](docs/prd/04-technical/architecture.md) - Tech stack, multi-tenancy, security
- [Convex Schema](docs/prd/04-technical/convex-schema.md) - Complete database schema
- [API Contracts](docs/prd/04-technical/api-contracts.md) - Function signatures, validators, rate limits
- [File Hierarchy](docs/prd/04-technical/file-hierarchy.md) - Detailed project structure
- [Implementation Roadmap](docs/prd/06-implementation-roadmap.md) - Sprint planning and status
- [Glossary](docs/prd/appendix/glossary.md) - Domain terminology (organization/salon/tenant)

## Architecture

```
convex/              # Backend functions and schema
├── _generated/      # Auto-generated types (don't edit)
├── betterAuth/      # Better Auth component (schema, auth config)
├── lib/
│   ├── functions.ts # Custom query/mutation wrappers with auth & RLS
│   ├── validators.ts # Return type validators (231 lines)
│   ├── rateLimits.ts # Rate limiting config (104 lines)
│   ├── relationships.ts # Database relationship helpers
│   └── rls.ts       # Row-level security helpers
├── auth.ts          # Auth instance and options
├── http.ts          # HTTP router with auth routes
├── files.ts         # File storage mutations (192 lines)
└── *.ts             # Domain functions (organizations, staff, members, invitations)

src/
├── app/             # Next.js App Router pages
│   ├── (auth)/      # Auth pages (sign-in) - no layout nesting
│   ├── [slug]/      # Multi-tenant routes (org slug in URL)
│   ├── onboarding/  # New user org creation
│   └── dashboard/   # Redirect to active org
├── components/ui/   # shadcn/ui components (56+)
├── hooks/           # Custom React hooks
├── lib/             # Utilities (cn(), auth helpers)
└── modules/         # Feature modules (domain-driven)
    ├── convex/      # ConvexClientProvider
    ├── auth/        # Auth components, layouts, views
    ├── organization/ # OrganizationProvider, OrganizationSwitcher
    ├── settings/    # Settings forms & sub-pages
    └── staff/       # Staff management components

docs/prd/            # Product Requirements Documentation
└── 04-technical/    # Technical docs (architecture, schema, APIs)
```

### Route Groups & Multi-Tenancy

- `(auth)/` — Route group (no URL segment). Auth pages with minimal layout.
- `[slug]/` — Dynamic segment for organization slug. All org-scoped pages use this prefix.
- `onboarding/` — First-time user flow to create an organization.
- `dashboard/` — Redirects to user's active organization dashboard.

**User Flow:** Sign in → No orgs? → `/onboarding` → Create org → `/{slug}/dashboard`

**Multi-Tenancy:** Every table includes `organizationId` for tenant isolation. Custom function wrappers (`orgQuery`, `orgMutation`) automatically enforce this via RLS.

### Organization Context

Use hooks from `@/modules/organization`:

- `useOrganization()` — Full context (activeOrganization, organizations, currentStaff, currentRole)
- `useActiveOrganization()` — Current organization only
- `useCurrentStaff()` — User's staff profile in active org
- `useOrganizations()` — All orgs user belongs to

## Convex Custom Function Wrappers

**Critical:** Always use custom wrappers from `convex/lib/functions.ts` instead of base `query()`/`mutation()`:

| Wrapper | Auth | Context Added | Use Case |
| --- | --- | --- | --- |
| `publicQuery` | None | — | Public data (org info by slug) |
| `maybeAuthedQuery` | Optional | `ctx.user \| null` | Works for authed/unauthed users |
| `authedQuery/Mutation` | Required | `ctx.user` | User-scoped data (profile, orgs list) |
| `orgQuery/Mutation` | Required + membership | `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` | All org-scoped operations |
| `adminQuery/Mutation` | Required + admin/owner | Same as org + role check | Staff management, settings |
| `ownerQuery/Mutation` | Required + owner only | Same as org + owner check | Billing, org deletion |

**Key behavior:**
- `orgQuery`/`orgMutation` **auto-inject** `organizationId` from args
- Functions using these wrappers **don't need** `organizationId` in their own args
- Membership and role checks are automatic
- All throw structured `ConvexError` with `ErrorCode` on failure

**Example:**
```typescript
// ✅ Correct - orgQuery handles organizationId automatically
export const list = orgQuery({
  args: { status: v.optional(staffStatusValidator) },
  returns: v.array(staffDocValidator),
  handler: async (ctx, args) => {
    // ctx.organizationId is available, membership already verified
    return ctx.db.query("staff")
      .withIndex("organizationId", q => q.eq("organizationId", ctx.organizationId))
      .collect();
  },
});

// ❌ Wrong - using base query() bypasses auth/RLS
export const list = query({
  args: { organizationId: v.id("organization") },
  handler: async (ctx, args) => {
    // No auth check, no membership verification!
  },
});
```

## Return Validators

**All queries/mutations must have `returns:` validators.**

- Shared validators live in `convex/lib/validators.ts`
- Document validators include `_id` and `_creationTime` system fields
- Use `v.optional(validator)` in args, bare validator in return types
- Composite validators for enriched query results (e.g., `organizationWithRoleValidator`)

**Example:**
```typescript
import { staffDocValidator, staffStatusValidator } from "./lib/validators";

export const get = orgQuery({
  args: { staffId: v.id("staff") },
  returns: v.union(staffDocValidator, v.null()), // Always specify returns
  handler: async (ctx, args) => {
    return await ctx.db.get(args.staffId);
  },
});
```

## Rate Limiting

Rate limits configured in `convex/lib/rateLimits.ts` using `@convex-dev/rate-limiter`:

```typescript
import { rateLimiter } from "./lib/rateLimits";

export const create = adminMutation({
  args: { email: v.string(), /* ... */ },
  handler: async (ctx, args) => {
    // Check rate limit before creating
    await rateLimiter.limit(ctx, "createInvitation", {
      key: ctx.organizationId,
    });

    // Proceed with creation...
  },
});
```

**Available rate limits:** `createInvitation`, `resendInvitation`, `createOrganization`, `addMember`, `createBooking`, `cancelBooking`

## Key Files

| File | Purpose |
| --- | --- |
| `convex/schema.ts` | Database schema (creates types after `bunx convex dev`) |
| `convex/lib/functions.ts` | Custom function wrappers (CRITICAL - use these, not base functions) |
| `convex/lib/validators.ts` | Shared return type validators |
| `convex/lib/rateLimits.ts` | Rate limiting configuration |
| `convex/files.ts` | File storage/upload (logos, staff images) |
| `convex/betterAuth/auth.ts` | Better Auth instance and options |
| `convex/http.ts` | HTTP router with auth routes |
| `src/lib/auth-client.ts` | Client-side auth hooks (authClient) |
| `src/lib/auth-server.ts` | Server-side auth helpers (isAuthenticated, getToken) |
| `src/app/layout.tsx` | Root layout with ConvexClientProvider |
| `src/lib/utils.ts` | `cn()` utility for className merging |
| `components.json` | shadcn/ui configuration (New York style) |
| `src/middleware.ts` | Auth middleware for protected routes |
| `src/modules/organization/` | OrganizationProvider, hooks, OrganizationSwitcher |

## Code Style

- **Bun** over npm/yarn for all commands
- **Biome** for linting/formatting (no ESLint/Prettier)
- **Path alias:** `@/*` → `./src/*`
- **Imports:** Auto-organized on save by Biome
- **Indentation:** 2 spaces
- **Terminology:** Code/database use `organization`, UI uses `salon`, architecture uses `tenant` (see [Glossary](docs/prd/appendix/glossary.md#organization))

## Environment Variables

```bash
CONVEX_DEPLOYMENT=dev:...        # Auto-set by Convex CLI
NEXT_PUBLIC_CONVEX_URL=https://... # Required
NEXT_PUBLIC_CONVEX_SITE_URL=...  # Required for Better Auth
SITE_URL=http://localhost:3000   # Better Auth base URL
BETTER_AUTH_SECRET=...           # Better Auth secret key
```

## Critical Gotchas

### Convex Function Wrappers

**⚠️ ALWAYS use custom wrappers from `convex/lib/functions.ts`**

- ❌ Don't use base `query()` or `mutation()` - they bypass auth/RLS
- ✅ Use `publicQuery`, `authedQuery`, `orgQuery`, `adminMutation`, etc.
- Functions with `orgQuery`/`orgMutation` don't need `organizationId` in args (auto-injected)

### Return Validators

**⚠️ ALL queries/mutations MUST have `returns:` validators**

- Shared validators in `convex/lib/validators.ts`
- Document validators include `_id` and `_creationTime`
- Missing validators will cause type errors

### Better Auth

- Schema auto-generated: `npx @better-auth/cli generate --output ./convex/betterAuth/schema.ts -y`
- Auth routes registered in `convex/http.ts` via `authComponent.registerRoutes()`
- Client: `authClient` from `@/lib/auth-client` — Server: helpers from `@/lib/auth-server`
- Convex component installed at `convex/betterAuth/` — don't edit `schema.ts` directly

### React Compiler

- Don't use `useMemo`, `useCallback`, `React.memo` — Compiler handles optimization
- Manual optimization may conflict with Compiler

### Convex Development

- Run `bunx convex dev` after schema changes (types won't update otherwise)
- Use `ctx.db` in queries/mutations only, not in actions
- Import from `"./_generated/server"` for `query()`, `mutation()`, `action()`
- Actions are for external API calls only (email, payments, etc.)

### Tailwind v4

- No `tailwind.config.js` — all config in CSS (`@theme`, `@utility`)
- Prefer utility classes over `@apply`

### Biome Linting

- No ESLint/Prettier — use `bun run lint` and `bun run format`
- Imports auto-sorted on save
- `_generated/` files have pre-existing errors (auto-generated, ignore them)
- Filter by filename when checking `bun run lint` output

## Development Workflow

### Starting Development

```bash
# Terminal 1: Next.js dev server
bun run dev

# Terminal 2: Convex backend (REQUIRED for type generation)
bunx convex dev
```

### Adding a New Feature

1. Update schema: `convex/schema.ts`
2. Wait for type regeneration (Convex dev server must be running)
3. Create Convex functions: `convex/[feature].ts`
   - Use custom wrappers (`orgQuery`, `adminMutation`)
   - Add return validators
   - Apply rate limiting if needed
4. Create frontend module: `src/modules/[feature]/`
5. Add components: `src/modules/[feature]/components/`
6. Export public API: `src/modules/[feature]/index.ts`

### Common Mistakes to Avoid

1. **Using base `query()`/`mutation()`** instead of custom wrappers
2. **Forgetting `returns:` validators** on Convex functions
3. **Adding `organizationId` to args** when using `orgQuery`/`orgMutation` (auto-injected)
4. **Not running `bunx convex dev`** after schema changes
5. **Using `useMemo`/`useCallback`** with React Compiler enabled
6. **Editing `convex/_generated/`** or `convex/betterAuth/schema.ts`
