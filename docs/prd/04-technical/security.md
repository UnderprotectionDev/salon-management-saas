# Security Specifications

> **Last Updated:** 2026-02-04
> **Status:** Active
> **Compliance Target:** KVKK (Turkish GDPR)

## Overview

This document outlines the security requirements, authentication flows, authorization model, and compliance considerations for the Salon Management SaaS platform.

---

## Security Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser[Browser]
        HTTPS[HTTPS Only]
    end

    subgraph Auth["Authentication"]
        BetterAuth[Better Auth]
        Sessions[Session Store]
        Google[Google OAuth]
    end

    subgraph API["API Layer"]
        Convex[Convex Functions]
        Validation[Input Validation]
        AuthZ[Authorization]
    end

    subgraph Data["Data Layer"]
        DB[(Encrypted Database)]
        Storage[File Storage]
        Logs[Audit Logs]
    end

    Browser --> HTTPS --> BetterAuth
    BetterAuth --> Sessions
    Browser --> HTTPS --> Convex
    Convex --> Validation --> AuthZ
    AuthZ --> DB
    AuthZ --> Storage
    Convex --> Logs
```

---

## Authentication

### Authentication Methods

| Method | Use Case | Security Level |
|--------|----------|----------------|
| Google OAuth | Primary login (social login via Better Auth) | High |
| Email/Password | Secondary login (configured, not primary) | Medium |
| Session Token | Ongoing authentication | High |

### Better Auth Configuration

```typescript
// convex/betterAuth/auth.ts
export const auth = createAuth({
  // ...
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60, // Update every hour
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
});
```

### Google OAuth Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Auth as Better Auth
    participant Google as Google OAuth
    participant DB as Convex

    User->>App: Click "Sign in with Google"
    App->>Auth: Initiate OAuth flow
    Auth->>Google: Redirect to Google consent
    Google-->>User: Show consent screen
    User->>Google: Approve
    Google->>Auth: Return auth code
    Auth->>Google: Exchange code for tokens
    Auth->>DB: Create/update user record
    Auth->>DB: Create session
    Auth-->>App: Return session cookie
    App-->>User: Logged in
```

### OTP Verification (Planned - Future)

> **Status:** Not currently implemented. Planned for future booking verification.

When implemented, OTP will be used for customer booking verification:
- 6-digit numeric code
- 5-minute expiration
- Max 3 verification attempts
- 60-second cooldown between sends
- Max 5 sends per phone per hour

---

## Authorization

### Role-Based Access Control (RBAC)

```typescript
// Authorization model
type Role = "owner" | "admin" | "member";

interface Permission {
  resource: string;
  actions: ("create" | "read" | "update" | "delete")[];
  scope: "own" | "organization" | "all";
}

const rolePermissions: Record<Role, Permission[]> = {
  owner: [
    { resource: "*", actions: ["create", "read", "update", "delete"], scope: "organization" },
  ],
  admin: [
    { resource: "appointments", actions: ["create", "read", "update", "delete"], scope: "organization" },
    { resource: "staff", actions: ["create", "read", "update"], scope: "organization" },
    { resource: "services", actions: ["create", "read", "update", "delete"], scope: "organization" },
    { resource: "customers", actions: ["create", "read", "update"], scope: "organization" },
    { resource: "reports", actions: ["read"], scope: "organization" },
  ],
  member: [
    { resource: "appointments", actions: ["create", "read", "update"], scope: "own" },
    { resource: "customers", actions: ["read"], scope: "organization" },
    { resource: "services", actions: ["read"], scope: "organization" },
  ],
};
```

### Authorization Implementation

Authorization is enforced through custom function wrappers built with `convex-helpers`. Each wrapper validates auth and injects typed context:

```typescript
// convex/lib/functions.ts — Custom function wrappers (from convex-helpers)

// Queries
publicQuery     // No auth required
maybeAuthedQuery // Optional auth — ctx.user is AuthUser | null (doesn't throw)
authedQuery     // Requires login — ctx.user guaranteed
orgQuery        // Requires org membership — auto-injects ctx.organizationId, ctx.member, ctx.staff
adminQuery      // Requires admin or owner role
ownerQuery      // Requires owner role only

// Mutations
authedMutation  // Requires login
orgMutation     // Requires org membership
adminMutation   // Requires admin or owner role
ownerMutation   // Requires owner role only
```

User resolution uses the Better Auth component:

```typescript
// User resolution (NOT ctx.auth.getUserIdentity())
const user = await authComponent.getAuthUser(ctx);
if (!user) {
  throw new ConvexError({
    code: ErrorCode.UNAUTHENTICATED,
    message: "Authentication required",
  });
}
```

#### Error Codes

All authorization errors use the structured `ErrorCode` enum:

```typescript
const ErrorCode = {
  // Authentication errors
  UNAUTHENTICATED: "UNAUTHENTICATED",
  // Authorization errors
  FORBIDDEN: "FORBIDDEN",
  ADMIN_REQUIRED: "ADMIN_REQUIRED",
  OWNER_REQUIRED: "OWNER_REQUIRED",
  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",
  // General errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
```

### Usage in Mutations

```typescript
// Admin-only mutation — no manual role checking needed
export const updateService = adminMutation({
  args: {
    serviceId: v.id("services"),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new ConvexError({ code: ErrorCode.NOT_FOUND, message: "Service not found" });
    }

    // ctx.organizationId, ctx.member, ctx.staff, ctx.role are auto-injected
    await ctx.db.patch(args.serviceId, {
      ...(args.name && { name: args.name }),
      ...(args.price && { price: args.price }),
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Org-level query — any member can access
export const listStaff = orgQuery({
  args: {},
  handler: async (ctx) => {
    // ctx.organizationId is automatically available
    return await ctx.db
      .query("staff")
      .withIndex("organizationId", (q) => q.eq("organizationId", ctx.organizationId))
      .collect();
  },
});
```

---

## Data Protection

### Multi-Tenancy Isolation

**Every query MUST include organization filtering:**

```typescript
// CORRECT - Tenant-scoped query
const appointments = await ctx.db
  .query("appointments")
  .withIndex("by_organization", (q) =>
    q.eq("organizationId", organizationId)
  )
  .collect();

// WRONG - Exposes all tenants
const appointments = await ctx.db.query("appointments").collect();
```

### Input Validation

```typescript
// All mutations validate input
export const createAppointment = mutation({
  args: {
    organizationId: v.id("organization"),
    date: v.string(), // Will be validated as ISO date
    startTime: v.number(),
    customerPhone: v.string(),
  },
  handler: async (ctx, args) => {
    // Date validation
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(args.date)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Invalid date format",
        field: "date",
      });
    }

    // Time validation
    if (args.startTime < 0 || args.startTime > 1440) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Invalid time",
        field: "startTime",
      });
    }

    // Phone validation (Turkish format)
    const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
    if (!phoneRegex.test(args.customerPhone.replace(/\s/g, ""))) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Invalid Turkish phone number",
        field: "customerPhone",
      });
    }

    // ... proceed with creation
  },
});
```

### Sensitive Data Handling

| Data Type | Storage | Access Control |
|-----------|---------|----------------|
| Email | Encrypted at rest | Organization members |
| Phone | Encrypted at rest | Organization members |
| Session tokens | Hashed | System only |
| OAuth tokens | Managed by Google/Better Auth | System only |
| Invitation tokens | Hashed | System only |

### Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Active appointments | Indefinite | Manual deletion |
| Completed appointments | 2 years | Automated purge |
| Cancelled appointments | 90 days | Automated purge |
| Audit logs | 1 year | Automated purge |
| Sessions | Until expiry | Automated cleanup |

---

## KVKK Compliance

### Data Subject Rights

| Right | Implementation |
|-------|----------------|
| Access | Customer can view all their data via profile |
| Rectification | Customer can update profile information |
| Erasure | "Delete my data" button in settings |
| Portability | Export data as JSON/CSV |
| Objection | Opt-out of marketing communications |

### Data Processing Records

```typescript
// Audit log for data access
export const logDataAccess = internalMutation({
  args: {
    organizationId: v.id("organization"),
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

### Consent Management

```typescript
// Customer consent tracking
customers: defineTable({
  // ... other fields
  consents: v.object({
    dataProcessing: v.boolean(),         // KVKK explicit consent
    marketing: v.boolean(),              // Optional marketing opt-in
    dataProcessingAt: v.optional(v.number()), // Timestamp of consent
    marketingAt: v.optional(v.number()),     // Timestamp of marketing opt-in
    withdrawnAt: v.optional(v.number()),     // Timestamp of consent withdrawal
  }),
});
```

### Consent Collection Flow

```mermaid
sequenceDiagram
    participant Customer
    participant App
    participant Convex

    Note over Customer,Convex: First Booking (Guest)
    Customer->>App: Start booking
    App->>Customer: Show consent checkboxes
    Note right of App: ☑️ Data processing consent (required)<br/>☐ Marketing communications (optional)
    Customer->>App: Accept data processing consent
    App->>Convex: Store consents with timestamps
    Convex->>Convex: Create customer record with consents

    Note over Customer,Convex: Consent Update
    Customer->>App: Go to profile settings
    App->>Customer: Show current consent status
    Customer->>App: Opt-out of marketing
    App->>Convex: Update marketing = false, withdrawnAt = now
    Convex->>Convex: Log consent change in auditLogs
```

### Consent UI Requirements

**Guest Booking (First Visit):**
```
☑️ I consent to the processing of my personal data (required)
☐ I agree to receive promotional communications (optional)

[Continue to Booking]
```

**Returning Customer (Account Holder):**
- Consents already stored
- No repeated consent collection
- Consent status visible in profile settings
- Can modify optional consents (marketing) anytime

### Data Export (KVKK Article 11)

Customers can request all their personal data under KVKK Article 11:

**Included in Export:**
| Data Category | Details |
|---------------|---------|
| Personal Info | Name, phone, email |
| Appointment History | All past/future appointments |
| Customer Notes | Notes created by customer |
| Consent Records | All consent timestamps and versions |
| Account Activity | Login history, profile changes |

**Excluded from Export:**
| Data Category | Reason |
|---------------|--------|
| Staff Internal Notes | Legitimate business interest exception |
| Aggregated Analytics | Not personal data |
| Security Event Logs | Legal retention requirement |

**Export Implementation:**

```typescript
export const exportCustomerData = action({
  args: {
    customerId: v.id("customers"),
    format: v.union(v.literal("json"), v.literal("csv")),
  },
  handler: async (ctx, args) => {
    // Verify customer owns this data
    await assertCustomerOwnership(ctx, args.customerId);

    const customer = await ctx.runQuery(internal.customers.getWithHistory, {
      customerId: args.customerId,
    });

    // Format and return data
    return args.format === "json"
      ? JSON.stringify(customer, null, 2)
      : convertToCsv(customer);
  },
});
```

**Response Timeline:** 30 days per KVKK Article 13

---

## API Security

### Rate Limiting

Implemented via `@convex-dev/rate-limiter` in `convex/lib/rateLimits.ts`:

| Rate Limit | Limit | Window | Type | Scope |
|------------|-------|--------|------|-------|
| `createInvitation` | 20/day | 1 day | Token bucket (capacity: 25) | Per org |
| `resendInvitation` | 3/hour | 1 hour | Token bucket | Per invitation |
| `createOrganization` | 3/day | 1 day | Fixed window | Per user |
| `addMember` | 10/hour | 1 hour | Token bucket (capacity: 15) | Per org |
| `createBooking` | 5/min | 1 minute | Token bucket (capacity: 10) | Per user (future) |
| `cancelBooking` | 3/hour | 1 hour | Token bucket | Per user (future) |

### CORS Configuration

```typescript
// Convex HTTP actions
export const httpRouter = httpRouter({
  cors: {
    origin: [
      "https://salonmanagement.com",
      "https://*.salonmanagement.com",
      process.env.NODE_ENV === "development" && "http://localhost:3000",
    ].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});
```

### Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Content-Security-Policy",
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https:;
      font-src 'self';
      connect-src 'self' https://*.convex.cloud wss://*.convex.cloud;
    `.replace(/\s+/g, " ").trim(),
  },
];
```

---

## Incident Response

### Security Event Categories

| Severity | Examples | Response Time |
|----------|----------|---------------|
| Critical | Data breach, auth bypass | Immediate |
| High | Mass unauthorized access attempts | 1 hour |
| Medium | Single account compromise | 4 hours |
| Low | Policy violations, anomalies | 24 hours |

### Monitoring

```typescript
// Security event logging
async function logSecurityEvent(
  ctx: MutationCtx,
  event: {
    type: "login_failed" | "unauthorized_access" | "rate_limited" | "suspicious_activity";
    severity: "low" | "medium" | "high" | "critical";
    userId?: Id<"users">;
    ipAddress?: string;
    details: Record<string, unknown>;
  }
) {
  await ctx.db.insert("securityEvents", {
    ...event,
    createdAt: Date.now(),
  });

  // Alert on high/critical events
  if (event.severity === "high" || event.severity === "critical") {
    await ctx.scheduler.runAfter(0, internal.alerts.sendSecurityAlert, {
      event,
    });
  }
}
```

---

## Security Checklist

### Development

- [ ] Input validation on all mutations
- [ ] Organization ID filtering on all queries
- [ ] Role checks on sensitive operations
- [ ] No sensitive data in logs
- [ ] No secrets in code (use env vars)
- [ ] Dependencies regularly updated

### Deployment

- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] CORS properly restricted
- [ ] Rate limiting enabled
- [ ] Error messages don't expose internals

### Operations

- [ ] Audit logging enabled
- [ ] Security monitoring active
- [ ] Incident response plan documented
- [ ] Regular security reviews scheduled
- [ ] Data retention policies enforced

### Compliance

- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] KVKK data processing records maintained
- [ ] Data subject request process documented
- [ ] Consent tracking implemented

---

## Payment Security (Polar.sh Integration)

### PCI Compliance

| Aspect | Implementation |
|--------|----------------|
| **Card Data Handling** | Polar handles all card data - never touches our servers |
| **PCI DSS Scope** | Out of scope - SAQ-A eligible (redirected checkout) |
| **Card Storage** | Stored by Polar, we only store Polar customer/subscription IDs |
| **Payment Processing** | Occurs entirely on Polar's PCI-compliant infrastructure |

### Webhook Security

```typescript
// Verify Polar webhook signature
function verifyPolarSignature(
  body: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) throw new Error("POLAR_WEBHOOK_SECRET not configured");

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Webhook Validation Checklist

- [ ] Verify signature on every webhook request
- [ ] Reject requests without valid signature (401)
- [ ] Use timing-safe comparison to prevent timing attacks
- [ ] Log all webhook events for audit
- [ ] Implement idempotency using `polarEventId`
- [ ] Handle webhook retries gracefully

### Payment Data Handling Policy

| Data Type | Storage | Access |
|-----------|---------|--------|
| Polar Customer ID | Encrypted in Convex | System only |
| Polar Subscription ID | Encrypted in Convex | System only |
| Payment Event Logs | Encrypted in Convex | Owner + System |
| Card Details | **Never stored** | N/A |
| Invoice PDFs | Polar-hosted URLs | Owner via Polar portal |

### Subscription Security

| Control | Implementation |
|---------|----------------|
| **Access Control** | Only organization owner can manage subscription |
| **Checkout Sessions** | Time-limited, single-use URLs |
| **Portal Access** | Generated per-request, short-lived URLs |
| **Webhook Replay** | Prevented via idempotency key checking |
| **Rate Limiting** | 10 checkout attempts per hour per org |

### Environment Variables

```bash
# Required for Polar integration
POLAR_ACCESS_TOKEN=polar_sk_...        # API access token
POLAR_WEBHOOK_SECRET=whsec_...         # Webhook signature verification
POLAR_ORGANIZATION_ID=org_...          # Your Polar organization

# Environment-specific
POLAR_ENVIRONMENT=sandbox              # "sandbox" or "production"
```

### Security Event Logging for Payments

```typescript
// Log payment-related security events
const paymentSecurityEvents = [
  "checkout_initiated",
  "checkout_completed",
  "checkout_abandoned",
  "payment_succeeded",
  "payment_failed",
  "subscription_cancelled",
  "webhook_signature_invalid",
  "webhook_replay_attempted",
  "unauthorized_billing_access",
];
```

### Fraud Prevention

| Risk | Mitigation |
|------|------------|
| Checkout abuse | Rate limit checkout session creation |
| Webhook spoofing | Signature verification required |
| Replay attacks | Idempotency key checking |
| Unauthorized access | Role-based access (owner only) |
| Session hijacking | Short-lived checkout/portal URLs |
