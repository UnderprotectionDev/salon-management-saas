import { v } from "convex/values";

// =============================================================================
// Sub-Validators (reusable building blocks)
// =============================================================================

/** Member role: owner | admin | member */
export const memberRoleValidator = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("member"),
);

/** Invitation role: admin | member (no owner invitations) */
export const invitationRoleValidator = v.union(
  v.literal("admin"),
  v.literal("member"),
);

/** Invitation status: pending | accepted | expired | cancelled | rejected */
export const invitationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("expired"),
  v.literal("cancelled"),
  v.literal("rejected"),
);

/** Staff status: active | inactive | pending */
export const staffStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("pending"),
);

/** Subscription status */
export const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("trialing"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("unpaid"),
);

/** Address object */
export const addressValidator = v.optional(
  v.object({
    street: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
  }),
);

/** Single business hours day entry */
export const businessHoursDayValidator = v.optional(
  v.object({
    open: v.string(),
    close: v.string(),
    closed: v.boolean(),
  }),
);

/** Full weekly business hours */
export const businessHoursValidator = v.optional(
  v.object({
    monday: businessHoursDayValidator,
    tuesday: businessHoursDayValidator,
    wednesday: businessHoursDayValidator,
    thursday: businessHoursDayValidator,
    friday: businessHoursDayValidator,
    saturday: businessHoursDayValidator,
    sunday: businessHoursDayValidator,
  }),
);

/** Booking settings object */
export const bookingSettingsValidator = v.optional(
  v.object({
    minAdvanceBookingMinutes: v.optional(v.number()),
    maxAdvanceBookingDays: v.optional(v.number()),
    slotDurationMinutes: v.optional(v.number()),
    bufferBetweenBookingsMinutes: v.optional(v.number()),
    allowOnlineBooking: v.optional(v.boolean()),
    requireDeposit: v.optional(v.boolean()),
    depositAmount: v.optional(v.number()),
    cancellationPolicyHours: v.optional(v.number()),
  }),
);

/** Single staff day schedule entry */
export const staffDayScheduleValidator = v.optional(
  v.object({
    start: v.string(),
    end: v.string(),
    available: v.boolean(),
  }),
);

/** Full weekly staff schedule */
export const staffScheduleValidator = v.optional(
  v.object({
    monday: staffDayScheduleValidator,
    tuesday: staffDayScheduleValidator,
    wednesday: staffDayScheduleValidator,
    thursday: staffDayScheduleValidator,
    friday: staffDayScheduleValidator,
    saturday: staffDayScheduleValidator,
    sunday: staffDayScheduleValidator,
  }),
);

// =============================================================================
// Document Validators (with system fields: _id, _creationTime)
// =============================================================================

/** Organization document validator */
export const organizationDocValidator = v.object({
  _id: v.id("organization"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  logo: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** Member document validator */
export const memberDocValidator = v.object({
  _id: v.id("member"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  userId: v.string(),
  role: memberRoleValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** Invitation document validator */
export const invitationDocValidator = v.object({
  _id: v.id("invitation"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  email: v.string(),
  name: v.string(),
  role: invitationRoleValidator,
  phone: v.optional(v.string()),
  status: invitationStatusValidator,
  invitedBy: v.string(),
  expiresAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** Organization settings document validator */
export const organizationSettingsDocValidator = v.object({
  _id: v.id("organizationSettings"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  website: v.optional(v.string()),
  address: addressValidator,
  timezone: v.optional(v.string()),
  currency: v.optional(v.string()),
  locale: v.optional(v.string()),
  businessHours: businessHoursValidator,
  bookingSettings: bookingSettingsValidator,
  subscriptionStatus: v.optional(subscriptionStatusValidator),
  subscriptionPlan: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** Staff document validator */
export const staffDocValidator = v.object({
  _id: v.id("staff"),
  _creationTime: v.number(),
  userId: v.string(),
  organizationId: v.id("organization"),
  memberId: v.id("member"),
  name: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  bio: v.optional(v.string()),
  status: staffStatusValidator,
  serviceIds: v.optional(v.array(v.id("services"))),
  defaultSchedule: staffScheduleValidator,
  createdAt: v.number(),
  updatedAt: v.number(),
});

// =============================================================================
// Composite Validators (enriched return types)
// =============================================================================

/** Organization with role and memberId (for listForUser) */
export const organizationWithRoleValidator = v.object({
  _id: v.id("organization"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  logo: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  role: memberRoleValidator,
  memberId: v.id("member"),
});

/** Service price type: fixed | starting_from | variable */
export const servicePriceTypeValidator = v.union(
  v.literal("fixed"),
  v.literal("starting_from"),
  v.literal("variable"),
);

/** Service status: active | inactive */
export const serviceStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
);

/** Service category document validator */
export const serviceCategoryDocValidator = v.object({
  _id: v.id("serviceCategories"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  name: v.string(),
  description: v.optional(v.string()),
  sortOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
});

/** Service document validator */
export const serviceDocValidator = v.object({
  _id: v.id("services"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  categoryId: v.optional(v.id("serviceCategories")),
  name: v.string(),
  description: v.optional(v.string()),
  duration: v.number(),
  bufferTime: v.optional(v.number()),
  price: v.number(),
  priceType: servicePriceTypeValidator,
  imageUrl: v.optional(v.string()),
  sortOrder: v.number(),
  isPopular: v.boolean(),
  status: serviceStatusValidator,
  showOnline: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** Service with category name (enriched query result) */
export const serviceWithCategoryValidator = v.object({
  _id: v.id("services"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  categoryId: v.optional(v.id("serviceCategories")),
  name: v.string(),
  description: v.optional(v.string()),
  duration: v.number(),
  bufferTime: v.optional(v.number()),
  price: v.number(),
  priceType: servicePriceTypeValidator,
  imageUrl: v.optional(v.string()),
  sortOrder: v.number(),
  isPopular: v.boolean(),
  status: serviceStatusValidator,
  showOnline: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  categoryName: v.optional(v.string()),
});

/** Service category with service count */
export const serviceCategoryWithCountValidator = v.object({
  _id: v.id("serviceCategories"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  name: v.string(),
  description: v.optional(v.string()),
  sortOrder: v.number(),
  createdAt: v.number(),
  serviceCount: v.number(),
});

// =============================================================================
// Schedule Override Validators
// =============================================================================

/** Schedule override type: custom_hours | day_off | time_off */
export const scheduleOverrideTypeValidator = v.union(
  v.literal("custom_hours"),
  v.literal("day_off"),
  v.literal("time_off"),
);

/** Schedule override document validator */
export const scheduleOverrideDocValidator = v.object({
  _id: v.id("scheduleOverrides"),
  _creationTime: v.number(),
  staffId: v.id("staff"),
  organizationId: v.id("organization"),
  date: v.string(),
  type: scheduleOverrideTypeValidator,
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  reason: v.optional(v.string()),
  createdAt: v.number(),
});

// =============================================================================
// Time-Off Request Validators
// =============================================================================

/** Time-off type: vacation | sick | personal | other */
export const timeOffTypeValidator = v.union(
  v.literal("vacation"),
  v.literal("sick"),
  v.literal("personal"),
  v.literal("other"),
);

/** Time-off status: pending | approved | rejected */
export const timeOffStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

/** Time-off request document validator */
export const timeOffRequestDocValidator = v.object({
  _id: v.id("timeOffRequests"),
  _creationTime: v.number(),
  staffId: v.id("staff"),
  organizationId: v.id("organization"),
  startDate: v.string(),
  endDate: v.string(),
  type: timeOffTypeValidator,
  status: timeOffStatusValidator,
  reason: v.optional(v.string()),
  rejectionReason: v.optional(v.string()),
  approvedBy: v.optional(v.id("staff")),
  reviewedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** Time-off request with staff name (enriched for admin panel) */
export const timeOffRequestWithStaffValidator = v.object({
  _id: v.id("timeOffRequests"),
  _creationTime: v.number(),
  staffId: v.id("staff"),
  organizationId: v.id("organization"),
  startDate: v.string(),
  endDate: v.string(),
  type: timeOffTypeValidator,
  status: timeOffStatusValidator,
  reason: v.optional(v.string()),
  rejectionReason: v.optional(v.string()),
  approvedBy: v.optional(v.id("staff")),
  reviewedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
  staffName: v.string(),
  approvedByName: v.optional(v.string()),
});

// =============================================================================
// Staff Overtime Validators
// =============================================================================

/** Staff overtime document validator */
export const staffOvertimeDocValidator = v.object({
  _id: v.id("staffOvertime"),
  _creationTime: v.number(),
  staffId: v.id("staff"),
  organizationId: v.id("organization"),
  date: v.string(),
  startTime: v.string(),
  endTime: v.string(),
  reason: v.optional(v.string()),
  createdAt: v.number(),
});

// =============================================================================
// Customer Validators
// =============================================================================

/** Customer account status: guest | recognized | prompted | registered */
export const customerAccountStatusValidator = v.union(
  v.literal("guest"),
  v.literal("recognized"),
  v.literal("prompted"),
  v.literal("registered"),
);

/** Customer source: online | walk_in | phone | staff | import */
export const customerSourceValidator = v.union(
  v.literal("online"),
  v.literal("walk_in"),
  v.literal("phone"),
  v.literal("staff"),
  v.literal("import"),
);

/** Customer notification preferences */
export const customerNotificationPreferencesValidator = v.object({
  emailReminders: v.boolean(),
  smsReminders: v.boolean(),
});

/** Customer KVKK consent */
export const customerConsentsValidator = v.object({
  dataProcessing: v.boolean(),
  marketing: v.boolean(),
  dataProcessingAt: v.optional(v.number()),
  marketingAt: v.optional(v.number()),
  withdrawnAt: v.optional(v.number()),
});

/** Customer document validator */
export const customerDocValidator = v.object({
  _id: v.id("customers"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  userId: v.optional(v.string()),
  name: v.string(),
  email: v.optional(v.string()),
  phone: v.string(),
  phoneVerified: v.optional(v.boolean()),
  accountStatus: v.optional(customerAccountStatusValidator),
  preferredStaffId: v.optional(v.id("staff")),
  notificationPreferences: v.optional(customerNotificationPreferencesValidator),
  totalVisits: v.optional(v.number()),
  totalSpent: v.optional(v.number()),
  lastVisitDate: v.optional(v.string()),
  noShowCount: v.optional(v.number()),
  customerNotes: v.optional(v.string()),
  staffNotes: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  source: v.optional(customerSourceValidator),
  consents: v.optional(customerConsentsValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/** Customer list item (lightweight for table display) */
export const customerListItemValidator = v.object({
  _id: v.id("customers"),
  _creationTime: v.number(),
  name: v.string(),
  email: v.optional(v.string()),
  phone: v.string(),
  accountStatus: v.optional(customerAccountStatusValidator),
  totalVisits: v.optional(v.number()),
  totalSpent: v.optional(v.number()),
  lastVisitDate: v.optional(v.string()),
  noShowCount: v.optional(v.number()),
  tags: v.optional(v.array(v.string())),
  source: v.optional(customerSourceValidator),
  createdAt: v.number(),
});

/** Customer with preferred staff (enriched for detail page) */
export const customerWithStaffValidator = v.object({
  _id: v.id("customers"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  userId: v.optional(v.string()),
  name: v.string(),
  email: v.optional(v.string()),
  phone: v.string(),
  phoneVerified: v.optional(v.boolean()),
  accountStatus: v.optional(customerAccountStatusValidator),
  preferredStaffId: v.optional(v.id("staff")),
  preferredStaffName: v.optional(v.string()),
  notificationPreferences: v.optional(customerNotificationPreferencesValidator),
  totalVisits: v.optional(v.number()),
  totalSpent: v.optional(v.number()),
  lastVisitDate: v.optional(v.string()),
  noShowCount: v.optional(v.number()),
  customerNotes: v.optional(v.string()),
  staffNotes: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  source: v.optional(customerSourceValidator),
  consents: v.optional(customerConsentsValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// =============================================================================
// Invitation Composite Validators
// =============================================================================

/** Invitation with organization info (for getPendingForCurrentUser) */
export const invitationWithOrgValidator = v.object({
  _id: v.id("invitation"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  email: v.string(),
  name: v.string(),
  role: invitationRoleValidator,
  phone: v.optional(v.string()),
  status: invitationStatusValidator,
  invitedBy: v.string(),
  expiresAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
  organizationName: v.string(),
  organizationSlug: v.string(),
});
