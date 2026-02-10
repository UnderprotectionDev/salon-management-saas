# API Reference

> **All functions use custom wrappers** from `convex/lib/functions.ts`. All have `returns:` validators.
> **Validators:** `convex/lib/validators.ts` (~910 lines)

## Custom Function Wrappers

| Wrapper | Auth | Context | Use Case |
|---------|------|---------|----------|
| `publicQuery/Mutation` | None | — | Public data, booking |
| `maybeAuthedQuery` | Optional | `ctx.user \| null` | Authed/unauthed |
| `authedQuery/Mutation` | Required | `ctx.user` | User-scoped |
| `orgQuery/Mutation` | Required + membership | `ctx.user, organizationId, member, staff` | Org-scoped |
| `adminQuery/Mutation` | Required + admin/owner | Same + role check | Staff mgmt, settings |
| `ownerQuery/Mutation` | Required + owner only | Same + owner check | Billing, deletion |

`orgQuery`/`orgMutation` auto-inject `organizationId` from args. ErrorCode enum for structured errors.

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
| `staff.update` | adminMutation | `staffId, name?, phone?, bio?, defaultSchedule?` | `id("staff")` |
| `staff.listPublicActive` | publicQuery | `organizationId` | `array({_id, name, imageUrl?, bio?, serviceIds?})` |
| `staff.getResolvedSchedule` | orgQuery | `staffId, startDate, endDate` | `array({date, available, effectiveStart, effectiveEnd, overtimeWindows, overrideType, isTimeOff})` |
| `invitations.create` | adminMutation | `email, name, role, serviceIds?` | `id("invitation")` |
| `invitations.accept` | authedMutation | `token` | `{organizationId, organizationSlug}` |
| `members.updateRole` | ownerMutation | `memberId, role` | `{success}` |

## Service Catalog

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `serviceCategories.list` | orgQuery | `{}` | `array(categoryWithCount)` |
| `serviceCategories.create` | adminMutation | `name, description?` | `id("serviceCategories")` |
| `serviceCategories.update` | adminMutation | `categoryId, name?, description?` | `id("serviceCategories")` |
| `serviceCategories.remove` | adminMutation | `categoryId` | `null` |
| `services.list` | orgQuery | `categoryId?, status?` | `array(serviceWithCategory)` |
| `services.get` | orgQuery | `serviceId` | `serviceWithCategory \| null` |
| `services.create` | adminMutation | `name, description?, duration, bufferTime?, price, priceType, categoryId?` | `id("services")` |
| `services.update` | adminMutation | `serviceId, name?, duration?, price?, priceType?, categoryId?, isPopular?, showOnline?, status?` | `id("services")` |
| `services.remove` | adminMutation | `serviceId` | `null` (soft-delete) |
| `services.assignStaff` | adminMutation | `serviceId, staffId, assign: boolean` | `null` |
| `services.listPublic` | publicQuery | `organizationId` | `array({_id, name, description?, duration, price, priceType, imageUrl?, isPopular, categoryName?})` |
| `services.getStaffForService` | orgQuery | `serviceId` | `array({_id, name, imageUrl?, assigned})` |

## Booking & Appointments

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `slots.available` | publicQuery | `organizationId, date, serviceIds, staffId?, sessionId?` | `array({staffId, staffName, staffImageUrl?, startTime, endTime})` |
| `slotLocks.acquire` | publicMutation | `organizationId, staffId, date, startTime, endTime, sessionId` | `{lockId, expiresAt}` |
| `slotLocks.release` | publicMutation | `lockId, sessionId` | `null` |
| `appointments.create` | publicMutation | `organizationId, staffId, date, startTime, endTime, serviceIds, customer: {name, phone, email?, notes?}, sessionId, source?` | `{appointmentId, confirmationCode, customerId}` |
| `appointments.createByStaff` | orgMutation | `staffId, date, startTime, serviceIds, customerId, source: walk_in\|phone\|staff, customerNotes?, staffNotes?` | `{appointmentId, confirmationCode}` |
| `appointments.list` | orgQuery | `statusFilter?` | `array(appointmentWithDetails)` |
| `appointments.get` | orgQuery | `appointmentId` | `appointmentWithDetails \| null` |
| `appointments.getByDate` | orgQuery | `date, staffId?` | `array(appointmentWithDetails)` |
| `appointments.getByConfirmationCode` | publicQuery | `organizationId, confirmationCode` | `publicAppointment \| null` |
| `appointments.listForCurrentUser` | authedQuery | `{}` | `array(userAppointment)` |
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
| `customers.create` | orgMutation | `name, phone, email?, preferredStaffId?, customerNotes?, staffNotes?, tags?, source?` | `id("customers")` |
| `customers.update` | orgMutation | `customerId, name?, email?, phone?, preferredStaffId?, customerNotes?, staffNotes?, tags?` | `customerDoc` |
| `customers.remove` | adminMutation | `customerId` | `null` (hard delete) |
| `customers.advancedSearch` | orgQuery | `query?, accountStatus?, source?, totalVisits/Spent/NoShow min/max?, tags?, lastVisitDays?` | `{customers, totalCount}` |
| `customers.merge` | adminMutation | `primaryCustomerId, duplicateCustomerId` | `{success}` |
| `customers.linkToCurrentUser` | authedMutation | `customerId` | `{success}` |
| `customers.searchByPhone` | orgQuery | `phonePrefix` | `array(customerListItem)` |

## Schedule & Time-Off

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `scheduleOverrides.listByStaff` | orgQuery | `staffId, startDate?, endDate?` | `array(scheduleOverrideDoc)` |
| `scheduleOverrides.listByDate` | orgQuery | `date` | `array(scheduleOverrideDoc)` |
| `scheduleOverrides.create` | orgMutation | `staffId, date, type, startTime?, endTime?, reason?` | `id("scheduleOverrides")` |
| `scheduleOverrides.remove` | orgMutation | `overrideId` | `null` |
| `timeOffRequests.listByOrg` | orgQuery | `status?` | `array(timeOffWithStaff)` |
| `timeOffRequests.getMyRequests` | orgQuery | `{}` | `array(timeOffRequestDoc)` |
| `timeOffRequests.getPendingCount` | orgQuery | `{}` | `number` |
| `timeOffRequests.request` | orgMutation | `startDate, endDate, type, reason?` | `id("timeOffRequests")` |
| `timeOffRequests.approve` | adminMutation | `requestId` | `id("timeOffRequests")` |
| `timeOffRequests.reject` | adminMutation | `requestId, rejectionReason?` | `id("timeOffRequests")` |
| `timeOffRequests.cancel` | orgMutation | `requestId` | `null` (deletes record) |
| `staffOvertime.listByStaff` | orgQuery | `staffId, startDate?, endDate?` | `array(staffOvertimeDoc)` |
| `staffOvertime.listByDate` | orgQuery | `date` | `array(staffOvertimeDoc)` |
| `staffOvertime.create` | orgMutation | `staffId, date, startTime, endTime, reason?` | `id("staffOvertime")` |
| `staffOvertime.remove` | orgMutation | `overtimeId` | `null` |

## File Storage

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `files.generateUploadUrl` | mutation | `{}` | `string` (upload URL) |
| `files.saveOrganizationLogo` | adminMutation | `storageId, fileName, fileType, fileSize` | `string` (CDN URL) |
| `files.saveStaffImage` | authedMutation | `staffId, storageId, fileName, fileType, fileSize` | `string` (CDN URL) |
| `files.saveServiceImage` | adminMutation | `serviceId, storageId, fileName, fileType, fileSize` | `string` (CDN URL) |

Upload flow: `generateUploadUrl()` → `fetch(url, {method: "POST", body: file})` → `save*({storageId, ...})`

## SaaS Billing (Polar.sh)

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `subscriptions.getSubscriptionStatus` | orgQuery | `{}` | `{status, plan?, currentPeriodEnd?, gracePeriodEndsAt?, cancelledAt?}` |
| `subscriptions.isSuspended` | orgQuery | `{}` | `boolean` |
| `subscriptions.cancelSubscription` | ownerMutation | `{}` | `null` |
| `polar.generateCheckoutLink` | action | `productIds, origin, successUrl, subscriptionId?` | `{url}` |
| `polarSync.triggerSync` | action (auth required) | `{}` | — |
| `polarSync.getProductBenefits` | query | `{}` | `array({polarProductId, benefits})` |

Webhook routes registered in `convex/http.ts` via `polar.registerRoutes()`:
- `onSubscriptionCreated`: Maps Polar customer → org owner → activates subscription
- `onSubscriptionUpdated`: Finds org by `polarSubscriptionId` (indexed) → syncs status

## Reports & Analytics

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `analytics.getDashboardStats` | orgQuery | `date` | `dashboardStats` |
| `reports.getRevenueReport` | adminQuery | `startDate, endDate` | `revenueReport` (totalRevenue, expectedRevenue, completionRate, cancellationRate, statusBreakdown, daily[], byService[], byStaff[]) |
| `reports.getStaffPerformanceReport` | adminQuery | `startDate, endDate` | `staffPerformanceReport` (staff[]: appointments, completed, noShows, revenue, utilization%) |
| `reports.getCustomerReport` | adminQuery | `startDate, endDate` | `customerReport` (totalActive, newInPeriod, retentionRate, monthly[], topCustomers[]) |

## Notifications

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `notifications.list` | orgQuery | `limit?` | `array(notificationDoc)` |
| `notifications.getUnreadCount` | orgQuery | `{}` | `number` |
| `notifications.markAsRead` | orgMutation | `notificationId` | `null` |
| `notifications.markAllAsRead` | orgMutation | `{}` | `null` |

## Email Notifications (Internal)

| Function | Type | Trigger | Description |
|----------|------|---------|-------------|
| `email.sendBookingConfirmation` | internalAction | appointment create | Sends confirmation with ICS attachment |
| `email.send24HourReminder` | internalAction | daily cron | Sends reminder for tomorrow's appointments |
| `email.sendCancellationEmail` | internalAction | appointment cancel | Sends cancellation notice |
| `email.sendInvitationEmail` | internalAction | invitation create/resend | Sends staff invitation link |

All email actions use retry (3 attempts, exponential backoff). Triggered via `ctx.scheduler.runAfter(0)`.

## Rate Limits

| Operation | Limit | Key |
|-----------|-------|-----|
| `createInvitation` | 20/day | org |
| `resendInvitation` | 3/hour | invitation |
| `createOrganization` | 3/day | user |
| `addMember` | 10/hour | org |
| `createService` | 20/hour | org |
| `createBooking` | 10/hour | org |
| `cancelBooking` | 5/hour | org |
| `rescheduleBooking` | 3/hour | org |
| `createScheduleOverride` | 30/day | org |
| `createTimeOffRequest` | 5/day | staff |
| `createOvertime` | 10/day | staff |
| `createCustomer` | 30/hour | org |
| `cancelSubscription` | 3/hour | org |
| `aiPhotoAnalysis` | 5/hour | customer |
| `aiSimulation` | 3/hour | customer |
| `aiChat` | 30/hour | customer |
| `aiForecast` | 5/day | org |
| `aiCreditPurchase` | 5/hour | customer/org |

## Scheduled Jobs

| Job | Interval | Function |
|-----|----------|----------|
| Cleanup expired slot locks | 1 minute | `slotLocks.cleanupExpired` |
| Cleanup old notifications | 1 hour | `notifications.cleanupOld` |
| Send appointment reminders | 5 minutes | `notifications.sendReminders` |
| Check grace periods | 1 hour | `subscriptions.checkGracePeriods` |
| Check trial expirations | 1 hour | `subscriptions.checkTrialExpirations` |
| Send 24-hour email reminders | Daily (09:00 UTC) | `email.send24HourRemindersDaily` |
| Cleanup expired AI forecasts | 6 hours | `aiForecasts.cleanupExpired` |
| Check care schedules & notify | Weekly | `aiCareSchedules.checkAndNotify` |

## AI — Credits

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `aiCredits.getBalance` | orgQuery / publicQuery | `customerId?` | `{balance, updatedAt}` |
| `aiCredits.purchaseCredits` | publicMutation / ownerMutation | `package: 50\|200\|500, customerId?` | `{transactionId, newBalance}` |
| `aiCredits.getTransactions` | orgQuery / publicQuery | `customerId?, limit?, referenceType?` | `array(aiCreditTransactionDoc)` |
| `aiCredits.deductCredits` | internalMutation | `creditId, amount, referenceType, referenceId?, description?` | `{transactionId, newBalance}` |

- Customer credit functions use `publicQuery`/`publicMutation` (customer identified via auth)
- Organization credit functions use `orgQuery`/`ownerMutation`
- `deductCredits` is internal-only — called by AI action functions, never directly by clients

## AI — Customer Features

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `aiAnalysis.create` | publicMutation | `organizationId, imageStorageId` | `{analysisId}` |
| `aiAnalysis.get` | publicQuery | `analysisId` | `aiAnalysisDoc \| null` |
| `aiAnalysis.listHistory` | publicQuery | `organizationId, customerId?` | `array(aiAnalysisDoc)` |
| `aiSimulations.create` | publicMutation | `organizationId, imageStorageId, prompt` | `{simulationId}` |
| `aiSimulations.get` | publicQuery | `simulationId` | `aiSimulationDoc \| null` |
| `aiChat.createThread` | publicMutation | `organizationId, title?` | `{threadId}` |
| `aiChat.listThreads` | publicQuery | `organizationId` | `array(aiChatThreadDoc)` |
| `aiChat.getMessages` | publicQuery | `threadId` | `array(aiChatMessageDoc)` |
| `aiMoodBoard.save` | publicMutation | `organizationId, imageStorageId, note?, source` | `{success}` |
| `aiMoodBoard.list` | publicQuery | `organizationId` | `aiMoodBoardDoc \| null` |
| `aiMoodBoard.remove` | publicMutation | `organizationId, itemIndex` | `{success}` |

- All customer AI functions require auth (customer identified via `ctx.user`)
- Photo analysis and simulation create records with `status: pending`, then schedule action
- Real-time status updates via Convex reactivity (`useQuery` on `get` function)

## AI — Organization Features

| Function | Wrapper | Args | Returns |
|----------|---------|------|---------|
| `aiForecasts.generate` | adminMutation | `type: weekly\|monthly` | `{forecastId}` |
| `aiForecasts.get` | adminQuery | `type: weekly\|monthly` | `aiForecastDoc \| null` |
| `aiCareSchedules.generate` | orgMutation | `customerId` | `{scheduleId}` |
| `aiCareSchedules.get` | orgQuery | `customerId` | `aiCareScheduleDoc \| null` |

## AI — Actions (External API)

| Function | Type | Description |
|----------|------|-------------|
| `aiActions.analyzePhoto` | internalAction | AI Gateway vision call (GPT-4o) → structured analysis result |
| `aiActions.generateSimulation` | internalAction | fal.ai call → generated image stored in Convex file storage |
| `aiActions.generateForecast` | internalAction | AI Gateway text call (Gemini Flash) → structured predictions |
| `aiActions.generateCareSchedule` | internalAction | AI Gateway text call → personalized care recommendations |
| `aiActions.generatePostVisitContent` | internalAction | AI Gateway text call → personalized follow-up email content |

All actions use `"use node"` runtime. Triggered via `ctx.scheduler.runAfter(0)` from mutations. Chat streaming handled separately via Next.js API route (`src/app/api/ai/chat/route.ts`).

## Validators Summary

**Sub-validators:** memberRole, invitationRole/Status, staffStatus, subscriptionStatus, servicePriceType/Status, appointmentStatus/Source, cancelledBy, paymentStatus, customerAccountStatus/Source, address, businessHours, bookingSettings, staffSchedule, notificationType

**Doc validators:** organizationDoc, memberDoc, invitationDoc, staffDoc, serviceCategoryDoc, serviceDoc, scheduleOverrideDoc, timeOffRequestDoc, staffOvertimeDoc, customerDoc, customerListItem, appointmentDoc, appointmentServiceDoc, slotLockDoc, notificationDoc

**Composite validators:** organizationWithRole, invitationWithOrg, serviceWithCategory, serviceCategoryWithCount, timeOffRequestWithStaff, customerWithStaff, availableSlot, publicAppointment, userAppointment, appointmentWithDetails, dashboardStats

**Report validators:** statusBreakdown, revenueReport (with dailyRevenue, revenueByService, revenueByStaff sub-validators), staffPerformanceReport (with staffPerformance sub-validator), customerReport (with monthlyNewVsReturning, topCustomer sub-validators)

**AI validators:** aiCreditDoc, aiCreditTransactionDoc, aiAnalysisDoc, aiSimulationDoc, aiChatThreadDoc, aiChatMessageDoc, aiForecastDoc, aiCareScheduleDoc, aiMoodBoardDoc, aiAnalysisResult (structured output), aiForecastPrediction, aiForecastInsight, aiCareRecommendation
