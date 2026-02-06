[PRD]
# Sprint 6: SaaS Billing (Polar.sh)

## Overview

Sprint 6 integrates Polar.sh for subscription billing, enabling the SaaS business model. Includes subscription management, payment webhooks, grace period handling, and billing UI.

**Problem Statement:** The platform needs a reliable subscription billing system to monetize salon organizations while providing grace periods for payment failures.

**Solution:** Polar.sh integration with webhook handling for subscription lifecycle events, 7-day grace period for failed payments, and customer portal redirect for payment management.

## Goals

- Integrate Polar.sh for subscription billing
- Handle subscription webhooks (created, updated, cancelled)
- Implement 7-day grace period for payment failures
- Build billing page with subscription status and history
- Enforce subscription middleware (suspend access if expired)
- Provide redirect to Polar customer portal

## Quality Gates

**Backend Stories (Convex):**
- `bunx convex dev` - Type generation
- `bun run lint` - Biome linting
- All actions use proper error handling
- Webhook signature validation implemented
- Idempotent webhook handlers (duplicate events)

**Frontend Stories (React/Next.js):**
- `bun run lint` - Biome linting
- `bun run build` - Production build verification
- Manual testing: Checkout flow completes
- Manual testing: Webhook triggers subscription update

**Full-Stack Stories:**
- All backend + frontend quality gates
- Subscription creation via Polar checkout works
- Payment failure triggers grace period
- Suspended account shows billing-only access

## Dependencies

**Requires completed:**
- Sprint 1: Organizations (subscription ties to organization)
- Sprint 5: Dashboard (suspension banner)

**Provides foundation for:**
- Sprint 7: Email Notifications (payment failure emails)

## User Stories

### US-040: Polar.sh Checkout Flow

**Description:** As a salon owner, I want to subscribe to a paid plan via Polar.sh, so that I can access the platform's features.

**Complexity:** Medium

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Billing page shows available plans (Free Trial, Monthly, Yearly)
- [ ] Clicking "Subscribe" button redirects to Polar checkout page
- [ ] Polar checkout is pre-filled with organization info
- [ ] Completing checkout redirects back to app
- [ ] Subscription status updates automatically after payment
- [ ] Organization owner sees "Active" subscription badge

**Technical Notes:**
- Files to create:
  - `convex/polar.ts` - Action to generate checkout URL
  - `src/app/[slug]/billing/page.tsx` - Billing page
  - `src/modules/billing/components/PricingCards.tsx`
- Use `@polar-sh/sdk` for API calls
- Checkout URL action (Convex action, not mutation)
- Redirect URL: `{SITE_URL}/{slug}/billing?success=true`

### US-041: Webhook Handling

**Description:** As a system, I want to receive and process Polar webhooks for subscription events, so that subscription status stays synchronized.

**Complexity:** High

**Type:** Backend

**Acceptance Criteria:**
- [ ] Webhook endpoint receives POST requests from Polar
- [ ] Webhook signature is validated (HMAC)
- [ ] Event types handled: `checkout.completed`, `subscription.updated`, `subscription.cancelled`, `payment.succeeded`, `payment.failed`
- [ ] `checkout.completed` creates subscription record
- [ ] `subscription.updated` updates subscription status
- [ ] `subscription.cancelled` marks subscription as cancelled
- [ ] `payment.failed` starts grace period
- [ ] Duplicate events are idempotent (check event ID)

**Technical Notes:**
- Files to modify:
  - `convex/http.ts` - Add `/polar/webhook` route
  - `convex/subscriptions.ts` - Subscription mutations
- Webhook signature validation using Polar SDK
- Store processed event IDs to prevent duplicates
- Use `internalMutation` for webhook-triggered updates
- Database: `subscriptions` table with `organizationId` index

### US-042: Subscription Status Widget

**Description:** As a salon owner, I want to see my current subscription status and next billing date, so that I stay informed about my account.

**Complexity:** Low

**Type:** Frontend

**Acceptance Criteria:**
- [ ] Billing page shows subscription status card
- [ ] Status card displays: Plan name, Status (Active/Cancelled/Grace/Suspended), Next billing date, Monthly price
- [ ] Active subscriptions show "Manage Subscription" button (links to Polar portal)
- [ ] Cancelled subscriptions show "Resubscribe" button
- [ ] Free trial shows days remaining

**Technical Notes:**
- Files to create:
  - `src/modules/billing/components/SubscriptionStatus.tsx`
  - `convex/polar.ts` - Add `getPortalUrl` action
- Use `orgQuery` to fetch subscription
- Format dates using `date-fns`

### US-043: Grace Period Management

**Description:** As a salon owner, I want a 7-day grace period after payment failure, so that I have time to update my payment method without immediate suspension.

**Complexity:** Medium

**Type:** Backend + Frontend

**Acceptance Criteria:**
- [ ] Payment failure webhook starts grace period (7 days)
- [ ] During grace period, banner shows: "Payment failed. Update payment method to avoid suspension."
- [ ] Banner shows days remaining in grace period
- [ ] Grace period expiration updates subscription status to "suspended"
- [ ] Suspended organizations can only access billing page
- [ ] Reminder notifications sent on Day 1, 3, 5, 7 (Sprint 7)

**Technical Notes:**
- Files to create:
  - `convex/subscriptions.ts` - Add `gracePeriodEndDate` field
  - `src/modules/billing/components/GracePeriodBanner.tsx`
  - `src/middleware.ts` - Add subscription check
- Grace period: 7 days (604,800,000ms)
- Cron job: Daily check for expired grace periods
- Middleware: Redirect suspended orgs to `/[slug]/billing`

### US-044: Billing History

**Description:** As a salon owner, I want to view my past invoices and payment history, so that I can track my subscription expenses.

**Complexity:** Low

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Billing page shows table of past invoices
- [ ] Each row shows: Date, Amount, Status (Paid/Failed), Download link
- [ ] Download link redirects to Polar invoice PDF
- [ ] Table is sorted by date (newest first)
- [ ] Empty state shows "No invoices yet"

**Technical Notes:**
- Files to create:
  - `src/modules/billing/components/BillingHistory.tsx`
  - `convex/polar.ts` - Add `getInvoices` action
- Use Polar SDK to fetch invoices
- Cache invoice list (refresh every 24 hours)

### US-045: Subscription Cancellation

**Description:** As a salon owner, I want to cancel my subscription, so that I can stop future billing.

**Complexity:** Low

**Type:** Full-Stack

**Acceptance Criteria:**
- [ ] Billing page shows "Cancel Subscription" button (active subs only)
- [ ] Clicking shows confirmation dialog with consequences
- [ ] Confirming sends cancellation request to Polar
- [ ] Subscription remains active until end of billing period
- [ ] After period ends, subscription status becomes "cancelled"
- [ ] Cancelled organizations cannot create new bookings

**Technical Notes:**
- Files to create:
  - `src/modules/billing/components/CancelDialog.tsx`
  - `convex/polar.ts` - Add `cancelSubscription` action
- Use Polar SDK `subscriptions.cancel` method
- Webhook handles actual cancellation event

## Functional Requirements

- FR-6.1: Free trial duration: 14 days
- FR-6.2: Grace period duration: 7 days
- FR-6.3: Suspended organizations can access billing page only
- FR-6.4: Subscription plans: Monthly (₺299/mo), Yearly (₺2,990/yr, save 17%)
- FR-6.5: Webhook signature validation required for all events
- FR-6.6: Duplicate webhook events must be idempotent

## Non-Goals (Out of Scope)

- Multi-tier pricing (Pro, Enterprise) - Single tier for MVP
- Custom billing cycles - Monthly/Yearly only
- Prorated charges - Polar handles
- Multiple payment methods - Polar manages
- Tax calculation - Polar handles
- Invoicing customization - Use Polar defaults

## Technical Considerations

### Webhook Security
- Validate webhook signature using Polar secret
- Store processed event IDs (deduplicate)
- Return 200 OK for all events (even if duplicate)

### Subscription States
```
trial → active → (payment_failed) → grace_period → suspended
                 → cancelled
```

### Middleware Logic
```typescript
if (subscription.status === 'suspended') {
  if (pathname !== '/[slug]/billing') {
    redirect('/[slug]/billing')
  }
}
```

### Environment Variables
- `POLAR_ACCESS_TOKEN` - Polar API key
- `POLAR_WEBHOOK_SECRET` - Webhook signature validation
- `POLAR_ORGANIZATION_ID` - Polar seller org ID

## Success Metrics

- [ ] Checkout completion rate >80%
- [ ] Webhook processing latency <2 seconds
- [ ] Zero missed webhook events
- [ ] Grace period reminder open rate >50% (Sprint 7)

## Implementation Order

1. **Polar SDK Setup** (1 hour): Install SDK, configure environment variables
2. **Checkout Flow** (2 hours): Generate checkout URL action, billing page
3. **Webhook Handler** (3 hours): HTTP route, signature validation, event processing
4. **Subscription Mutations** (2 hours): Create, update, cancel subscriptions
5. **Billing UI** (3 hours): Status widget, history table, cancel dialog
6. **Grace Period** (2 hours): Banner, middleware, cron job
7. **Testing** (2 hours): End-to-end checkout, webhook simulation

## Open Questions

- **Q:** Should we support custom pricing for specific customers?
  - **A:** Not for MVP. Use Polar's pricing override feature if needed (manual).

- **Q:** What happens to existing appointments after suspension?
  - **A:** Existing appointments remain valid. Only new bookings are blocked.

- **Q:** Should we allow downgrade from yearly to monthly?
  - **A:** No, Polar doesn't support mid-cycle plan changes. Cancel and resubscribe.

[/PRD]
