# Milestone 6: SaaS Billing (Polar.sh)

**Status:** Next | **User Stories:** 5

## Goals

- Polar.sh subscription billing integration
- Webhook handling for subscription lifecycle
- 7-day grace period for payment failures
- Billing page with status, history, cancel
- Subscription middleware (suspend access if expired)

## User Stories

### US-040: Polar.sh Checkout Flow
- Billing page with plans: Monthly (₺299/mo), Yearly (₺2,990/yr)
- "Subscribe" → Polar checkout → redirect back
- Subscription status updates automatically
- Files: `convex/polar.ts` (action), `src/app/[slug]/billing/page.tsx`

### US-041: Webhook Handling
- POST endpoint at `/polar/webhook`
- HMAC signature validation
- Events: `checkout.completed`, `subscription.updated/cancelled`, `payment.succeeded/failed`
- Idempotent handlers (check event ID)
- Files: `convex/http.ts` (+route), `convex/subscriptions.ts`

### US-042: Subscription Status Widget
- Status card: Plan, Status, Next billing date, Price
- "Manage Subscription" → Polar portal
- Free trial shows days remaining
- Files: `src/modules/billing/components/SubscriptionStatus.tsx`

### US-043: Grace Period Management
- Payment failure → 7-day grace period
- Banner: "Payment failed. Update payment method."
- Grace expiration → status "suspended"
- Suspended orgs: billing page only (middleware redirect)
- Daily cron checks expired grace periods
- Files: `src/modules/billing/components/GracePeriodBanner.tsx`

### US-044: Billing History
- Invoice table: Date, Amount, Status, Download link
- Polar SDK `getInvoices` action
- Files: `src/modules/billing/components/BillingHistory.tsx`

### US-045: Subscription Cancellation
- Confirmation dialog with consequences
- Active until end of billing period
- Cancelled orgs cannot create new bookings

## Subscription States

```
trial → active → (payment_failed) → grace_period → suspended
                 → cancelled
```

## Environment Variables

- `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_ORGANIZATION_ID`

## Non-Goals

- Multi-tier pricing, custom billing cycles, tax calculation (Polar handles)
