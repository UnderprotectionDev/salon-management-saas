# System Architecture

> **Last Updated:** 2026-02-04
> **Status:** Active

## Overview

The Salon Management SaaS is built on a modern, real-time architecture optimized for simplicity, scalability, and developer experience. The system uses Convex as the unified backend platform, eliminating the need for separate databases, API servers, and real-time infrastructure.

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        NextJS["Next.js 16 App<br/>(React 19 + Compiler)"]
        PWA["PWA Support"]
    end

    subgraph Convex["Convex Platform"]
        Functions["Functions<br/>(Queries, Mutations, Actions)"]
        Database[(Convex Database)]
        Realtime["Real-time Subscriptions"]
        Storage["File Storage"]
        Scheduler["Scheduled Jobs"]
    end

    subgraph Auth["Authentication"]
        BetterAuth["Better Auth"]
        Sessions["Session Management"]
    end

    subgraph External["External Services"]
        Resend["Resend<br/>(Email)"]
        Sentry["Sentry<br/>(Monitoring)"]
        Vercel["Vercel<br/>(Hosting)"]
    end

    NextJS <-->|Real-time| Realtime
    NextJS <-->|API| Functions
    Functions <--> Database
    Functions <--> Storage
    Functions --> Scheduler
    Functions --> Resend
    NextJS --> BetterAuth
    BetterAuth <--> Sessions
    Sessions <--> Database
    NextJS --> Sentry
    Vercel --> NextJS
```

---

## Tech Stack

### Frontend

| Technology      | Version | Purpose                                 |
| --------------- | ------- | --------------------------------------- |
| Next.js         | 16      | React framework with App Router         |
| React           | 19      | UI library                              |
| React Compiler  | Latest  | Automatic optimization (no memo needed) |
| TypeScript      | 5.x     | Type safety                             |
| Tailwind CSS    | 4       | Utility-first styling                   |
| shadcn/ui       | Latest  | Component library (New York style)      |
| TanStack Form   | Latest  | Form state management                   |
| Zod             | 4.x     | Schema validation                       |

### Backend (Convex)

| Feature                 | Usage                       |
| ----------------------- | --------------------------- |
| Convex Functions        | Queries, mutations, actions |
| Convex Database         | Document store with indexes |
| Real-time Subscriptions | Live data sync              |
| File Storage            | Images, documents           |
| Scheduled Jobs          | Crons, delayed tasks        |
| Search Indexes          | Full-text search            |
| convex-helpers          | RLS, triggers, validators   |

### Authentication

| Technology     | Purpose                         |
| -------------- | ------------------------------- |
| Better Auth    | Auth framework                  |
| Convex Adapter | Session storage in Convex       |
| Magic Link     | Passwordless email login        |
| OTP            | Phone verification for bookings |

### External Services

| Service     | Purpose                     | Packages |
| ----------- | --------------------------- | -------- |
| Polar       | SaaS subscription billing   | @convex-dev/polar, @polar-sh/sdk |
| Resend      | Transactional emails        | resend |
| React Email | Email templates             | @react-email/components |
| Sentry      | Error tracking & monitoring | @sentry/nextjs |
| Vercel      | Hosting & deployment        | - |

### Development Tools

| Tool       | Purpose                   |
| ---------- | ------------------------- |
| Bun        | Package manager & runtime |
| Biome      | Linting & formatting      |
| TypeScript | Type checking             |

---

## Multi-Tenancy Architecture

### Tenant Isolation Strategy

The system uses **Organization-Based Multi-Tenancy** where each salon is an organization with complete data isolation.

```mermaid
flowchart LR
    subgraph Tenant1["Salon A"]
        Data1[(Data)]
        Users1[Users]
        Settings1[Settings]
    end

    subgraph Tenant2["Salon B"]
        Data2[(Data)]
        Users2[Users]
        Settings2[Settings]
    end

    subgraph Shared["Shared Infrastructure"]
        ConvexDB[(Convex Database)]
        Functions[Functions]
    end

    Tenant1 --> ConvexDB
    Tenant2 --> ConvexDB
    Functions --> Tenant1
    Functions --> Tenant2
```

### Implementation Pattern

```typescript
// Every table includes organizationId
appointments: defineTable({
  organizationId: v.id("organizations"), // Tenant identifier
  // ... other fields
}).index("by_organization", ["organizationId"]);

// Every query filters by organization
export const getAppointments = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // Verify user has access to this organization
    await assertOrgAccess(ctx, args.organizationId);

    return ctx.db
      .query("appointments")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .collect();
  },
});
```

### URL Structure

```
https://app.salonmanagement.com/[org-slug]/[page]

Examples:
- /glamour-salon/dashboard
- /glamour-salon/calendar
- /glamour-salon/book (public booking)
```

---

## Data Flow

### Read Path (Queries)

```mermaid
sequenceDiagram
    participant Client
    participant Convex
    participant DB

    Client->>Convex: useQuery(api.appointments.list)
    Convex->>DB: Query with organization filter
    DB-->>Convex: Results
    Convex-->>Client: Data + subscription
    Note over Client,Convex: Auto-updates on changes
```

### Write Path (Mutations)

```mermaid
sequenceDiagram
    participant Client
    participant Convex
    participant DB
    participant External

    Client->>Convex: useMutation(api.appointments.create)
    Convex->>Convex: Validate input
    Convex->>Convex: Check permissions
    Convex->>DB: Write transaction
    Convex->>External: Trigger email (async)
    Convex-->>Client: Success
    Note over Client: Subscriptions auto-update
```

### Real-time Updates

```mermaid
sequenceDiagram
    participant User1 as User A (Browser)
    participant User2 as User B (Browser)
    participant Convex

    User1->>Convex: Subscribe to calendar
    User2->>Convex: Subscribe to calendar
    User1->>Convex: Create appointment
    Convex-->>User1: Optimistic update
    Convex-->>User2: Push update
    Note over User1,User2: Both see change immediately
```

---

## Security Architecture

### Authentication Flow

```mermaid
flowchart TB
    User[User] --> Login[Login Page]
    Login --> BetterAuth[Better Auth]
    BetterAuth --> Method{Method?}
    Method -->|Email| MagicLink[Magic Link]
    Method -->|Phone| OTP[OTP Verification]
    MagicLink --> Session[Create Session]
    OTP --> Session
    Session --> Convex[Store in Convex]
    Convex --> JWT[Return JWT]
    JWT --> Client[Client Stores Token]
```

### Authorization Model

```typescript
// Role-based access control
type Role = "owner" | "admin" | "staff";

// Permission checks in every mutation
async function assertPermission(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  requiredRole: Role,
) {
  const user = await getCurrentUser(ctx);
  const membership = await ctx.db
    .query("staff")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .filter((q) => q.eq(q.field("organizationId"), organizationId))
    .first();

  if (!membership) {
    throw new ConvexError("Not a member of this organization");
  }

  const roleHierarchy: Record<Role, number> = {
    owner: 3,
    admin: 2,
    staff: 1,
  };

  if (roleHierarchy[membership.role] < roleHierarchy[requiredRole]) {
    throw new ConvexError("Insufficient permissions");
  }

  return membership;
}
```

### Data Protection

| Layer       | Protection                        |
| ----------- | --------------------------------- |
| Transport   | HTTPS everywhere                  |
| Database    | Convex managed encryption at rest |
| Application | Input validation on all mutations |
| Business    | Organization-scoped queries       |

---

## Scalability Considerations

### Convex Handles

- **Database scaling:** Automatic sharding and replication
- **Real-time subscriptions:** Efficient pub/sub infrastructure
- **Function execution:** Serverless scaling
- **File storage:** CDN-backed storage

### Application Design

| Concern            | Strategy                      |
| ------------------ | ----------------------------- |
| Large lists        | Pagination with cursors       |
| Search             | Convex search indexes         |
| Heavy computations | Actions (not in transactions) |
| Bulk operations    | Batch processing              |

### Performance Targets

| Metric                 | Target  |
| ---------------------- | ------- |
| Query latency (P95)    | < 100ms |
| Mutation latency (P95) | < 200ms |
| Real-time sync         | < 100ms |
| Page load (LCP)        | < 2.5s  |

---

## Error Handling Strategy

### Frontend

```typescript
// Global error boundary
function RootErrorBoundary({ error }: { error: Error }) {
  // Log to Sentry
  Sentry.captureException(error);

  return <ErrorPage />;
}

// Query error handling
function AppointmentsList() {
  const appointments = useQuery(api.appointments.list, { orgId });

  if (appointments === undefined) {
    return <Skeleton />;
  }

  if (appointments instanceof Error) {
    return <ErrorState error={appointments} />;
  }

  return <List data={appointments} />;
}
```

### Backend (Convex)

```typescript
// Structured errors
export const createAppointment = mutation({
  handler: async (ctx, args) => {
    // Validation errors
    if (!args.serviceIds.length) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "At least one service is required",
        field: "serviceIds",
      });
    }

    // Business logic errors
    const conflict = await checkConflict(ctx, args);
    if (conflict) {
      throw new ConvexError({
        code: "SLOT_UNAVAILABLE",
        message: "This time slot is no longer available",
        suggestedSlots: await getAlternatives(ctx, args),
      });
    }

    // ... create appointment
  },
});
```

---

## Monitoring & Observability

### Sentry Integration

```typescript
// Error tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Performance monitoring
const transaction = Sentry.startTransaction({
  name: "BookingFlow",
  op: "user.action",
});
```

### Convex Dashboard

- Function execution logs
- Database query performance
- Real-time subscription metrics
- Error rates and stack traces

### Custom Metrics (Future)

| Metric                 | Purpose           |
| ---------------------- | ----------------- |
| Bookings per hour      | Business health   |
| No-show rate           | Customer behavior |
| Page load times        | User experience   |
| Error rate by function | System health     |

---

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Development
        Local[Local Dev]
        ConvexDev[Convex Dev]
    end

    subgraph Production
        Vercel[Vercel Edge]
        ConvexProd[Convex Production]
    end

    Local --> ConvexDev
    Git[GitHub] --> Vercel
    Git --> ConvexProd
    Vercel --> ConvexProd
```

### Environments

| Environment | Frontend           | Backend               |
| ----------- | ------------------ | --------------------- |
| Development | localhost:3000     | Convex dev deployment |
| Preview     | Vercel preview URL | Convex dev deployment |
| Production  | Custom domain      | Convex production     |

### CI/CD Pipeline

1. **Push to GitHub**
2. **Vercel builds Next.js**
3. **Convex deploys functions**
4. **Preview deployment created**
5. **Manual promotion to production**

---

---

## Subscription Billing Architecture

### Polar.sh Integration

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Dashboard[Admin Dashboard]
        BillingPage[Billing Page]
    end

    subgraph Convex["Convex Backend"]
        Mutations["Subscription Mutations"]
        Queries["Subscription Queries"]
        Webhooks["HTTP Webhook Handler"]
        DB[(Database)]
    end

    subgraph Polar["Polar.sh"]
        Checkout[Checkout Page]
        Portal[Customer Portal]
        API[Polar API]
        Events[Webhook Events]
    end

    Dashboard --> Queries
    BillingPage --> Mutations
    Mutations --> API
    API --> Checkout
    API --> Portal
    Events --> Webhooks
    Webhooks --> DB
    Queries --> DB
```

### Webhook Event Flow

```mermaid
sequenceDiagram
    participant Polar
    participant Webhook as Convex HTTP Action
    participant DB as Convex Database
    participant Org as Organization

    Polar->>Webhook: POST /webhooks/polar
    Webhook->>Webhook: Verify signature
    Webhook->>Webhook: Parse event type

    alt subscription.created
        Webhook->>DB: Create subscription record
        Webhook->>DB: Update org status = active
    else subscription.updated
        Webhook->>DB: Update subscription record
        Webhook->>DB: Update org billing period
    else payment.failed
        Webhook->>DB: Log payment failure
        Webhook->>DB: Update org status = past_due
        Webhook->>Org: Trigger grace period emails
    else subscription.cancelled
        Webhook->>DB: Mark subscription cancelled
        Webhook->>DB: Set access end date
    end

    Webhook-->>Polar: 200 OK
```

### Subscription States

```mermaid
stateDiagram-v2
    [*] --> Trial: New organization
    Trial --> Active: Subscribe via Polar
    Active --> PastDue: Payment fails
    PastDue --> Active: Payment succeeds
    PastDue --> Suspended: Grace period expires (7 days)
    Suspended --> Active: Payment succeeds
    Active --> Cancelled: User cancels
    Cancelled --> Active: User resubscribes
    Suspended --> Cancelled: 30 days no action
```

### Environment Configuration

| Environment | Polar Mode | Webhook URL |
| ----------- | ---------- | ----------- |
| Development | Sandbox    | localhost (ngrok) |
| Preview     | Sandbox    | preview-url/webhooks/polar |
| Production  | Production | app.domain.com/webhooks/polar |

---

## Future Architecture Considerations

### Potential Additions (P2+)

| Feature            | Architecture Impact       |
| ------------------ | ------------------------- |
| SMS notifications  | Add Twilio/SNS action     |
| Customer payments  | Extend Polar for one-time |
| Multi-location     | Extend tenant model       |
| Mobile apps        | Add React Native clients  |
| Advanced analytics | Add data warehouse export |

### Migration Path

If scaling beyond Convex limits becomes necessary:

1. **Database:** Export to PostgreSQL/MongoDB
2. **Real-time:** Add dedicated WebSocket service
3. **Functions:** Move to AWS Lambda/Cloud Functions
4. **Storage:** Migrate to S3/Cloud Storage

Current architecture is designed for easy extraction of individual components if needed.
