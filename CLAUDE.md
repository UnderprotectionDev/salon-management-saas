# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-tenant salon management platform with real-time booking, staff scheduling, client management, product inventory, billing, email notifications, analytics reporting, and AI-powered features (photo analysis, virtual try-on, care schedules, design catalog).

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
- **Payments:** Polar (@convex-dev/polar for subscriptions + one-time AI credit purchases)
- **Email:** Resend + React Email (transactional emails with JSX templates)
- **AI:** `@convex-dev/agent` (LLM threads), Vercel AI SDK gateway (GPT-4o), `@ai-sdk/fal` (fal.ai image generation for virtual try-on)
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
│   ├── functions.ts     # Custom query/mutation wrappers with auth + ErrorCode enum
│   ├── triggers.ts      # Convex triggers (auto notifications/emails on appointment changes)
│   ├── validators.ts    # Shared return type validators (~910 lines)
│   ├── aiValidators.ts  # AI-specific validators (analyses, simulations, care schedules)
│   ├── aiConstants.ts   # Credit costs, salon types, CREDIT_PACKAGES, quick questions
│   ├── agents.ts        # @convex-dev/agent instances (photoAnalysisAgent, quickQuestionAgent, careScheduleAgent)
│   ├── rateLimits.ts    # Rate limiting config
│   ├── scheduleResolver.ts # Schedule resolution logic
│   ├── confirmation.ts  # Confirmation code generator
│   ├── dateTime.ts      # Date/time utilities
│   ├── ics.ts           # RFC 5545 ICS calendar file generator
│   ├── phone.ts         # Turkish phone validation helper
│   └── relationships.ts # Database relationship helpers
├── appointments.ts      # Appointment CRUD + booking + reschedule (~1400 lines)
├── appointmentServices.ts
├── auth.ts              # Auth instance and options
├── crons.ts             # 8 scheduled jobs (see Scheduled Jobs section)
├── email.tsx            # Email actions - "use node" with JSX rendering (~540 lines)
├── email_helpers.ts     # Internal query/mutation helpers for email actions
├── http.ts              # HTTP router (auth routes + Polar webhooks)
├── files.ts             # File storage mutations
├── slots.ts             # Slot availability algorithm
├── slotLocks.ts         # Slot lock acquire/release/cleanup
├── users.ts             # User queries (getCurrentUser)
├── reports.ts           # Revenue, staff performance, customer analytics
├── admin.ts             # SuperAdmin platform management
├── analytics.ts         # Dashboard stats (week-over-week, monthly revenue)
├── notifications.ts     # In-app notifications CRUD + triggers
├── subscriptions.ts     # Subscription status, webhook handlers, grace periods
├── polarActions.ts      # Polar checkout/portal URL generation (actions)
├── polarSync.ts         # Product sync from Polar
├── serviceCategories.ts
├── services.ts
├── customers.ts         # Customer CRUD + search + merge
├── scheduleOverrides.ts
├── timeOffRequests.ts
├── staffOvertime.ts
├── productCategories.ts
├── products.ts          # Product CRUD + adjustStock + countLowStock + listPublic
├── inventoryTransactions.ts
├── aiActions.tsx        # "use node" internalActions: photo analysis, quick questions, virtual try-on, care schedules
├── aiAnalysis.ts        # Photo analysis CRUD (list, get, submit, getLatest)
├── aiCareSchedules.ts   # Care schedule CRUD + weekly cron check
├── aiCredits.ts         # Credit balance management (deduct, refund, addPurchased, getMyBalance)
├── aiCreditActions.ts   # "use node" Polar one-time checkout for credit purchases
├── aiSimulations.ts     # Virtual try-on simulation CRUD + gallery management
├── aiMoodBoard.ts       # Mood board CRUD
├── designCatalog.ts     # Org design catalog management
└── *.ts                 # Domain functions (organizations, staff, members, invitations)

src/
├── app/             # Next.js App Router pages
│   ├── (auth)/      # Auth pages (sign-in) - no layout nesting
│   ├── [slug]/      # Multi-tenant routes (org slug in URL)
│   │   ├── (authenticated)/ # Protected routes (see sidebar nav below)
│   │   │   └── ai/          # AI hub page (/{slug}/ai)
│   │   └── (public)/        # Public routes (book, appointment/[code], catalog, designs, gallery)
│   ├── onboarding/  # New user org creation
│   └── dashboard/   # Redirect to active org
├── components/ui/   # shadcn/ui components (56+)
├── emails/          # React Email templates (4 templates + 4 shared components)
├── hooks/           # Custom React hooks
├── lib/             # Utilities (cn(), auth helpers)
└── modules/         # Feature modules (domain-driven)
    ├── ai/          # AI features module
    │   ├── components/         # CreditBalance, CreditPurchaseDialog
    │   ├── customer/components/ # PhotoAnalysisView, VirtualTryOnView, CareScheduleView,
    │   │                        # DesignBrowser, MoodBoardView, QuickQuestionsPanel, TryOnComparisonView
    │   ├── staff/components/    # AppointmentPrepView
    │   └── organization/components/ # DesignCatalogManager, GalleryModerationView, OrgAICreditManager
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
    ├── products/    # Product catalog, inventory management (7 components)
    ├── services/    # Service catalog, categories, pricing
    ├── settings/    # Settings forms & sub-pages
    └── staff/       # Staff management components
```

### Route Groups & Multi-Tenancy

- `(auth)/` — Route group (no URL segment). Auth pages with minimal layout.
- `[slug]/(authenticated)/` — Protected org routes. Requires auth + org membership.
- `[slug]/(public)/` — Public org routes (book, appointment/[code], catalog, designs, gallery). No auth required.
- `onboarding/` — First-time user flow to create an organization.
- `dashboard/` — Redirects to user's active organization dashboard.
- `/` — Salon directory (public listing of organizations).

**Sidebar Navigation:** Dashboard, Calendar, Staff, Appointments, Services, Customers, Products, Reports, AI, Settings, Billing

**Reports & Analytics (`/{slug}/reports`):**
- **Revenue Report:** Daily breakdowns, service/staff revenue, 2 charts (service popularity pie, peak hours bar), expanded CSV export (3 options)
- **Staff Performance:** KPI cards, utilization chart (color-coded), comparison table with no-show highlights
- **Customer Analytics:** Trend indicators (vs previous period), new vs returning chart, top customers table, retention rate
- All reports use date range picker with presets (Today, 7d, 30d, This/Last month, Custom up to 1 year)
- Access: Owner sees all data, staff sees filtered data (own appointments only)

**AI Hub (`/{slug}/ai`):** Customer-facing AI tools gated by credit balance. Features: photo analysis (single/multi-image), quick follow-up questions, virtual try-on (fal.ai image generation), care schedule generation, design catalog browsing, mood board. Org owners manage design catalog and moderate gallery. Staff see appointment prep view.

**Admin Panel (`/admin`):** Platform-level management for SuperAdmins (env-based via `SUPER_ADMIN_EMAILS`). Dashboard (platform stats), Organizations (suspend/delete), Users (ban/unban), Action Log (audit trail).

**Products & Inventory (`/{slug}/products`):** Owner-only product catalog with categories, dual pricing (cost + selling price, margin auto-calc), stock tracking with full audit log, low-stock alerts.
**Public Catalog (`/{slug}/catalog`):** Customer-facing product listing via `products.listPublic` (excludes cost price, supplier info).

**User Flow:** Sign in → No orgs? → `/onboarding` → Create org → `/{slug}/dashboard`
**Public Booking:** `/{slug}/book` → Select services → Pick time → Enter info → Confirmation code

**Multi-Tenancy:** Every table includes `organizationId` for tenant isolation. Custom function wrappers (`orgQuery`, `orgMutation`) automatically enforce membership checks. One salon per user.

**SuperAdmin Access:** SuperAdmins (defined via `SUPER_ADMIN_EMAILS` env var) bypass org membership checks via `resolveOrgContext` helper. Synthetic owner member created at runtime. All actions logged to `adminActions` table. Ban check in `getAuthUser` blocks banned users at auth layer.

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

**Role System:** 2-tier model (owner/staff). `ownerQuery`/`ownerMutation` enforce owner role. Originally implemented with 3-tier (owner/admin/member) but simplified in commit 1d49327.

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
- AI-specific validators live in `convex/lib/aiValidators.ts`
- Document validators include `_id` and `_creationTime` system fields
- Use `v.optional(validator)` in args, bare validator in return types

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
  },
});
```

**Available rate limits:** `createInvitation`, `resendInvitation`, `createOrganization`, `addMember`, `createService`, `createCustomer`, `createScheduleOverride`, `createTimeOffRequest`, `createOvertime`, `createBooking`, `cancelBooking`, `rescheduleBooking`, `cancelSubscription`, `suspendOrganization`, `deleteOrganization`, `banUser`, `aiPhotoAnalysis` (5/hr), `aiCareSchedule` (3/hr), `aiVirtualTryOn` (3/hr), `aiCreditPurchase` (5/hr), `aiClaimTestCredits` (3/day)

## Convex Components

Registered in `convex/convex.config.ts`:

- `@convex-dev/better-auth` (betterAuth) — Authentication
- `@convex-dev/polar` (polar) — Subscription billing + AI credit one-time purchases
- `@convex-dev/rate-limiter` (rateLimiter) — Rate limiting
- `@convex-dev/agent` (agent) — LLM thread management (photo analysis, quick questions, care schedules)

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
| Every 1 hour | `invitations.expireOldInvitations` | Expire old pending invitations |
| Every Monday 9 AM UTC | `aiCareSchedules.checkAndNotify` | Send care schedule reminder emails |

## Email System

**Architecture:** Convex actions (`.tsx` with `"use node"`) render React Email templates and send via Resend.

- `convex/email.tsx` — internalAction functions (booking confirmation, cancellation, invitation, care schedule reminder)
- `convex/email_helpers.ts` — internalQuery/internalMutation helpers (actions can't access `ctx.db`)
- `src/emails/` — React Email templates (BookingConfirmation, Cancellation, StaffInvitation)
- **Trigger pattern:** Convex triggers in `convex/lib/triggers.ts` auto-fire notifications and emails on appointment changes
- **Retry:** 3 attempts with exponential backoff (1s, 2s, 4s)
- **Idempotency:** Check `confirmationSentAt` before sending
- Convex actions (.tsx) can import from `../src/` — esbuild handles JSX

## AI Module

### Credit System

Credits are user-scoped (global across all salons, not per-org). Stored in `aiCredits` table with transaction log in `aiCreditTransactions`.

- **Credit costs** (defined in `convex/lib/aiConstants.ts`): photo analysis single=5, multi=8, quick question=2, virtual try-on=10, care schedule=2
- **Credit packages** (Polar one-time checkout): Starter 50cr/$1.99, Popular 200cr/$5.99, Pro 500cr/$11.99
- **Idempotency:** `addPurchasedCredits` mutation checks `by_reference` index on `orderId` before crediting — safe for webhook retries
- **Test credits:** `aiCredits.claimTestCredits` available when `ALLOW_TEST_CREDITS=true` env var is set (rate-limited 3/day)
- Credits are user-scoped only — no org-level pool

### LLM Architecture

- **Text/vision tasks** (photo analysis, quick questions, care schedules): `@convex-dev/agent` wrapping Vercel AI Gateway → GPT-4o
- **Image generation** (virtual try-on): `fal.ai` via `@ai-sdk/fal` + `generateImage()` using `fal-ai/omnigen-v2`
- Agent definitions live in `convex/lib/agents.ts`: `photoAnalysisAgent`, `quickQuestionAgent`, `careScheduleAgent`
- All AI internalActions live in `convex/aiActions.tsx` (`"use node"` runtime)

### Salon Types

`SalonType = "hair" | "nail" | "makeup" | "barber" | "spa" | "multi"` — stored on `organizationSettings`. Controls which AI features are available (e.g., virtual try-on only for hair/nail/makeup/multi), photo angle labels, and analysis focus areas.

### Schema Tables

AI-related tables: `aiCredits`, `aiCreditTransactions`, `aiAnalyses`, `aiSimulations`, `aiCareSchedules`, `aiMoodBoard`, `designCatalog`

## Key Files

**Backend (start here when adding/modifying features):**

| File                        | Purpose                                                             |
| --------------------------- | ------------------------------------------------------------------- |
| `convex/schema.ts`          | Database schema (types regenerate via `bunx convex dev`)            |
| `convex/lib/functions.ts`   | Custom function wrappers + `ErrorCode` enum (CRITICAL)              |
| `convex/lib/validators.ts`  | Shared return type validators (~910 lines)                          |
| `convex/lib/rateLimits.ts`  | Rate limiting configuration                                         |
| `convex/lib/triggers.ts`    | Appointment triggers (auto notifications + emails on changes)        |
| `convex/lib/aiConstants.ts` | AI credit costs, salon types, CREDIT_PACKAGES                       |
| `convex/lib/agents.ts`      | Convex agent instances for LLM features                             |
| `convex/admin.ts`           | SuperAdmin platform management                                      |

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
- **Soft vs hard delete:** Services and products use soft-delete (`status: "inactive"`). Customers use hard-delete.
- **Product margin:** `((sellingPrice - costPrice) / sellingPrice) * 100`, rounded to integer. `null` if `sellingPrice` is 0.
- **Inventory transactions:** Append-only audit log. `adjustStock` patches product stock and inserts transaction atomically. Quantity is signed (positive = add, negative = remove).
- **Schedule resolution:** `convex/lib/scheduleResolver.ts` merges default schedule + overrides + overtime for a given day.
- **Slot locks:** Temporary locks (cleaned up by cron every 1 min) prevent double-booking during the booking flow.
- **Date ranges:** Use index range queries (`.gte()/.lte()`) instead of per-day loops to avoid N+1.

## Error Handling

Functions throw `ConvexError` with an `ErrorCode` enum from `convex/lib/functions.ts`:

`UNAUTHENTICATED`, `FORBIDDEN`, `OWNER_REQUIRED`, `SUPER_ADMIN_REQUIRED`, `NOT_FOUND`, `ALREADY_EXISTS`, `VALIDATION_ERROR`, `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL_ERROR`

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
POLAR_PRODUCT_MONTHLY_ID=...     # Monthly subscription plan product ID
POLAR_PRODUCT_YEARLY_ID=...      # Yearly subscription plan product ID
POLAR_CREDIT_PRODUCT_STARTER=... # One-time AI credit product (50 credits)
POLAR_CREDIT_PRODUCT_POPULAR=... # One-time AI credit product (200 credits)
POLAR_CREDIT_PRODUCT_PRO=...     # One-time AI credit product (500 credits)

# AI Features
AI_GATEWAY_API_KEY=...           # Vercel AI Gateway API key (routes GPT-4o calls)
FAL_KEY=...                      # fal.ai API key (virtual try-on image generation)
ALLOW_TEST_CREDITS=true          # Enable test credit claiming (dev only)

# SuperAdmin (Platform Management)
SUPER_ADMIN_EMAILS=dev@example.com  # Comma-separated list of superadmin emails (enables /admin access)
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
- Import from `"./_generated/server"` for `query()`, `mutation()`, `action()`; import `internalQuery` from `"./_generated/server"` directly (not from `./lib/functions`)
- Actions are for external API calls only (email, payments, AI)
- Actions can't access `ctx.db` — use `ctx.runQuery(internal.xxx)` / `ctx.runMutation(internal.xxx)` instead
- Avoid N+1 queries: use index range queries (`.gte()/.lte()`) and pre-fetch lookups into Maps
- **Roles:** Only `"owner"` and `"staff"` in member table. Owner has full access (1 per org), staff can only manage own schedule.
- **SuperAdmin:** Separate from org roles. Environment-based access via `SUPER_ADMIN_EMAILS`. SuperAdmins bypass org membership via synthetic owner member. Used for platform management (/admin), not org operations.
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
