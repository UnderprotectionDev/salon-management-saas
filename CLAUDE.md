# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant salon management platform with real-time booking, staff scheduling, client management, billing, email notifications, and analytics reporting.

## Commands

| Command                              | Description                               |
| ------------------------------------ | ----------------------------------------- |
| `bun install`                        | Install dependencies                      |
| `bun run dev`                        | Start Next.js dev server (localhost:3000) |
| `bunx convex dev`                    | Start Convex backend + type generation    |
| `bun run lint`                       | Run Biome check (linter + formatter)      |
| `bun run format`                     | Format code with Biome                    |
| `bun run build`                      | Production build                          |
| `bun run email:dev`                  | React Email preview server (port 3001)    |
| `bunx shadcn@latest add <component>` | Add shadcn/ui component                   |

> **Note:** Always run `bunx convex dev` in a separate terminal when working with Convex. Schema changes require Convex dev server to be running to regenerate types.

## Tech Stack

- **Frontend:** Next.js 16, React 19, React Compiler, Tailwind CSS v4, shadcn/ui (New York)
- **Backend:** Convex (database, functions, real-time), convex-helpers (triggers, custom functions)
- **Auth:** Better Auth (@convex-dev/better-auth) with Convex adapter
- **Payments:** Polar (@convex-dev/polar for subscriptions)
- **Email:** Resend + React Email (transactional emails with JSX templates)
- **Charts:** recharts (via shadcn ChartContainer)
- **Forms:** TanStack Form + Zod validation
- **Tools:** Bun (package manager), Biome (linter/formatter)

## Documentation

**Comprehensive PRD available in `docs/prd/`:**

- [Product Overview](docs/prd/product-overview.md) - Vision, goals, personas, user stories
- [Database Schema](docs/prd/database-schema.md) - Complete Convex schema with examples
- [API Reference](docs/prd/api-reference.md) - Function signatures, validators, rate limits
- [System Architecture](docs/prd/system-architecture.md) - Tech stack, multi-tenancy, security, file structure
- [Features](docs/prd/features.md) - All feature specifications (booking, staff, admin, customer, products)
- [Design System](docs/prd/design-system.md) - UI components, user flows, accessibility
- [Glossary](docs/prd/glossary.md) - Domain terminology (organization/salon/tenant)
- [Milestones](docs/milestones/README.md) - Implementation roadmap and progress tracking

## Architecture

```
convex/              # Backend functions and schema
├── _generated/      # Auto-generated types (don't edit)
├── betterAuth/      # Better Auth component (schema, auth config)
├── lib/
│   ├── functions.ts # Custom query/mutation wrappers with auth + ErrorCode enum
│   ├── triggers.ts  # Convex triggers (auto notifications/emails on appointment changes)
│   ├── validators.ts # Shared return type validators (~910 lines)
│   ├── rateLimits.ts # Rate limiting config
│   ├── scheduleResolver.ts # Schedule resolution logic (163 lines)
│   ├── confirmation.ts # Confirmation code generator (40 lines)
│   ├── dateTime.ts  # Date/time utilities (94 lines)
│   ├── ics.ts       # RFC 5545 ICS calendar file generator
│   ├── phone.ts     # Turkish phone validation helper
│   └── relationships.ts # Database relationship helpers
├── appointments.ts  # Appointment CRUD + booking + reschedule (~1400 lines)
├── appointmentServices.ts # Appointment-service junction (54 lines)
├── auth.ts          # Auth instance and options
├── crons.ts         # 7 scheduled jobs (slot locks, notifications, reminders, billing, polar sync)
├── email.tsx        # Email actions - "use node" with JSX rendering (~540 lines)
├── email_helpers.ts # Internal query/mutation helpers for email actions
├── http.ts          # HTTP router (auth routes + Polar webhooks)
├── files.ts         # File storage mutations (253 lines)
├── init.ts          # Initialization script (Polar product sync)
├── slots.ts         # Slot availability algorithm (206 lines)
├── slotLocks.ts     # Slot lock acquire/release/cleanup (145 lines)
├── users.ts         # User queries (getCurrentUser)
├── reports.ts       # Revenue, staff performance, customer analytics (~580 lines)
├── admin.ts         # SuperAdmin functions (platform stats, org/user management)
├── analytics.ts     # Dashboard stats (week-over-week, monthly revenue)
├── notifications.ts # In-app notifications CRUD + triggers (~230 lines)
├── subscriptions.ts # Subscription status, webhook handlers, grace periods
├── polarActions.ts  # Polar checkout/portal URL generation (actions)
├── polarSync.ts     # Product sync from Polar
├── serviceCategories.ts # Service category CRUD (188 lines)
├── services.ts      # Service CRUD + staff assignment (353 lines)
├── customers.ts     # Customer CRUD + search + merge (~600 lines)
├── scheduleOverrides.ts # Schedule override CRUD (178 lines)
├── timeOffRequests.ts # Time-off workflow (335 lines)
├── staffOvertime.ts # Overtime management (155 lines)
└── *.ts             # Domain functions (organizations, staff, members, invitations)

src/
├── app/             # Next.js App Router pages
│   ├── (auth)/      # Auth pages (sign-in) - no layout nesting
│   ├── [slug]/      # Multi-tenant routes (org slug in URL)
│   │   ├── (authenticated)/ # Protected routes (see sidebar nav below)
│   │   └── (public)/        # Public routes (book, appointment/[code])
│   ├── onboarding/  # New user org creation
│   └── dashboard/   # Redirect to active org
├── components/ui/   # shadcn/ui components (56+)
├── emails/          # React Email templates (4 templates + 4 shared components)
├── hooks/           # Custom React hooks
├── lib/             # Utilities (cn(), auth helpers)
└── modules/         # Feature modules (domain-driven)
    ├── convex/      # ConvexClientProvider
    ├── auth/        # Auth components, layouts, views
    ├── billing/     # Subscription plans, grace period banner, suspended overlay
    ├── booking/     # Booking engine (16 components, 1 hook)
    ├── calendar/    # Day/week calendar views, DnD rescheduling (12 files)
    ├── customers/   # Customer database, search, merge
    ├── dashboard/   # Dashboard stats cards, revenue chart
    ├── notifications/ # NotificationBell, notification panel
    ├── organization/ # OrganizationProvider, OrganizationSwitcher
    ├── reports/     # Revenue, staff, customer reports (16 files)
    ├── services/    # Service catalog, categories, pricing
    ├── settings/    # Settings forms & sub-pages
    └── staff/       # Staff management components
```

### Route Groups & Multi-Tenancy

- `(auth)/` — Route group (no URL segment). Auth pages with minimal layout.
- `[slug]/(authenticated)/` — Protected org routes. Requires auth + org membership.
- `[slug]/(public)/` — Public org routes (book, appointment/[code]). No auth required.
- `onboarding/` — First-time user flow to create an organization.
- `dashboard/` — Redirects to user's active organization dashboard.
- `/` — Salon directory (public listing of organizations).

**Sidebar Navigation:** Dashboard, Calendar, Staff, Appointments, Services, Customers, Reports, Settings, Billing

**Admin Panel (`/admin`):** Platform-level management for SuperAdmins (env-based). Dashboard, Organizations, Users, Action Log

**User Flow:** Sign in → No orgs? → `/onboarding` → Create org → `/{slug}/dashboard`
**Public Booking:** `/{slug}/book` → Select services → Pick time → Enter info → Confirmation code

**Multi-Tenancy:** Every table includes `organizationId` for tenant isolation. Custom function wrappers (`orgQuery`, `orgMutation`) automatically enforce membership checks. One salon per user.

### Organization Context

Use hooks from `@/modules/organization`:

- `useOrganization()` — Full context (activeOrganization, organizations, currentStaff, currentRole)
- `useActiveOrganization()` — Current organization only
- `useCurrentStaff()` — User's staff profile in active org
- `useOrganizations()` — All orgs user belongs to

## Convex Custom Function Wrappers

**Critical:** Always use custom wrappers from `convex/lib/functions.ts` instead of base `query()`/`mutation()`:

| Wrapper                | Auth                   | Context Added                                               | Use Case                              |
| ---------------------- | ---------------------- | ----------------------------------------------------------- | ------------------------------------- |
| `publicQuery`          | None                   | —                                                           | Public data (org info by slug)        |
| `publicMutation`       | None                   | —                                                           | Public operations (booking, slot locks) |
| `authedQuery/Mutation` | Required               | `ctx.user`                                                  | User-scoped data (profile, orgs list) |
| `orgQuery/Mutation`    | Required + membership  | `ctx.user`, `ctx.organizationId`, `ctx.member`, `ctx.staff` | All org-scoped operations             |
| `ownerQuery/Mutation`  | Required + owner       | Same as org + owner role check + `ctx.role`                 | Staff mgmt, settings, billing, reports |
| `superAdminQuery/Mutation` | Required + env email | `ctx.user`, `ctx.isSuperAdmin`                            | Platform admin panel                  |

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
    return ctx.db
      .query("staff")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", ctx.organizationId),
      )
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

export const create = ownerMutation({
  args: { email: v.string() /* ... */ },
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "createInvitation", {
      key: ctx.organizationId,
    });
    // Proceed with creation...
  },
});
```

**Available rate limits:** `createInvitation`, `resendInvitation`, `createOrganization`, `addMember`, `createService`, `createCustomer`, `createScheduleOverride`, `createTimeOffRequest`, `createOvertime`, `createBooking`, `cancelBooking`, `rescheduleBooking`, `cancelSubscription`

## Convex Components

Registered in `convex/convex.config.ts`:

- `@convex-dev/better-auth` (betterAuth) — Authentication
- `@convex-dev/polar` (polar) — Subscription billing
- `@convex-dev/rate-limiter` (rateLimiter) — Rate limiting

## Scheduled Jobs (Crons)

Defined in `convex/crons.ts`:

| Schedule | Job | Description |
|----------|-----|-------------|
| Every 1 min | `slotLocks.cleanupExpired` | Remove expired slot locks |
| Every 1 hour | `notifications.cleanupOld` | Delete old notifications |
| Every 5 min | `notifications.sendReminders` | Send 30-min appointment reminders |
| Every 1 hour | `subscriptions.checkGracePeriods` | Suspend expired grace periods |
| Every 1 hour | `subscriptions.checkTrialExpirations` | Handle expired trials |
| Every 1 hour | `polarSync.syncProducts` | Sync products from Polar |
| Daily 09:00 UTC | `email_helpers.send24HourRemindersDaily` | Send 24-hour email reminders |

## Email System

**Architecture:** Convex actions (`.tsx` with `"use node"`) render React Email templates and send via Resend.

- `convex/email.tsx` — 4 internalAction functions (confirmation, reminder, cancellation, invitation)
- `convex/email_helpers.ts` — internalQuery/internalMutation helpers (actions can't access `ctx.db`)
- `src/emails/` — React Email templates (BookingConfirmation, Reminder24Hour, Cancellation, StaffInvitation)
- **Trigger pattern:** Convex triggers in `convex/lib/triggers.ts` auto-fire notifications and emails on appointment changes
- **Retry:** 3 attempts with exponential backoff (1s, 2s, 4s)
- **Idempotency:** Check `confirmationSentAt`/`reminderSentAt` before sending
- Convex actions (.tsx) can import from `../src/` — esbuild handles JSX

## Key Files

**Backend (start here when adding/modifying features):**

| File                        | Purpose                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `convex/schema.ts`          | Database schema (types regenerate via `bunx convex dev`)            |
| `convex/lib/functions.ts`   | Custom function wrappers + `ErrorCode` enum (CRITICAL)              |
| `convex/lib/validators.ts`  | Shared return type validators (~910 lines)                          |
| `convex/lib/rateLimits.ts`  | Rate limiting configuration                                         |
| `convex/lib/triggers.ts`    | Appointment triggers (auto notifications + emails on changes)        |

**Frontend (key infrastructure):**

| File                              | Purpose                                              |
| --------------------------------- | ---------------------------------------------------- |
| `src/lib/auth-client.ts`          | Client-side auth hooks (`authClient`)                |
| `src/lib/auth-server.ts`          | Server-side auth helpers (`isAuthenticated`)         |
| `src/modules/organization/`       | OrganizationProvider, hooks, OrganizationSwitcher    |
| `src/proxy.ts`                    | Auth proxy for protected routes                      |

## Domain Conventions

- **Pricing:** Stored as kuruş integers (15000 = ₺150.00). Convert at UI with `formatPrice()`.
- **Phone numbers:** Turkish format (+90 5XX XXX XX XX). Validated via `convex/lib/phone.ts`.
- **Confirmation codes:** 6-char alphanumeric (excludes 0/O/I/1). Generated by `convex/lib/confirmation.ts`.
- **Soft vs hard delete:** Services use soft-delete (`status: "inactive"`). Customers use hard-delete.
- **Schedule resolution:** `convex/lib/scheduleResolver.ts` merges default schedule + overrides + overtime for a given day.
- **Slot locks:** Temporary locks (cleaned up by cron every 1 min) prevent double-booking during the booking flow.
- **Date ranges:** Use index range queries (`.gte()/.lte()`) instead of per-day loops to avoid N+1.

## Error Handling

Functions throw `ConvexError` with an `ErrorCode` enum from `convex/lib/functions.ts`:

`UNAUTHENTICATED`, `FORBIDDEN`, `OWNER_REQUIRED`, `NOT_FOUND`, `ALREADY_EXISTS`, `VALIDATION_ERROR`, `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL_ERROR`

## Code Style

- **Bun** over npm/yarn for all commands
- **Biome** for linting/formatting (no ESLint/Prettier)
- **Path alias:** `@/*` → `./src/*`
- **Imports:** Auto-organized on save by Biome
- **Indentation:** 2 spaces
- **Terminology:** Code/database use `organization`, UI uses `salon`, architecture uses `tenant` (see [Glossary](docs/prd/glossary.md))

## Environment Variables

```bash
# Convex
CONVEX_DEPLOYMENT=dev:...        # Auto-set by Convex CLI
NEXT_PUBLIC_CONVEX_URL=https://... # Required
NEXT_PUBLIC_CONVEX_SITE_URL=...  # Required for Better Auth

# Auth
SITE_URL=http://localhost:3000   # Better Auth base URL
BETTER_AUTH_SECRET=...           # Better Auth secret key

# Email (Resend)
RESEND_API_KEY=...               # Resend API key
RESEND_FROM_EMAIL=...            # From address (domain verification required)

# Billing (Polar)
POLAR_ORGANIZATION_TOKEN=...     # Polar API token
POLAR_WEBHOOK_SECRET=...         # Webhook verification secret
POLAR_SERVER=sandbox             # "sandbox" or "production"
POLAR_PRODUCT_MONTHLY_ID=...     # Monthly plan product ID
POLAR_PRODUCT_YEARLY_ID=...      # Yearly plan product ID

# SuperAdmin
SUPER_ADMIN_EMAILS=dev@example.com  # Comma-separated list of superadmin emails
```

## Critical Gotchas

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
- Actions can't access `ctx.db` — use `ctx.runQuery(internal.xxx)` / `ctx.runMutation(internal.xxx)` instead
- Avoid N+1 queries: use index range queries (`.gte()/.lte()`) and pre-fetch lookups into Maps
- **Roles:** Only `"owner"` and `"staff"` — no admin/member roles. `ownerQuery`/`ownerMutation` enforce owner role.
- **Triggers:** `convex/lib/triggers.ts` uses `convex-helpers/server/triggers` to auto-fire side effects (notifications, emails) on appointment inserts/updates. All mutations use `triggerMutation` base (handled by function wrappers).

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
   - Use custom wrappers (`orgQuery`, `ownerMutation`)
   - Add return validators to `convex/lib/validators.ts`
   - Apply rate limiting if needed
4. Create frontend module: `src/modules/[feature]/`
5. Add components: `src/modules/[feature]/components/`
6. Export public API: `src/modules/[feature]/index.ts`

### TanStack Form

- `form.state.values` is NOT reactive for rendering — use `form.Subscribe` for reactive UI (e.g., disabled buttons)
- Don't call `form.reset()` during render — use `key={id}` prop to force remount with new defaults
- When passing partial data to an edit dialog, fetch the full doc via `useQuery(api.xxx.get)` inside the dialog
