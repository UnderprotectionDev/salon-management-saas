# API Reference

> **All functions use custom wrappers** from `convex/lib/functions.ts`. All have `returns:` validators.
> **Validators:** `convex/lib/validators.ts` (~730 lines)

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

## Scheduled Jobs

| Job | Interval | Function |
|-----|----------|----------|
| Cleanup expired slot locks | 1 minute | `slotLocks.cleanupExpired` |
| Send appointment reminders | Planned (M7) | `schedulers.sendScheduledReminders` |
| Check grace periods | Planned (M6) | `schedulers.checkGracePeriods` |

## Validators Summary

**Sub-validators:** memberRole, invitationRole/Status, staffStatus, subscriptionStatus, servicePriceType/Status, appointmentStatus/Source, cancelledBy, paymentStatus, customerAccountStatus/Source, address, businessHours, bookingSettings, staffSchedule

**Doc validators:** organizationDoc, memberDoc, invitationDoc, staffDoc, serviceCategoryDoc, serviceDoc, scheduleOverrideDoc, timeOffRequestDoc, staffOvertimeDoc, customerDoc, customerListItem, appointmentDoc, appointmentServiceDoc, slotLockDoc

**Composite validators:** organizationWithRole, invitationWithOrg, serviceWithCategory, serviceCategoryWithCount, timeOffRequestWithStaff, customerWithStaff, availableSlot, publicAppointment, userAppointment, appointmentWithDetails
