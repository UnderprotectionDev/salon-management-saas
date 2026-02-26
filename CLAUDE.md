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
- **AI:** `@convex-dev/agent` (LLM threads), Vercel AI SDK gateway (GPT-4o), `@ai-sdk/fal` (fal.ai image generation)
- **Charts:** recharts (via shadcn ChartContainer)
- **Forms:** TanStack Form + Zod validation
- **Avatars:** `react-nice-avatar@1.5.0` (client-side, no external API). Config stored as `avatarConfig: v.optional(v.any())` in `userProfile`.
- **Tools:** Bun (package manager), Biome (linter/formatter)

## Documentation

**Comprehensive PRD available in `docs/prd/`:**

- [Product Overview](docs/prd/product-overview.md) - Vision, goals, personas, user stories
- [Database Schema](docs/prd/database-schema.md) - Complete Convex schema with examples
- [API Reference](docs/prd/api-reference.md) - Function signatures, validators, rate limits
- [System Architecture](docs/prd/system-architecture.md) - Tech stack, multi-tenancy, security
- [Features](docs/prd/features.md) - All feature specifications
- [Design System](docs/prd/design-system.md) - UI components, user flows, accessibility
- [Glossary](docs/prd/glossary.md) - Domain terminology
- [Milestones](docs/milestones/README.md) - Implementation roadmap and progress

## Architecture

```
convex/                  # Backend functions and schema
├── _generated/          # Auto-generated types (don't edit)
├── betterAuth/          # Better Auth component
├── lib/                 # Shared: functions.ts (wrappers), validators.ts, rateLimits.ts,
│                        #   triggers.ts, aiConstants.ts, agents.ts, scheduleResolver.ts,
│                        #   confirmation.ts, dateTime.ts, ics.ts, phone.ts
├── schema.ts            # Database schema
├── appointments.ts      # Appointment CRUD + booking + reschedule (~1400 lines)
├── email.tsx            # Email actions ("use node", JSX rendering)
├── ai*.ts / ai*.tsx     # AI features (analysis, simulations, credits, care schedules, mood board)
├── admin.ts             # SuperAdmin platform management
├── reports.ts           # Revenue, staff performance, customer analytics
├── products.ts          # Product CRUD + adjustStock + countLowStock + listPublic
└── *.ts                 # Domain functions (organizations, staff, members, services, customers, etc.)

src/
├── app/                 # Next.js App Router pages
│   ├── (auth)/          # Auth pages (sign-in)
│   ├── [slug]/(authenticated)/  # Protected org routes
│   ├── [slug]/(public)/         # Public routes (book, catalog, gallery)
│   ├── onboarding/      # New user org creation
│   └── dashboard/       # Redirect to active org
├── components/ui/       # shadcn/ui components (56+)
├── emails/              # React Email templates
├── lib/                 # Utilities (cn(), auth helpers)
└── modules/             # Feature modules (domain-driven)
    ├── ai/              # AI features (customer, staff, organization components)
    ├── booking/         # Booking engine (16 components)
    ├── calendar/        # 5 calendar views (day/week/month/year/agenda), DnD rescheduling
    │   └── components/  #   Modular: day-view/, week-view/, month-view/, year-view/,
    │                    #   agenda-view/, header/, dialogs/, dnd/ (20 files)
    ├── billing/         # Subscription plans, grace period banner
    ├── products/        # Product catalog, inventory management
    ├── reports/         # Revenue, staff, customer reports
    ├── services/        # Service catalog, categories, pricing
    ├── customers/       # Customer database, search, merge
    ├── staff/           # Staff management
    ├── settings/        # Settings forms & sub-pages
    ├── organization/    # OrganizationProvider, OrganizationSwitcher
    ├── org-onboarding/  # Org creation wizard (3 steps)
    └── user-onboarding/ # User profile setup wizard
```

### Route Groups & Multi-Tenancy

- `(auth)/` — Auth pages with minimal layout
- `[slug]/(authenticated)/` — Protected org routes (requires auth + org membership)
- `[slug]/(public)/` — Public org routes (book, appointment/[code], catalog, designs, gallery)
- `onboarding/` — First-time user flow to create an organization
- `dashboard/` — Redirects to user's active organization dashboard
- `/` — Salon directory (public listing)

**Sidebar Navigation:** Dashboard, Calendar, Staff, Appointments, Services, Customers, Products, Reports, AI, Settings, Billing

**User Flow:** Sign in → No orgs? → `/onboarding` → Create org → `/{slug}/dashboard`
**Public Booking:** `/{slug}/book` → Select services → Pick time → Enter info → Confirmation code
**Multi-Tenancy:** Every table includes `organizationId`. Custom wrappers (`orgQuery`, `orgMutation`) enforce membership checks. One salon per user.

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

- `orgQuery`/`orgMutation` **auto-inject** `organizationId` from args — don't redeclare it in handler args
- Membership and role checks are automatic
- All throw structured `ConvexError` with `ErrorCode` on failure
- **Role system:** 2-tier (owner/staff). `ownerQuery`/`ownerMutation` enforce owner role.

**Example:**

```typescript
export const list = orgQuery({
  args: { status: v.optional(staffStatusValidator) },
  returns: v.array(staffDocValidator),
  handler: async (ctx, args) => {
    return ctx.db.query("staff")
      .withIndex("organizationId", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();
  },
});
```

## Return Validators

**All queries/mutations must have `returns:` validators.** Shared validators in `convex/lib/validators.ts`, AI-specific in `convex/lib/aiValidators.ts`. Document validators include `_id` and `_creationTime` system fields.

## Rate Limiting

Rate limits configured in `convex/lib/rateLimits.ts` using `@convex-dev/rate-limiter`. Usage: `await rateLimiter.limit(ctx, "limitName", { key })`.

**Available:** `createInvitation`, `resendInvitation`, `createOrganization`, `addMember`, `createService`, `createCustomer`, `createScheduleOverride`, `createTimeOffRequest`, `createOvertime`, `createBooking`, `cancelBooking`, `rescheduleBooking`, `cancelSubscription`, `suspendOrganization`, `deleteOrganization`, `banUser`, `aiPhotoAnalysis` (5/hr), `aiCareSchedule` (3/hr), `aiVirtualTryOn` (3/hr), `aiCreditPurchase` (5/hr), `aiClaimTestCredits` (3/day)

## Convex Components

Registered in `convex/convex.config.ts`: `@convex-dev/better-auth`, `@convex-dev/polar`, `@convex-dev/rate-limiter`, `@convex-dev/agent`

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

Convex actions (`.tsx` with `"use node"`) render React Email templates and send via Resend. Files: `convex/email.tsx`, `convex/email_helpers.ts`, `src/emails/`. Triggers auto-fire via `convex/lib/triggers.ts`. Retry: 3 attempts with exponential backoff. Idempotency: check `confirmationSentAt` before sending.

## AI Module

**Credit system:** User-scoped credits (global across salons). Costs defined in `convex/lib/aiConstants.ts`: photo analysis single=5/multi=8, quick question=2, virtual try-on=10, care schedule=2. Packages via Polar: 50cr/$1.99, 200cr/$5.99, 500cr/$11.99. Test credits available when `ALLOW_TEST_CREDITS=true`.

**LLM architecture:** Text/vision via `@convex-dev/agent` → Vercel AI Gateway → GPT-4o. Image generation via `fal.ai` (`@ai-sdk/fal`). Agent definitions in `convex/lib/agents.ts`. All actions in `convex/aiActions.tsx`.

**Salon types:** 34 types in 8 categories stored as multi-select array on `organization.salonType`. `deriveEffectiveSalonType()` maps array to single AI type. See `convex/lib/aiConstants.ts` for full type list and category definitions in `src/modules/org-onboarding/lib/constants.ts`.

## Key Files

**Backend:**

| File                        | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `convex/schema.ts`          | Database schema (types regenerate via `bunx convex dev`) |
| `convex/lib/functions.ts`   | Custom function wrappers + `ErrorCode` enum (CRITICAL)   |
| `convex/lib/validators.ts`  | Shared return type validators (~910 lines)               |
| `convex/lib/rateLimits.ts`  | Rate limiting configuration                              |
| `convex/lib/triggers.ts`    | Appointment triggers (auto notifications + emails)       |
| `convex/lib/aiConstants.ts` | AI credit costs, salon types, CREDIT_PACKAGES            |
| `convex/lib/agents.ts`      | Convex agent instances for LLM features                  |
| `convex/admin.ts`           | SuperAdmin platform management                           |

**Frontend:**

| File                              | Purpose                                          |
| --------------------------------- | ------------------------------------------------ |
| `src/lib/auth-client.ts`          | Client-side auth hooks (`authClient`)            |
| `src/lib/auth-server.ts`          | Server-side auth helpers (`isAuthenticated`)     |
| `src/modules/organization/`       | OrganizationProvider, hooks, OrganizationSwitcher|
| `src/modules/org-onboarding/`     | Org creation wizard (3-step, fully modular)      |
| `src/modules/user-onboarding/`    | User profile setup wizard (name, gender, avatar) |
| `src/proxy.ts`                    | Auth proxy for protected routes                  |

## Domain Conventions

- **Avatars:** `react-nice-avatar` config stored as `avatarConfig` JSON in `userProfile`. Fallback: `genConfig(userId)`. Helper: `src/modules/user-onboarding/lib/avatar.ts`.
- **Pricing:** Stored as kuruş integers (15000 = ₺150.00). Convert at UI with `formatPrice()`.
- **Phone numbers:** Turkish format (+90 5XX XXX XX XX). Validated via `convex/lib/phone.ts`.
- **Confirmation codes:** 6-char alphanumeric (excludes 0/O/I/1). Generated by `convex/lib/confirmation.ts`.
- **Soft vs hard delete:** Services and products use soft-delete (`status: "inactive"`). Customers use hard-delete.
- **Product margin:** `((sellingPrice - costPrice) / sellingPrice) * 100`, `null` if `sellingPrice` is 0.
- **Inventory transactions:** Append-only audit log. Quantity is signed (positive = add, negative = remove).
- **Schedule resolution:** `convex/lib/scheduleResolver.ts` merges default schedule + overrides + overtime.
- **Slot locks:** Temporary locks (2-min TTL, cleaned up by cron) prevent double-booking.
- **Date ranges:** Use index range queries (`.gte()/.lte()`) instead of per-day loops.

## Error Handling

Functions throw `ConvexError` with `ErrorCode` enum from `convex/lib/functions.ts`:
`UNAUTHENTICATED`, `FORBIDDEN`, `OWNER_REQUIRED`, `SUPER_ADMIN_REQUIRED`, `NOT_FOUND`, `ALREADY_EXISTS`, `VALIDATION_ERROR`, `INVALID_INPUT`, `RATE_LIMITED`, `INTERNAL_ERROR`

## Code Style

- **Bun** over npm/yarn for all commands
- **Biome** for linting/formatting (no ESLint/Prettier)
- **Path alias:** `@/*` → `./src/*`
- **Indentation:** 2 spaces
- **Terminology:** Code uses `organization`, UI uses `salon`, architecture uses `tenant`

## Environment Variables

See `.env.example` for all required environment variables with descriptions.

## Critical Gotchas

### Better Auth
- Schema auto-generated: `npx @better-auth/cli generate --output ./convex/betterAuth/schema.ts -y`
- Auth routes in `convex/http.ts` via `authComponent.registerRoutes()`
- Client: `authClient` from `@/lib/auth-client` — Server: helpers from `@/lib/auth-server`

### React Compiler
- Don't use `useMemo`, `useCallback`, `React.memo` — Compiler handles optimization

### Convex Development
- Run `bunx convex dev` after schema changes (types won't update otherwise)
- Use `ctx.db` in queries/mutations only, not in actions
- Actions can't access `ctx.db` — use `ctx.runQuery(internal.xxx)` / `ctx.runMutation(internal.xxx)`
- Import `internalQuery` from `"./_generated/server"` directly (not from `./lib/functions`)
- Avoid N+1 queries: use `getAll()` from `convex-helpers/server/relationships` for batch fetches, or index range queries with pre-fetch lookups into Maps
- **Triggers:** `convex/lib/triggers.ts` auto-fires side effects on appointment changes. All mutations use `triggerMutation` base.

### Tailwind v4
- No `tailwind.config.js` — all config in CSS (`@theme`, `@utility`)

### Biome Linting
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
3. Create Convex functions using custom wrappers + return validators + rate limiting
4. Create frontend module: `src/modules/[feature]/`
5. Export public API: `src/modules/[feature]/index.ts`

### TanStack Form
- `form.state.values` is NOT reactive — use `form.Subscribe` for reactive UI
- Don't call `form.reset()` during render — use `key={id}` prop to force remount
- Fetch full doc via `useQuery(api.xxx.get)` inside edit dialogs
