# Database Schema

> **Source:** `convex/schema.ts` (~533 lines) | **Validators:** `convex/lib/validators.ts` (~910 lines)
> Auth tables (`user`, `session`, `account`, `verification`, `jwks`) managed by Better Auth at `convex/betterAuth/schema.ts`.

## ER Diagram

```mermaid
erDiagram
    organization ||--|| organizationSettings : has
    organization ||--o{ member : has
    organization ||--o{ invitation : has
    organization ||--o{ staff : has
    organization ||--o{ services : offers
    organization ||--o{ customers : serves
    organization ||--o{ appointments : manages
    member ||--o| staff : "has profile"
    staff ||--o{ appointments : handles
    staff ||--o{ scheduleOverrides : has
    staff ||--o{ timeOffRequests : requests
    services }o--|| serviceCategories : belongs_to
    customers ||--o{ appointments : books
    appointments ||--o{ appointmentServices : contains
```

## Implementation Status

| Table | Status | Milestone |
|-------|--------|-----------|
| organization, organizationSettings, member, invitation, staff | ✅ | M1 |
| serviceCategories, services | ✅ | M2A |
| scheduleOverrides, timeOffRequests, staffOvertime | ✅ | M2B |
| customers | ✅ | M2C |
| appointments, appointmentServices, slotLocks | ✅ | M3-M4 |
| auditLogs | ⚠️ Partial | Table exists, helpers pending |
| products, productCategories, inventoryTransactions | 📋 | M8+ |
| notifications | ✅ | M5 |
| productBenefits | ✅ | M6 |

## Core Tables

### `organization`
- `name: string`, `slug: string` (unique, 3-30 chars), `description?: string`, `logo?: string`
- Indexes: `slug`, `name`

### `organizationSettings`
- `organizationId: id("organization")` (1:1)
- `email?, phone?, website?, address?: {street?, city?, state?, postalCode?, country?}`
- `timezone?: string` ("Europe/Istanbul"), `currency?: string`, `locale?: string`
- `businessHours?: {monday..sunday: {open, close, closed}}`
- `bookingSettings?: {minAdvanceBookingMinutes?, maxAdvanceBookingDays?, slotDurationMinutes?, bufferBetweenBookingsMinutes?, allowOnlineBooking?, cancellationPolicyHours?}`
- `subscriptionStatus?: active|trialing|past_due|canceled|unpaid|suspended|pending_payment`
- `subscriptionPlan?, polarSubscriptionId?, polarCustomerId?, trialEndsAt?, currentPeriodEnd?, gracePeriodEndsAt?, suspendedAt?, cancelledAt?`
- Indexes: `organizationId`, `by_polar_subscription` (on `polarSubscriptionId`)

### `member`
- `organizationId, userId: string, role: owner|admin|member`
- Indexes: `organizationId`, `userId`, `organizationId_userId`
- Owner (1 per org): full access + billing. Admin: operations. Member: own schedule only.

### `invitation`
- `organizationId, email, name, role: admin|member, phone?, status: pending|accepted|expired|cancelled|rejected, invitedBy, expiresAt?`
- Indexes: `organizationId`, `email`, `organizationId_email`, `status`

### `staff`
- `userId, organizationId, memberId` (links to member for role)
- Profile: `name, email, phone?, imageUrl?, bio?`
- `status: active|inactive|pending`
- `serviceIds?: array(id("services"))` - services staff can perform
- `defaultSchedule?: {monday..sunday: {start, end, available}}`
- Indexes: `organizationId`, `userId`, `memberId`, `organizationId_userId`, `organizationId_status`, `organizationId_email`

## Services Tables

### `serviceCategories`
- `organizationId, name, description?, sortOrder`
- Index: `by_organization`

### `services`
- `organizationId, categoryId?, name, description?, duration: number` (minutes)
- `price: number` (kuruş, 15000=₺150), `priceType: fixed|starting_from|variable`
- `imageUrl?, sortOrder, isPopular, status: active|inactive, showOnline`
- Indexes: `by_organization`, `by_org_category`, `by_org_status`
- Soft-delete via status="inactive". Staff assignment via `staff.serviceIds`.

## Schedule Management Tables

### `scheduleOverrides`
- `staffId, organizationId, date: string, type: custom_hours|day_off|time_off`
- `startTime?, endTime?: string` ("09:00"), `reason?`
- Indexes: `by_staff_date`, `by_org_date`
- `time_off` type auto-created when time-off request approved.

### `timeOffRequests`
- `staffId, organizationId, startDate, endDate, type: vacation|sick|personal|other`
- `status: pending|approved|rejected, reason?, rejectionReason?, approvedBy?, reviewedAt?`
- Indexes: `by_staff`, `by_org_status`

### `staffOvertime`
- `staffId, organizationId, date, startTime, endTime: string, reason?`
- Indexes: `by_staff_date`, `by_org_date`

## Customers & Appointments Tables

### `customers`
- `organizationId, userId?: string` (if registered)
- `name, email, phone` (Turkish format, unique per org)
- `accountStatus: guest|recognized|prompted|registered`
- `preferredStaffId?, notificationPreferences: {emailReminders}`
- Stats: `totalVisits, totalSpent, lastVisitDate?, noShowCount`
- `customerNotes?, staffNotes?, tags: array(string), source: online|walk_in|phone|staff|import`
- `consents: {dataProcessing, marketing, dataProcessingAt?, marketingAt?, withdrawnAt?}`
- Indexes: `by_organization`, `by_org_email`, `by_org_phone`, `by_user`, `by_org_status`
- Search: `searchIndex("search_customers")` on name, filter by organizationId

### `appointments`
- `organizationId, customerId, staffId`
- `date: string, startTime: number` (minutes from midnight), `endTime: number`
- `status: pending|confirmed|checked_in|in_progress|completed|cancelled|no_show`
- `source: online|walk_in|phone|staff, confirmationCode: string`
- Timestamps: `confirmedAt?, checkedInAt?, completedAt?, cancelledAt?`
- Cancel: `cancelledBy?: customer|staff|system, cancellationReason?`
- Pricing: `subtotal, discount?, total`
- Reschedule: `rescheduledAt?, rescheduleCount?, rescheduleHistory?: array({from/to dates+times, rescheduledBy, rescheduledAt})`
- `noShowAt?, customerNotes?, staffNotes?`
- Indexes: `by_organization`, `by_org_date`, `by_staff_date`, `by_customer`, `by_confirmation`, `by_org_status`

### `appointmentServices`
- `appointmentId, serviceId, serviceName, duration, price, staffId`
- Index: `by_appointment`

### `slotLocks`
- `organizationId, staffId, date, startTime, endTime, sessionId, expiresAt`
- Indexes: `by_staff_date`, `by_expiry`, `by_session`
- 2-min TTL, cleaned up by cron every 1 minute.

## Billing Tables

### `productBenefits` (M6)
- `polarProductId: string`, `benefits: array(string)`
- Index: `polarProductId`
- Synced from Polar API via `polarSync.triggerSync`

## Planned Tables

### `products` / `productCategories` / `inventoryTransactions` (M8+)
Schema exists in PRD. Products with pricing, inventory tracking, supplier info.

### `auditLogs`
- `organizationId, userId, action, resourceType, resourceId?, details?, ipAddress?, timestamp`
- Table exists, helper functions pending.

## Index Usage Guide

| Query Pattern | Index |
|---------------|-------|
| Org by slug | `organization.slug` |
| Members in org | `member.organizationId` |
| User's membership | `member.organizationId_userId` |
| Staff in org | `staff.organizationId` |
| Appointments by date | `appointments.by_org_date` |
| Staff schedule | `appointments.by_staff_date` |
| Customer by phone | `customers.by_org_phone` |
| Appointment by code | `appointments.by_confirmation` |
| Subscription by Polar ID | `organizationSettings.by_polar_subscription` |
| Product benefits | `productBenefits.polarProductId` |
