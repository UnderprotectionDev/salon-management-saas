import { v } from "convex/values";
import { literals, withSystemFields } from "convex-helpers/validators";

// =============================================================================
// Enum Validators (all defined first — used by field objects below)
// =============================================================================

/** Member role: owner | staff */
export const memberRoleValidator = literals("owner", "staff");

/** Invitation role: always staff (no owner invitations) */
export const invitationRoleValidator = v.literal("staff");

/** Invitation status: pending | accepted | expired | cancelled | rejected */
export const invitationStatusValidator = literals(
  "pending",
  "accepted",
  "expired",
  "cancelled",
  "rejected",
);

/** Staff status: active | inactive | pending */
export const staffStatusValidator = literals("active", "inactive", "pending");

/** Subscription status */
export const subscriptionStatusValidator = literals(
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "suspended",
  "pending_payment",
);

/** Service price type: fixed | starting_from | variable */
export const servicePriceTypeValidator = literals(
  "fixed",
  "starting_from",
  "variable",
);

/** Service status: active | inactive */
export const serviceStatusValidator = literals("active", "inactive");

/** Schedule override type: custom_hours | day_off | time_off */
export const scheduleOverrideTypeValidator = literals(
  "custom_hours",
  "day_off",
  "time_off",
);

/** Time-off type: vacation | sick | personal | other */
export const timeOffTypeValidator = literals(
  "vacation",
  "sick",
  "personal",
  "other",
);

/** Time-off status: pending | approved | rejected */
export const timeOffStatusValidator = literals(
  "pending",
  "approved",
  "rejected",
);

/** Customer account status: guest | recognized | prompted | registered */
export const customerAccountStatusValidator = literals(
  "guest",
  "recognized",
  "prompted",
  "registered",
);

/** Customer source: online | walk_in | phone | staff | import */
export const customerSourceValidator = literals(
  "online",
  "walk_in",
  "phone",
  "staff",
  "import",
);

/** Appointment status */
export const appointmentStatusValidator = literals(
  "pending",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
);

/** Appointment source */
export const appointmentSourceValidator = literals(
  "online",
  "walk_in",
  "phone",
  "staff",
);

/** Cancelled by: customer | staff | system */
export const cancelledByValidator = literals("customer", "staff", "system");

/** Payment status */
export const paymentStatusValidator = literals(
  "pending",
  "paid",
  "partial",
  "refunded",
);

/** Notification type */
export const notificationTypeValidator = literals(
  "new_booking",
  "cancellation",
  "reminder_30min",
  "reschedule",
  "no_show",
  "status_change",
);

// =============================================================================
// Complex Sub-Validators (nested objects)
// =============================================================================

/** Subscription detail (for billing page) */
export const subscriptionDetailValidator = v.object({
  status: subscriptionStatusValidator,
  plan: v.optional(v.string()),
  polarSubscriptionId: v.optional(v.string()),
  trialEndsAt: v.optional(v.number()),
  currentPeriodEnd: v.optional(v.number()),
  gracePeriodEndsAt: v.optional(v.number()),
  suspendedAt: v.optional(v.number()),
  cancelledAt: v.optional(v.number()),
});

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

/** Weekly schedule days (shared between business hours and staff) */
const weekDays = {
  monday: businessHoursDayValidator,
  tuesday: businessHoursDayValidator,
  wednesday: businessHoursDayValidator,
  thursday: businessHoursDayValidator,
  friday: businessHoursDayValidator,
  saturday: businessHoursDayValidator,
  sunday: businessHoursDayValidator,
} as const;

/** Full weekly business hours */
export const businessHoursValidator = v.optional(v.object(weekDays));

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
const staffWeekDays = {
  monday: staffDayScheduleValidator,
  tuesday: staffDayScheduleValidator,
  wednesday: staffDayScheduleValidator,
  thursday: staffDayScheduleValidator,
  friday: staffDayScheduleValidator,
  saturday: staffDayScheduleValidator,
  sunday: staffDayScheduleValidator,
} as const;

export const staffScheduleValidator = v.optional(v.object(staffWeekDays));

/** Reschedule history entry */
export const rescheduleHistoryEntryValidator = v.object({
  fromDate: v.string(),
  fromStartTime: v.number(),
  fromEndTime: v.number(),
  toDate: v.string(),
  toStartTime: v.number(),
  toEndTime: v.number(),
  rescheduledBy: literals("customer", "staff"),
  rescheduledAt: v.number(),
});

/** Reusable service item (used in appointment service arrays) */
const serviceItemWithId = v.object({
  serviceId: v.id("services"),
  serviceName: v.string(),
  duration: v.number(),
  price: v.number(),
});

/** Reusable service item without ID (for user-facing views) */
const serviceItemNoId = v.object({
  serviceName: v.string(),
  duration: v.number(),
  price: v.number(),
});

// =============================================================================
// Shared Field Objects (reused across doc + composite validators)
// =============================================================================

const organizationFields = {
  name: v.string(),
  slug: v.string(),
  description: v.optional(v.string()),
  logo: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
};

const invitationFields = {
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
};

const serviceCategoryFields = {
  organizationId: v.id("organization"),
  name: v.string(),
  description: v.optional(v.string()),
  sortOrder: v.number(),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
};

const serviceFields = {
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
};

const timeOffRequestFields = {
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
};

const customerFields = {
  organizationId: v.id("organization"),
  userId: v.optional(v.string()),
  name: v.string(),
  email: v.optional(v.string()),
  phone: v.string(),
  phoneVerified: v.optional(v.boolean()),
  accountStatus: v.optional(customerAccountStatusValidator),
  preferredStaffId: v.optional(v.id("staff")),
  totalVisits: v.optional(v.number()),
  totalSpent: v.optional(v.number()),
  lastVisitDate: v.optional(v.string()),
  noShowCount: v.optional(v.number()),
  customerNotes: v.optional(v.string()),
  staffNotes: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  source: v.optional(customerSourceValidator),
  createdAt: v.number(),
  updatedAt: v.number(),
};

const appointmentCoreFields = {
  organizationId: v.id("organization"),
  customerId: v.id("customers"),
  staffId: v.id("staff"),
  date: v.string(),
  startTime: v.number(),
  endTime: v.number(),
  status: appointmentStatusValidator,
  source: appointmentSourceValidator,
  confirmationCode: v.string(),
  confirmedAt: v.optional(v.number()),
  checkedInAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  noShowAt: v.optional(v.number()),
  cancelledAt: v.optional(v.number()),
  cancelledBy: v.optional(cancelledByValidator),
  cancellationReason: v.optional(v.string()),
  subtotal: v.number(),
  discount: v.optional(v.number()),
  total: v.number(),
  paymentStatus: v.optional(paymentStatusValidator),
  paymentMethod: v.optional(v.string()),
  paidAt: v.optional(v.number()),
  customerNotes: v.optional(v.string()),
  staffNotes: v.optional(v.string()),
  reminderSentAt: v.optional(v.number()),
  confirmationSentAt: v.optional(v.number()),
  rescheduledAt: v.optional(v.number()),
  rescheduleCount: v.optional(v.number()),
  rescheduleHistory: v.optional(v.array(rescheduleHistoryEntryValidator)),
  createdAt: v.number(),
  updatedAt: v.number(),
};

// =============================================================================
// Document Validators (with system fields: _id, _creationTime)
// =============================================================================

/** Organization document validator */
export const organizationDocValidator = v.object(
  withSystemFields("organization", organizationFields),
);

/** Member document validator */
export const memberDocValidator = v.object(
  withSystemFields("member", {
    organizationId: v.id("organization"),
    userId: v.string(),
    role: memberRoleValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
);

/** Invitation document validator */
export const invitationDocValidator = v.object(
  withSystemFields("invitation", invitationFields),
);

/** Organization settings document validator */
export const organizationSettingsDocValidator = v.object(
  withSystemFields("organizationSettings", {
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
    polarSubscriptionId: v.optional(v.string()),
    polarCustomerId: v.optional(v.string()),
    trialEndsAt: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    gracePeriodEndsAt: v.optional(v.number()),
    suspendedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
);

/** Staff document validator */
export const staffDocValidator = v.object(
  withSystemFields("staff", {
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
  }),
);

/** Service category document validator */
export const serviceCategoryDocValidator = v.object(
  withSystemFields("serviceCategories", serviceCategoryFields),
);

/** Service document validator */
export const serviceDocValidator = v.object(
  withSystemFields("services", serviceFields),
);

/** Schedule override document validator */
export const scheduleOverrideDocValidator = v.object(
  withSystemFields("scheduleOverrides", {
    staffId: v.id("staff"),
    organizationId: v.id("organization"),
    date: v.string(),
    type: scheduleOverrideTypeValidator,
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  }),
);

/** Time-off request document validator */
export const timeOffRequestDocValidator = v.object(
  withSystemFields("timeOffRequests", timeOffRequestFields),
);

/** Staff overtime document validator */
export const staffOvertimeDocValidator = v.object(
  withSystemFields("staffOvertime", {
    staffId: v.id("staff"),
    organizationId: v.id("organization"),
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  }),
);

/** Customer document validator */
export const customerDocValidator = v.object(
  withSystemFields("customers", customerFields),
);

/** Appointment document validator */
export const appointmentDocValidator = v.object(
  withSystemFields("appointments", appointmentCoreFields),
);

/** Appointment service (junction) document validator */
export const appointmentServiceDocValidator = v.object(
  withSystemFields("appointmentServices", {
    appointmentId: v.id("appointments"),
    serviceId: v.id("services"),
    serviceName: v.string(),
    duration: v.number(),
    price: v.number(),
    staffId: v.id("staff"),
  }),
);

/** Slot lock document validator */
export const slotLockDocValidator = v.object(
  withSystemFields("slotLocks", {
    organizationId: v.id("organization"),
    staffId: v.id("staff"),
    date: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    sessionId: v.string(),
    expiresAt: v.number(),
  }),
);

/** Notification document validator */
export const notificationDocValidator = v.object(
  withSystemFields("notifications", {
    organizationId: v.id("organization"),
    recipientStaffId: v.id("staff"),
    type: notificationTypeValidator,
    title: v.string(),
    message: v.string(),
    appointmentId: v.optional(v.id("appointments")),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  }),
);

/** Product benefits document validator */
export const productBenefitsDocValidator = v.object(
  withSystemFields("productBenefits", {
    polarProductId: v.string(),
    benefits: v.array(v.string()),
  }),
);

// =============================================================================
// Composite Validators (enriched return types)
// =============================================================================

/** Organization with role and memberId (for listForUser) */
export const organizationWithRoleValidator = v.object(
  withSystemFields("organization", {
    ...organizationFields,
    role: memberRoleValidator,
    memberId: v.id("member"),
  }),
);

/** Service with category name (enriched query result) */
export const serviceWithCategoryValidator = v.object(
  withSystemFields("services", {
    ...serviceFields,
    categoryName: v.optional(v.string()),
  }),
);

/** Service category with service count */
export const serviceCategoryWithCountValidator = v.object(
  withSystemFields("serviceCategories", {
    ...serviceCategoryFields,
    serviceCount: v.number(),
  }),
);

/** Time-off request with staff name (enriched for admin panel) */
export const timeOffRequestWithStaffValidator = v.object(
  withSystemFields("timeOffRequests", {
    ...timeOffRequestFields,
    staffName: v.string(),
    approvedByName: v.optional(v.string()),
  }),
);

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

/** Customer search result (lightweight for phone autocomplete) */
export const customerSearchResultValidator = v.object({
  _id: v.id("customers"),
  name: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
});

/** Customer with preferred staff (enriched for detail page) */
export const customerWithStaffValidator = v.object(
  withSystemFields("customers", {
    ...customerFields,
    preferredStaffName: v.optional(v.string()),
  }),
);

/** Invitation with organization info (for getPendingForCurrentUser) */
export const invitationWithOrgValidator = v.object(
  withSystemFields("invitation", {
    ...invitationFields,
    organizationName: v.string(),
    organizationSlug: v.string(),
  }),
);

/** Available slot for booking UI */
export const availableSlotValidator = v.object({
  staffId: v.id("staff"),
  staffName: v.string(),
  staffImageUrl: v.optional(v.string()),
  startTime: v.number(),
  endTime: v.number(),
});

/** Public appointment view (excludes sensitive fields) */
export const publicAppointmentValidator = v.object({
  _id: v.id("appointments"),
  date: v.string(),
  startTime: v.number(),
  endTime: v.number(),
  status: appointmentStatusValidator,
  source: appointmentSourceValidator,
  confirmationCode: v.string(),
  staffName: v.string(),
  staffImageUrl: v.optional(v.string()),
  staffId: v.id("staff"),
  customerName: v.string(),
  customerPhone: v.string(),
  customerNotes: v.optional(v.string()),
  cancelledAt: v.optional(v.number()),
  rescheduleCount: v.optional(v.number()),
  total: v.number(),
  services: v.array(serviceItemWithId),
});

/** User-facing appointment view (for My Appointments on customer dashboard) */
export const userAppointmentValidator = v.object({
  _id: v.id("appointments"),
  date: v.string(),
  startTime: v.number(),
  endTime: v.number(),
  status: appointmentStatusValidator,
  confirmationCode: v.string(),
  staffName: v.string(),
  staffImageUrl: v.optional(v.string()),
  total: v.number(),
  organizationName: v.string(),
  organizationSlug: v.string(),
  organizationLogo: v.optional(v.string()),
  services: v.array(serviceItemNoId),
});

/** Appointment with enriched details (customer, staff, services) */
export const appointmentWithDetailsValidator = v.object(
  withSystemFields("appointments", {
    ...appointmentCoreFields,
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    staffName: v.string(),
    staffImageUrl: v.optional(v.string()),
    services: v.array(serviceItemWithId),
  }),
);

// =============================================================================
// Dashboard Analytics Validators
// =============================================================================

/** Dashboard stats validator */
export const dashboardStatsValidator = v.object({
  todayTotal: v.number(),
  todayCompleted: v.number(),
  todayUpcoming: v.number(),
  todayNoShows: v.number(),
  todayWalkIns: v.number(),
  todayTotalChange: v.number(),
  monthlyRevenue: v.number(),
  monthlyRevenueChange: v.number(),
});

// =============================================================================
// Report Validators
// =============================================================================

/** Revenue report daily data point */
export const revenueDailyPointValidator = v.object({
  date: v.string(),
  revenue: v.number(),
  appointments: v.number(),
  completed: v.number(),
});

/** Revenue by service breakdown */
export const revenueByServiceValidator = v.object({
  serviceId: v.id("services"),
  serviceName: v.string(),
  appointments: v.number(),
  revenue: v.number(),
});

/** Revenue by staff breakdown */
export const revenueByStaffValidator = v.object({
  staffId: v.id("staff"),
  staffName: v.string(),
  appointments: v.number(),
  revenue: v.number(),
});

/** Appointment status breakdown */
export const statusBreakdownValidator = v.object({
  pending: v.number(),
  confirmed: v.number(),
  inProgress: v.number(),
  completed: v.number(),
  cancelled: v.number(),
  noShow: v.number(),
});

/** Full revenue report */
export const revenueReportValidator = v.object({
  totalRevenue: v.number(),
  expectedRevenue: v.number(),
  totalAppointments: v.number(),
  completedAppointments: v.number(),
  avgPerAppointment: v.number(),
  revenueChange: v.number(),
  completionRate: v.number(),
  cancellationRate: v.number(),
  statusBreakdown: statusBreakdownValidator,
  daily: v.array(revenueDailyPointValidator),
  byService: v.array(revenueByServiceValidator),
  byStaff: v.array(revenueByStaffValidator),
});

/** Staff performance entry */
export const staffPerformanceEntryValidator = v.object({
  staffId: v.id("staff"),
  staffName: v.string(),
  totalAppointments: v.number(),
  completed: v.number(),
  noShows: v.number(),
  cancelled: v.number(),
  revenue: v.number(),
  scheduledMinutes: v.number(),
  appointmentMinutes: v.number(),
  utilization: v.number(),
});

/** Staff performance report */
export const staffPerformanceReportValidator = v.object({
  staff: v.array(staffPerformanceEntryValidator),
});

/** Monthly new vs returning data point */
export const monthlyNewVsReturningValidator = v.object({
  month: v.string(),
  newCustomers: v.number(),
  returningCustomers: v.number(),
});

/** Top customer entry */
export const topCustomerValidator = v.object({
  customerId: v.id("customers"),
  name: v.string(),
  phone: v.string(),
  appointments: v.number(),
  revenue: v.number(),
  lastVisitDate: v.union(v.string(), v.null()),
});

// =============================================================================
// User Appointment Validators
// =============================================================================

/** User appointment detail (extends userAppointment with IDs for actions) */
export const userAppointmentDetailValidator = v.object({
  _id: v.id("appointments"),
  date: v.string(),
  startTime: v.number(),
  endTime: v.number(),
  status: appointmentStatusValidator,
  confirmationCode: v.string(),
  staffName: v.string(),
  staffImageUrl: v.optional(v.string()),
  staffId: v.id("staff"),
  total: v.number(),
  organizationId: v.id("organization"),
  organizationName: v.string(),
  organizationSlug: v.string(),
  organizationLogo: v.optional(v.string()),
  customerNotes: v.optional(v.string()),
  cancelledAt: v.optional(v.number()),
  rescheduleCount: v.optional(v.number()),
  services: v.array(serviceItemWithId),
});

/** Customer profile for dashboard (cross-org) */
export const customerProfileValidator = v.object({
  _id: v.id("customers"),
  name: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  organizationId: v.id("organization"),
  organizationName: v.string(),
  organizationSlug: v.string(),
  totalVisits: v.number(),
  totalSpent: v.number(),
  createdAt: v.number(),
});

/** Customer analytics report */
export const customerReportValidator = v.object({
  totalActive: v.number(),
  newInPeriod: v.number(),
  retentionRate: v.number(),
  avgAppointmentsPerCustomer: v.number(),
  monthly: v.array(monthlyNewVsReturningValidator),
  topCustomers: v.array(topCustomerValidator),
});

// =============================================================================
// SuperAdmin Validators
// =============================================================================

/** Platform-wide stats for admin dashboard */
export const platformStatsValidator = v.object({
  totalUsers: v.number(),
  totalOrganizations: v.number(),
  activeOrganizations: v.number(),
  totalAppointments: v.number(),
  totalRevenue: v.number(),
  last30Days: v.object({
    newUsers: v.number(),
    newOrganizations: v.number(),
    appointments: v.number(),
    revenue: v.number(),
  }),
});

/** Organization list item for admin panel */
export const adminOrgListItemValidator = v.object({
  _id: v.id("organization"),
  name: v.string(),
  slug: v.string(),
  createdAt: v.number(),
  ownerName: v.union(v.string(), v.null()),
  ownerEmail: v.union(v.string(), v.null()),
  memberCount: v.number(),
  customerCount: v.number(),
  appointmentCount: v.number(),
  revenue: v.number(),
  subscriptionStatus: v.union(subscriptionStatusValidator, v.null()),
});

/** User list item for admin panel */
export const adminUserListItemValidator = v.object({
  userId: v.string(),
  name: v.string(),
  email: v.string(),
  createdAt: v.number(),
  organizationCount: v.number(),
  isBanned: v.boolean(),
});

/** Admin action log entry */
export const adminActionLogValidator = v.object({
  _id: v.id("adminActions"),
  _creationTime: v.number(),
  adminEmail: v.string(),
  action: v.string(),
  targetType: v.union(v.literal("organization"), v.literal("user")),
  targetId: v.string(),
  reason: v.optional(v.string()),
  createdAt: v.number(),
});
