# Architecture

## Directory Structure

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
├── expenses.ts          # Expense CRUD + bulkDelete + recurring generation
├── additionalRevenue.ts # Non-appointment revenue CRUD
├── giftCards.ts         # Gift card CRUD + redeem + auto-expire
├── dailyClosing.ts      # Daily cash reconciliation + close day
├── commissionSettings.ts # Per-staff commission configuration
├── financials.ts        # Financial dashboard stats + commission report
├── spreadsheetSheets.ts # Freeform sheet CRUD + setFreeze + setMergedRegions + setConditionalFormats
├── spreadsheetCells.ts  # Cell upsert + bulkUpsert + replaceAllCells (sparse storage)
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
    ├── financials/      # M12: expense/revenue/gift cards/commissions/daily closing
    │                    # M13: Excel-like freeform spreadsheet (50+ formulas, cond. formatting, merge/freeze, PDF export)
    ├── services/        # Service catalog, categories, pricing
    ├── customers/       # Customer database, search, merge
    ├── staff/           # Staff management
    ├── settings/        # Settings forms & sub-pages
    ├── organization/    # OrganizationProvider, OrganizationSwitcher
    ├── org-onboarding/  # Org creation wizard (3 steps)
    └── user-onboarding/ # User profile setup wizard
```

## Route Groups & Multi-Tenancy

- `(auth)/` — Auth pages with minimal layout
- `[slug]/(authenticated)/` — Protected org routes (requires auth + org membership)
- `[slug]/(public)/` — Public org routes (book, appointment/[code], catalog, designs, gallery)
- `onboarding/` — First-time user flow to create an organization
- `dashboard/` — Redirects to user's active organization dashboard
- `/` — Salon directory (public listing)

**Sidebar Navigation:** Dashboard, Calendar, Staff, Appointments, Services, Customers, Products, Reports, Financials, AI, Settings, Billing

**User Flow:** Sign in → No orgs? → `/onboarding` → Create org → `/{slug}/dashboard`
**Public Booking:** `/{slug}/book` → Select services → Pick time → Enter info → Confirmation code
**Multi-Tenancy:** Every table includes `organizationId`. Custom wrappers (`orgQuery`, `orgMutation`) enforce membership checks. One salon per user.

## Organization Context

Use hooks from `@/modules/organization`:

- `useOrganization()` — Full context (activeOrganization, organizations, currentStaff, currentRole)
- `useActiveOrganization()` — Current organization only
- `useCurrentStaff()` — User's staff profile in active org
- `useOrganizations()` — All orgs user belongs to

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

## Documentation

**Comprehensive PRD available in `docs/prd/`:**

- [Product Overview](../../docs/prd/product-overview.md) - Vision, goals, personas, user stories
- [Database Schema](../../docs/prd/database-schema.md) - Complete Convex schema with examples
- [API Reference](../../docs/prd/api-reference.md) - Function signatures, validators, rate limits
- [System Architecture](../../docs/prd/system-architecture.md) - Tech stack, multi-tenancy, security
- [Features](../../docs/prd/features.md) - All feature specifications
- [Design System](../../docs/prd/design-system.md) - UI components, user flows, accessibility
- [Glossary](../../docs/prd/glossary.md) - Domain terminology
- [Milestones](../../docs/milestones/README.md) - Implementation roadmap and progress
