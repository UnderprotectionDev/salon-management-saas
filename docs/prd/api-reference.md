# API Reference

> **All functions use custom wrappers** from `convex/lib/functions.ts` (see CLAUDE.md → Convex Custom Function Wrappers).
> **Validators:** `convex/lib/validators.ts` (~910 lines). All functions have `returns:` validators.

---

## Authentication

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `users.getCurrentUser` | authedQuery | `{}` | `{userId, email, name, imageUrl?} \| null` |

## Organizations

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `organizations.getBySlug` | publicQuery | `slug` | `organizationDoc \| null` |
| `organizations.create` | authedMutation | `name, slug, description?` | `{organizationId, memberId}` |
| `organizations.update` | ownerMutation | `name?, description?, phone?, email?, address?, businessHours?, bookingSettings?` | `{success}` |
| `organizations.listPublic` | publicQuery | `{}` | `array({_id, name, slug, logo?, description?})` |
| `organizations.listMine` | authedQuery | `{}` | `array(organizationWithRole)` |

## Staff Management

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `staff.list` | orgQuery | `status?` | `array(staffDoc)` |
| `staff.get` | orgQuery | `staffId` | `staffDoc \| null` |
| `staff.update` | ownerMutation | `staffId, name?, phone?, bio?, defaultSchedule?` | `id("staff")` |
| `staff.listPublicActive` | publicQuery | `organizationId` | `array({_id, name, imageUrl?, bio?, serviceIds?})` |
| `staff.getResolvedSchedule` | orgQuery | `staffId, startDate, endDate` | `array(resolvedScheduleDay)` |
| `invitations.create` | ownerMutation | `email, name, role, serviceIds?` | `id("invitation")` |
| `invitations.accept` | authedMutation | `token` | `{organizationId, organizationSlug}` |
| `members.updateRole` | ownerMutation | `memberId, role` | `{success}` |

## Service Catalog

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `serviceCategories.list` | orgQuery | `{}` | `array(categoryWithCount)` |
| `serviceCategories.create/update/remove` | ownerMutation | `name, description?` / `categoryId, ...` | `id \| null` |
| `services.list` | orgQuery | `categoryId?, status?` | `array(serviceWithCategory)` |
| `services.get` | orgQuery | `serviceId` | `serviceWithCategory \| null` |
| `services.create` | ownerMutation | `name, duration, price, priceType, categoryId?, ...` | `id("services")` |
| `services.update` | ownerMutation | `serviceId, ...` | `id("services")` |
| `services.remove` | ownerMutation | `serviceId` | `null` (soft-delete) |
| `services.permanentDelete` | ownerMutation | `serviceId` | `null` (blocked if appointments exist) |
| `services.assignStaff` | ownerMutation | `serviceId, staffId, assign` | `null` |
| `services.listPublic` | publicQuery | `organizationId` | `array(publicService)` |

## Booking & Appointments

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `slots.available` | publicQuery | `organizationId, date, serviceIds, staffId?, sessionId?` | `array(availableSlot)` |
| `slotLocks.acquire` | publicMutation | `organizationId, staffId, date, startTime, endTime, sessionId` | `{lockId, expiresAt}` |
| `slotLocks.release` | publicMutation | `lockId, sessionId` | `null` |
| `appointments.create` | publicMutation | `organizationId, staffId, date, startTime, endTime, serviceIds, customer, sessionId` | `{appointmentId, confirmationCode, customerId}` |
| `appointments.createByStaff` | orgMutation | `staffId, date, startTime, serviceIds, customerId, source` | `{appointmentId, confirmationCode}` |
| `appointments.list` | orgQuery | `statusFilter?, startDate?, endDate?` | `array(appointmentWithDetails)` |
| `appointments.get` | orgQuery | `appointmentId` | `appointmentWithDetails \| null` |
| `appointments.getByDate` | orgQuery | `date, staffId?` | `array(appointmentWithDetails)` |
| `appointments.getByConfirmationCode` | publicQuery | `organizationId, confirmationCode` | `publicAppointment \| null` |
| `appointments.updateStatus` | orgMutation | `appointmentId, status` | `{success}` |
| `appointments.cancel` | orgMutation | `appointmentId, reason?, cancelledBy` | `{success}` |
| `appointments.cancelByCustomer` | publicMutation | `organizationId, confirmationCode, phone, reason?` | `{success}` |
| `appointments.reschedule` | orgMutation | `appointmentId, newDate, newStartTime, newEndTime, newStaffId?` | `{success}` |
| `appointments.rescheduleByCustomer` | publicMutation | `organizationId, confirmationCode, phone, newDate, newStartTime, newEndTime, sessionId` | `{success}` |

## Customer Management

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `customers.list` | orgQuery | `search?, accountStatus?` | `array(customerListItem)` |
| `customers.get` | orgQuery | `customerId` | `customerWithStaff \| null` |
| `customers.create` | orgMutation | `name, phone, email?, ...` | `id("customers")` |
| `customers.update` | orgMutation | `customerId, ...` | `customerDoc` |
| `customers.remove` | ownerMutation | `customerId` | `null` (hard delete) |
| `customers.advancedSearch` | orgQuery | `query?, filters...` | `{customers, totalCount}` |
| `customers.merge` | ownerMutation | `primaryCustomerId, duplicateCustomerId` | `{success}` |
| `customers.searchByPhone` | orgQuery | `phonePrefix` | `array(customerListItem)` |

## Schedule & Time-Off

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `scheduleOverrides.listByStaff/listByDate/create/remove` | orgQuery/Mutation | varies | varies |
| `timeOffRequests.listByOrg/getMyRequests/getPendingCount/request` | orgQuery/Mutation | varies | varies |
| `timeOffRequests.approve/reject` | ownerMutation | `requestId, rejectionReason?` | `id` |
| `staffOvertime.listByStaff/listByDate/create/remove` | orgQuery/Mutation | varies | varies |

## File Storage

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `files.generateUploadUrl` | authedMutation | `{}` | `string` |
| `files.getFileUrls` | authedQuery | `storageIds[]` | `(string \| null)[]` |
| `files.saveOrganizationLogo` | ownerMutation | `storageId, fileName, fileType, fileSize` | `string` (URL) |
| `files.saveProductImages` | ownerMutation | `productId, storageIds[], ...` | `array(string)` (max 4) |

Upload flow: `generateUploadUrl()` → `fetch(url, {method: "POST", body: file})` → `save*({storageId, ...})`

## SaaS Billing (Polar.sh)

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `subscriptions.getSubscriptionStatus` | orgQuery | `{}` | subscription status object |
| `subscriptions.isSuspended` | orgQuery | `{}` | `boolean` |
| `subscriptions.cancelSubscription` | ownerMutation | `reason?, comment?` | `null` |
| `subscriptions.reactivateSubscription` | ownerMutation | `{}` | `null` |
| `polarActions.generateCheckoutLink` | action | `productIds, origin, successUrl` | `{url}` |
| `polarActions.getBillingHistory` | action | `{}` | `array(billingEntry)` |

Webhook: `onSubscriptionCreated` (maps customer → org), `onSubscriptionUpdated` (syncs status).
State transitions: active → canceling → canceled; canceling → active (reactivate).

## Products & Inventory

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `productCategories.list/create/update/remove` | ownerQuery/Mutation | varies | varies |
| `products.list` | ownerQuery | `categoryId?, status?` | `array(productDoc)` |
| `products.create/update` | ownerMutation | product fields | `id("products")` |
| `products.remove` | ownerMutation | `productId` | `null` (soft-delete) |
| `products.adjustStock` | ownerMutation | `productId, quantity, type, note?` | `id("inventoryTransactions")` |
| `products.getInventoryStats` | ownerQuery | `{}` | inventory stats object |
| `products.listPublic` | publicQuery | `organizationId` | `array(productPublic)` (no cost/supplier) |

## Reports & Analytics

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `analytics.getDashboardStats` | orgQuery | `date` | `dashboardStats` |
| `reports.getRevenueReport` | ownerQuery | `startDate, endDate` | `revenueReport` |
| `reports.getStaffPerformanceReport` | ownerQuery | `startDate, endDate` | `staffPerformanceReport` |
| `reports.getCustomerReport` | ownerQuery | `startDate, endDate` | `customerReport` |

## Notifications

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `notifications.list` | orgQuery | `limit?` | `array(notificationDoc)` |
| `notifications.getUnreadCount` | orgQuery | `{}` | `number` |
| `notifications.markAsRead/markAllAsRead` | orgMutation | `notificationId?` | `null` |

## SuperAdmin

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `admin.checkIsSuperAdmin` | authedQuery | `{}` | `boolean` |
| `admin.getPlatformStats` | superAdminQuery | `{}` | platform stats |
| `admin.listAllOrganizations` | superAdminQuery | `status?, limit?, cursor?` | `{organizations[], nextCursor?}` |
| `admin.suspendOrganization` | superAdminMutation | `organizationId, reason?` | `{success}` |
| `admin.deleteOrganization` | superAdminMutation | `organizationId, reason?` | `{success}` (cascading) |
| `admin.listAllUsers` | superAdminQuery | `banned?, limit?, cursor?` | `{users[], nextCursor?}` |
| `admin.banUser/unbanUser` | superAdminMutation | `userId, reason?` | `{success}` |

## Email Notifications (Internal)

| Function | Type | Trigger |
|----------|------|---------|
| `email.sendBookingConfirmation` | internalAction | appointment create |
| `email.sendCancellationEmail` | internalAction | appointment cancel |
| `email.sendInvitationEmail` | internalAction | invitation create/resend |

All use retry (3 attempts, exponential backoff). Triggered via `ctx.scheduler.runAfter(0)`.

## Rate Limits

| Operation | Limit | Key |
|-----------|-------|-----|
| `createInvitation` | 20/day | org |
| `resendInvitation` | 3/hour | invitation |
| `createOrganization` | 3/day | user |
| `addMember` | 10/hour | org |
| `createService` | 20/hour | org |
| `createBooking` | 10/hour | org |
| `cancelBooking` | 3/hour | user |
| `rescheduleBooking` | 3/hour | org |
| `createScheduleOverride` | 30/day | org |
| `createTimeOffRequest` | 5/day | staff |
| `createOvertime` | 10/day | staff |
| `createCustomer` | 30/hour | org |
| `cancelSubscription` | 3/hour | org |
| `aiPhotoAnalysis` | 5/hour | customer |
| `aiVirtualTryOn` | 3/hour | customer |
| `aiCreditPurchase` | 5/hour | customer/org |

## Scheduled Jobs

See CLAUDE.md → Scheduled Jobs (Crons) for the full table.

## AI Functions

See [Milestone 10](../milestones/milestone-10-ai-features.md) for AI function specifications.

## Validators Summary

**Sub-validators:** memberRole, invitationRole/Status, staffStatus, subscriptionStatus, servicePriceType/Status, appointmentStatus/Source, cancelledBy, customerAccountStatus/Source, notificationType

**Doc validators:** organizationDoc, memberDoc, invitationDoc, staffDoc, serviceDoc, customerDoc, appointmentDoc, notificationDoc, productDoc, inventoryTransactionDoc

**Composite validators:** organizationWithRole, serviceWithCategory, appointmentWithDetails, publicAppointment, dashboardStats, revenueReport, staffPerformanceReport, customerReport, productPublic

**AI validators:** aiCreditDoc, aiCreditTransactionDoc, aiAnalysisDoc, aiSimulationDoc, aiCareScheduleDoc, aiMoodBoardDoc
