# Salon Management SaaS

Multi-tenant salon management platform with real-time booking, staff scheduling, and client management.

## Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run dev` | Start Next.js dev server (localhost:3000) |
| `bunx convex dev` | Start Convex backend + type generation |
| `bun run lint` | Run Biome check (linter + formatter) |
| `bun run format` | Format code with Biome |
| `bun run build` | Production build |
| `bun start` | Start production server |

> **Note:** Always run `bunx convex dev` in a separate terminal when working with Convex.

## Tech Stack

- **Frontend:** Next.js 16, React 19, React Compiler, Tailwind CSS v4, shadcn/ui (New York)
- **Backend:** Convex (database, functions, real-time), convex-helpers (RLS, triggers)
- **Auth:** Better Auth (@convex-dev/better-auth) with Convex adapter
- **Payments:** Polar (@convex-dev/polar for subscriptions, @polar-sh/sdk for one-time payments)
- **Forms:** TanStack Form + Zod validation
- **Tools:** Bun (package manager), Biome (linter/formatter)

## Architecture

```
convex/              # Backend functions and schema
├── _generated/      # Auto-generated types (don't edit)
├── betterAuth/      # Better Auth component (schema, auth config)
├── auth.ts          # Auth instance and options
├── http.ts          # HTTP router with auth routes
└── *.ts             # Queries, mutations, actions
src/
├── app/             # Next.js App Router pages
├── components/ui/   # shadcn/ui components (56)
├── hooks/           # Custom React hooks
├── lib/             # Utilities (cn())
└── modules/
    ├── convex/      # ConvexClientProvider
    ├── auth/        # Auth components, layouts, views
    ├── organization/ # OrganizationProvider, OrganizationSwitcher
    └── staff/       # Staff management components
docs/
└── prd/             # Product requirements documentation
```

## Key Files

| File | Purpose |
|------|---------|
| `convex/schema.ts` | Database schema (creates types after `bunx convex dev`) |
| `convex/betterAuth/auth.ts` | Better Auth instance and options |
| `convex/http.ts` | HTTP router with auth routes |
| `src/lib/auth-client.ts` | Client-side auth hooks (authClient) |
| `src/lib/auth-server.ts` | Server-side auth helpers (isAuthenticated, getToken) |
| `src/app/layout.tsx` | Root layout with ConvexClientProvider |
| `src/lib/utils.ts` | `cn()` utility for className merging |
| `components.json` | shadcn/ui configuration |
| `src/middleware.ts` | Auth middleware for protected routes |
| `convex/lib/functions.ts` | Custom Convex function wrappers |
| `convex/organizations.ts` | Organization CRUD operations |
| `convex/members.ts` | Member management |
| `convex/invitations.ts` | Staff invitation system |

## Code Style

- **Bun** over npm/yarn for all commands
- **Biome** for linting/formatting (no ESLint/Prettier)
- **Path alias:** `@/*` → `./src/*`
- **Imports:** Auto-organized on save by Biome
- **Indentation:** 2 spaces

## Environment

```bash
CONVEX_DEPLOYMENT=dev:...        # Auto-set by Convex CLI
NEXT_PUBLIC_CONVEX_URL=https://... # Required
NEXT_PUBLIC_CONVEX_SITE_URL=...  # Required for Better Auth
SITE_URL=http://localhost:3000   # Better Auth base URL
BETTER_AUTH_SECRET=...           # Better Auth secret key
```

## Gotchas

**Better Auth:**
- Schema auto-generated: `npx @better-auth/cli generate --output ./convex/betterAuth/schema.ts -y`
- Auth routes registered in `convex/http.ts` via `authComponent.registerRoutes()`
- Client: `authClient` from `@/lib/auth-client` — Server: helpers from `@/lib/auth-server`
- Convex component installed at `convex/betterAuth/` — don't edit `schema.ts` directly

**React Compiler:**
- Don't use `useMemo`, `useCallback`, `React.memo` — Compiler handles optimization
- Manual optimization may conflict with Compiler

**Convex:**
- Run `bunx convex dev` after schema changes (types won't update otherwise)
- Use `ctx.db` in queries/mutations only, not in actions
- Import from `"./_generated/server"` for `query()`, `mutation()`, `action()`
- Use custom function wrappers from `convex/lib/functions.ts`:
  - `publicQuery` — No auth required
  - `authedQuery/authedMutation` — Requires authentication
  - `orgQuery/orgMutation` — Requires org membership (auto-injects `ctx.organizationId`)
  - `adminMutation` — Requires owner/admin role

**Tailwind v4:**
- No `tailwind.config.js` — all config in CSS (`@theme`, `@utility`)
- Prefer utility classes over `@apply`

**Biome:**
- No ESLint/Prettier — use `bun run lint` and `bun run format`
- Imports auto-sorted on save
