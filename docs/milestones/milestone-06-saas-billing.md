# Milestone 6: SaaS Billing (Polar.sh)

**Status:** ✅ Complete | **User Stories:** 5

## Goals

- Polar.sh subscription billing integration
- Webhook handling for subscription lifecycle
- 7-day grace period for payment failures
- Billing page with status, plans, cancel, reactivate, plan change, billing history
- Subscription middleware (suspend access if expired)

## Implementation Summary

### Backend Files

| File | Lines | Description |
|------|-------|-------------|
| `convex/polar.ts` | ~32 | Polar client setup, exports `cancelCurrentSubscription`, `changeCurrentSubscription`, `generateCustomerPortalUrl`, `getConfiguredProducts`, `listAllProducts` |
| `convex/polarActions.ts` | ~295 | Custom actions: `generateCheckoutLink`, `generateCustomerPortalUrl`, `cancelInPolar` (cancelAtPeriodEnd + reason), `reactivateInPolar` (uncancel), `getBillingHistory` (Customer Portal API) |
| `convex/polarSync.ts` | ~123 | Product sync (super-admin only `triggerSync` action), benefits fetch, `getProductBenefits` query |
| `convex/subscriptions.ts` | ~256 | `getSubscriptionStatus`, `isSuspended`, `cancelSubscription` (sets "canceling"), `reactivateSubscription` (undoes cancellation), `updateFromWebhook`, `checkGracePeriods`, `checkTrialExpirations` |
| `convex/subscriptions_helpers.ts` | ~94 | Internal queries: `findOwnerMember`, `findByPolarSubscriptionId` (returns only needed fields) |
| `convex/http.ts` | ~195 | Polar webhook routes: `onSubscriptionCreated`, `onSubscriptionUpdated` with `mapPolarStatus(status, canceledAt, endedAt)` |
| `convex/crons.ts` | +2 jobs | `checkGracePeriods` (hourly), `checkTrialExpirations` (hourly) |

### Frontend Files

| File | Description |
|------|-------------|
| `src/app/[slug]/(authenticated)/billing/page.tsx` | Billing page: subscription status, plan selection, plan switching, canceling banner, sync, cancel, billing history |
| `src/modules/billing/components/SubscriptionWidget.tsx` | Status card: Plan, Status badge (including "Canceling"), Next billing date |
| `src/modules/billing/components/PlanCard.tsx` | Plan display with checkout, plan change (changeSubscription + AlertDialog), reactivate button |
| `src/modules/billing/components/CancelSubscriptionDialog.tsx` | Cancellation with reason survey (dropdown + comment), toast feedback |
| `src/modules/billing/components/BillingHistory.tsx` | Order history table fetched from Polar Customer Portal API |
| `src/modules/billing/components/CustomerPortalButton.tsx` | Link to Polar customer portal with ConvexError handling |
| `src/modules/billing/components/GracePeriodBanner.tsx` | Warning banner for payment failures (uses shared hook) |
| `src/modules/billing/components/SuspendedOverlay.tsx` | Accessible full-screen overlay (role=alertdialog, focus trap, aria attributes) |
| `src/modules/billing/hooks/useSubscriptionStatus.ts` | Shared hook for subscription status (prevents duplicate queries) |
| `src/modules/billing/index.ts` | Barrel exports |

### Schema Changes

- `organizationSettings.subscriptionStatus`: Added `"canceling"` to status union (8 total: active, trialing, past_due, canceling, canceled, unpaid, suspended, pending_payment)
- `organizationSettings`: Added `cancellationReason?: string`, `cancellationComment?: string`
- `organizationSettings`: Added `subscriptionPlan?, polarSubscriptionId?, polarCustomerId?, trialEndsAt?, currentPeriodEnd?, gracePeriodEndsAt?, suspendedAt?, cancelledAt?`
- `organizationSettings`: Added `by_polar_subscription` index on `polarSubscriptionId`, `by_subscription_status` index on `subscriptionStatus`
- `productBenefits`: New table with `polarProductId` index

## User Stories

### US-040: Polar.sh Checkout Flow ✅
- Billing page with plans fetched from Polar API (dynamic pricing)
- "Subscribe" → Polar checkout via `generateCheckoutLink` action → redirect back
- Custom `generateCheckoutLink` action handles customer creation/lookup with email validation
- Env var validation fails fast on missing `POLAR_ORGANIZATION_TOKEN`
- Owner-only gate: staff members see disabled checkout buttons
- Files: `convex/polarActions.ts`, `src/app/[slug]/(authenticated)/billing/page.tsx`, `src/modules/billing/components/PlanCard.tsx`

### US-041: Webhook Handling ✅
- Polar SDK registers webhook routes via `polar.registerRoutes(http, {...})`
- `onSubscriptionCreated`: Maps customer metadata → org owner → updates subscription status
- `onSubscriptionUpdated`: Finds org by `polarSubscriptionId` (indexed query) → updates status
- Status mapping via `mapPolarStatus(status, canceledAt, endedAt)`:
  - `endedAt` set → `"canceled"` (subscription truly ended)
  - `canceledAt` set but `endedAt` null → `"canceling"` (pending cancellation, still active)
  - Otherwise → maps Polar status directly
- When status becomes `"active"`, clears: `gracePeriodEndsAt`, `suspendedAt`, `cancelledAt`, `cancellationReason`, `cancellationComment`
- Files: `convex/http.ts`, `convex/subscriptions.ts`, `convex/subscriptions_helpers.ts`

### US-042: Subscription Status Widget ✅
- Status card: Plan name, Status badge (Active/Canceling/Canceled/etc.), Next billing date
- Canceling state shows amber warning banner: "Your subscription is scheduled to cancel..."
- "Manage Subscription" → Polar customer portal
- Shared `useSubscriptionStatus` hook prevents duplicate queries across components
- Files: `src/modules/billing/components/SubscriptionWidget.tsx`, `src/modules/billing/components/CustomerPortalButton.tsx`, `src/modules/billing/hooks/useSubscriptionStatus.ts`

### US-043: Grace Period Management ✅
- Payment failure → 7-day grace period (set by webhook)
- `GracePeriodBanner`: "Payment failed. Update payment method." with days remaining
- Grace expiration → status `"suspended"` (checked by hourly cron)
- `SuspendedOverlay`: Accessible full-screen block with `role="alertdialog"`, focus trap, `aria-modal`, `aria-labelledby/describedby`
- Booking blocked for suspended/canceled/pending_payment orgs
- Hourly crons: `checkGracePeriods` (`.take(1000)` bounded), `checkTrialExpirations`
- Files: `src/modules/billing/components/GracePeriodBanner.tsx`, `src/modules/billing/components/SuspendedOverlay.tsx`, `convex/crons.ts`

### US-044: Billing History ✅
- Fetched from Polar Customer Portal API (`customerPortalOrdersList`) using customer session token
- Uses `customerSessionsCreate` to get session token, then queries orders — no org-level `orders:read` scope required
- Table display: Date, Product name, Billing reason (New Subscription/Renewal/Plan Change), Amount (tr-TR format), Status badge
- Empty state: "No billing history yet. Invoices will appear here after your first payment."
- Files: `convex/polarActions.ts` (`getBillingHistory`), `src/modules/billing/components/BillingHistory.tsx`

### US-045: Subscription Management ✅

**Cancellation:**
- `CancelSubscriptionDialog`: Reason survey (8 options from Polar's `CustomerCancellationReason` enum) + free-text comment
- Sets local status to `"canceling"` (not `"canceled"`) — subscription stays active on Polar until period end
- Schedules `cancelInPolar` action: sends `subscriptionsUpdate` with `cancelAtPeriodEnd: true` + reason/comment to Polar API
- Rate limited: 3/hour per org
- `cancellationReason` and `cancellationComment` stored in `organizationSettings`

**Reactivation (undo cancellation):**
- When status is `"canceling"`, current plan card shows "Reactivate Plan" button
- `reactivateSubscription` mutation: sets status back to `"active"`, clears cancellation fields
- Schedules `reactivateInPolar` action: sends `subscriptionsUpdate` with `cancelAtPeriodEnd: false` to Polar API
- Rate limited: shares `cancelSubscription` rate limit (3/hour)

**Plan Change (upgrade/downgrade):**
- When user has active subscription, plan cards show "Switch to {Plan}" button
- Confirmation `AlertDialog` shows target plan name, price, interval, and proration notice
- Uses `@convex-dev/polar`'s `changeCurrentSubscription` action which calls `subscriptionsUpdate` with new `productId`
- Polar handles proration automatically; DB update comes via `subscription.updated` webhook
- Works during `"canceling"` state too (switching plans also undoes the cancellation)

Files: `src/modules/billing/components/CancelSubscriptionDialog.tsx`, `src/modules/billing/components/PlanCard.tsx`, `convex/subscriptions.ts`, `convex/polarActions.ts`, `convex/polar.ts`

## Subscription States

```
pending_payment → active → (payment_failed) → past_due → grace_period → suspended
                        ↘ canceling ──────────────→ canceled (period ends)
                             ↓ reactivate              ↓
                             → active              (new checkout possible)
                             ↓ plan change
                             → active (new plan, via webhook)
```

- New orgs start as `pending_payment` (no trial)
- `"canceling"` = cancelAtPeriodEnd requested, subscription still active on Polar, user can reactivate or switch plans
- `"canceled"` = subscription has actually ended (endedAt set), user must create new checkout
- `SuspendedOverlay` blocks both `"suspended"` and `"pending_payment"` with different messages

## Bug Fixes Applied

| # | Issue | Fix |
|---|-------|-----|
| A1 | `onSubscriptionCreated` hardcoded `"active"` | Uses `mapPolarStatus()` |
| A2 | 5 functions missing `returns:` validators | Added validators to all |
| A3 | `triggerSync` accessible to any authenticated user | Super-admin only check |
| A4 | No `ConvexError` handling in frontend | Added to PlanCard, CustomerPortalButton, billing page |
| A5 | `en-US` locale in date/currency formatting | Changed to `tr-TR` |
| A6 | `SuspendedOverlay` no accessibility | Added role, aria attributes, focus trap |
| A7 | Staff could initiate checkout | Owner-only gate via `isOwner` prop |
| A8 | Unbounded `.collect()` in cron queries | Changed to `.take(1000)` |
| A9 | Duplicate subscription status queries | Shared `useSubscriptionStatus` hook |

## Environment Variables

- `POLAR_ORGANIZATION_TOKEN` — Polar API access token (validated, fails fast if missing)
- `POLAR_WEBHOOK_SECRET` — Webhook signature verification
- `POLAR_SERVER` — `"sandbox"` or `"production"` (defaults to `"production"`)
- `POLAR_PRODUCT_MONTHLY_ID` — Monthly plan product ID
- `POLAR_PRODUCT_YEARLY_ID` — Yearly plan product ID

## Non-Goals

- Multi-tier pricing, custom billing cycles, tax calculation (Polar handles)
- Free trial (orgs start as `pending_payment`)
- Invoice PDF generation (Polar customer portal provides this)
