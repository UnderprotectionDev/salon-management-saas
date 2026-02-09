# Milestone 6: SaaS Billing (Polar.sh)

**Status:** ✅ Complete | **User Stories:** 5

## Goals

- Polar.sh subscription billing integration
- Webhook handling for subscription lifecycle
- 7-day grace period for payment failures
- Billing page with status, plans, cancel
- Subscription middleware (suspend access if expired)

## Implementation Summary

### Backend Files

| File | Lines | Description |
|------|-------|-------------|
| `convex/polar.ts` | ~119 | Polar client setup, `generateCheckoutLink` action with email validation, env var validation |
| `convex/polarSync.ts` | ~123 | Product sync (authenticated `triggerSync` action), benefits fetch, `getProductBenefits` query |
| `convex/subscriptions.ts` | ~200 | `getSubscriptionStatus`, `isSuspended`, `cancelSubscription` (ownerMutation), `updateFromWebhook`, `checkGracePeriods`, `checkTrialExpirations` |
| `convex/subscriptions_helpers.ts` | ~42 | Internal queries: `findOwnerMember`, `findByPolarSubscriptionId` (indexed) |
| `convex/http.ts` | ~85 | Polar webhook routes: `onSubscriptionCreated`, `onSubscriptionUpdated` |
| `convex/crons.ts` | +2 jobs | `checkGracePeriods` (hourly), `checkTrialExpirations` (hourly) |

### Frontend Files

| File | Description |
|------|-------------|
| `src/app/[slug]/(authenticated)/billing/page.tsx` | Billing page: subscription status, plan selection, sync, cancel |
| `src/modules/billing/components/SubscriptionWidget.tsx` | Status card: Plan, Status, Next billing date |
| `src/modules/billing/components/PlanCard.tsx` | Plan display with Polar `CheckoutLink` |
| `src/modules/billing/components/CancelSubscriptionDialog.tsx` | Confirmation dialog with toast feedback |
| `src/modules/billing/components/CustomerPortalButton.tsx` | Link to Polar customer portal |
| `src/modules/billing/components/GracePeriodBanner.tsx` | Warning banner for payment failures |
| `src/modules/billing/components/SuspendedOverlay.tsx` | Full-screen overlay blocking suspended orgs |
| `src/app/onboarding/page.tsx` | Step 4: Plan selection (PlanCard components) |

### Schema Changes

- `organizationSettings`: Added `subscriptionStatus`, `subscriptionPlan`, `polarSubscriptionId`, `polarCustomerId`, `trialEndsAt`, `currentPeriodEnd`, `gracePeriodEndsAt`, `suspendedAt`, `cancelledAt`
- `organizationSettings`: Added `by_polar_subscription` index on `polarSubscriptionId`
- `organization.status`: Added `"suspended"` and `"pending_payment"` values
- `productBenefits`: New table with `polarProductId` index

## User Stories

### US-040: Polar.sh Checkout Flow ✅
- Billing page with plans fetched from Polar API (dynamic pricing)
- "Subscribe" → Polar checkout via `CheckoutLink` component → redirect back
- Custom `generateCheckoutLink` action handles customer creation/lookup
- Email validation prevents `"undefined"` being sent to Polar API
- Env var validation fails fast on missing `POLAR_ORGANIZATION_TOKEN`
- Files: `convex/polar.ts`, `src/app/[slug]/(authenticated)/billing/page.tsx`, `src/modules/billing/components/PlanCard.tsx`

### US-041: Webhook Handling ✅
- Polar SDK registers webhook routes via `polar.registerRoutes(http, {...})`
- `onSubscriptionCreated`: Maps customer metadata → org owner → updates subscription status
- `onSubscriptionUpdated`: Finds org by `polarSubscriptionId` (indexed query) → updates status
- Status mapping: `canceledAt` forces `"canceled"` status regardless of Polar status
- Files: `convex/http.ts`, `convex/subscriptions.ts`, `convex/subscriptions_helpers.ts`

### US-042: Subscription Status Widget ✅
- Status card: Plan name, Status badge, Next billing date, Price
- "Manage Subscription" → Polar customer portal
- Files: `src/modules/billing/components/SubscriptionWidget.tsx`, `src/modules/billing/components/CustomerPortalButton.tsx`

### US-043: Grace Period Management ✅
- Payment failure → 7-day grace period (set by webhook)
- `GracePeriodBanner`: "Payment failed. Update payment method." with days remaining
- Grace expiration → status `"suspended"` (checked by hourly cron)
- `SuspendedOverlay`: Full-screen block with "Go to Billing" link (guards for undefined org)
- Booking blocked for suspended/canceled/pending_payment orgs
- Hourly crons: `checkGracePeriods`, `checkTrialExpirations`
- Files: `src/modules/billing/components/GracePeriodBanner.tsx`, `src/modules/billing/components/SuspendedOverlay.tsx`, `convex/crons.ts`

### US-044: Billing History (Deferred)
- Not implemented in this milestone — Polar customer portal provides invoice access via `CustomerPortalButton`

### US-045: Subscription Cancellation ✅
- `CancelSubscriptionDialog`: Confirmation with consequences explanation
- Prevents premature dialog close during async mutation (`e.preventDefault()`)
- Toast feedback on success/error (sonner)
- Active until end of billing period
- Cancelled orgs cannot create new bookings (enforced in `appointments.create` / `createByStaff`)
- Rate limit: `cancelSubscription` (3/hour)
- Files: `src/modules/billing/components/CancelSubscriptionDialog.tsx`, `convex/subscriptions.ts`

## Subscription States

```
pending_payment → active → (payment_failed) → grace_period → suspended
                         → canceled
```

- New orgs start as `pending_payment` (no trial)
- `SuspendedOverlay` blocks both `"suspended"` and `"pending_payment"` with different messages

## Environment Variables

- `POLAR_ORGANIZATION_TOKEN` — Polar API access token (validated, fails fast if missing)
- `POLAR_WEBHOOK_SECRET` — Webhook signature verification
- `POLAR_SERVER` — `"sandbox"` or `"production"` (defaults to `"production"`)
- `POLAR_PRODUCT_MONTHLY_ID` — Monthly plan product ID
- `POLAR_PRODUCT_YEARLY_ID` — Yearly plan product ID

## Non-Goals

- Multi-tier pricing, custom billing cycles, tax calculation (Polar handles)
- Billing history table (customer portal provides this)
- Free trial (orgs start as `pending_payment`)
