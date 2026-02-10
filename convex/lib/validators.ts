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
  v.literal("suspended"),
  v.literal("pending_payment"),
);

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
  polarSubscriptionId: v.optional(v.string()),
  polarCustomerId: v.optional(v.string()),
  trialEndsAt: v.optional(v.number()),
  currentPeriodEnd: v.optional(v.number()),
  gracePeriodEndsAt: v.optional(v.number()),
  suspendedAt: v.optional(v.number()),
  cancelledAt: v.optional(v.number()),
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
  updatedAt: v.optional(v.number()),
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

/** Customer search result (lightweight for phone autocomplete) */
export const customerSearchResultValidator = v.object({
  _id: v.id("customers"),
  name: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
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

// =============================================================================
// Appointment Validators
// =============================================================================

/** Appointment status */
export const appointmentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("checked_in"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("no_show"),
);

/** Appointment source */
export const appointmentSourceValidator = v.union(
  v.literal("online"),
  v.literal("walk_in"),
  v.literal("phone"),
  v.literal("staff"),
);

/** Cancelled by: customer | staff | system */
export const cancelledByValidator = v.union(
  v.literal("customer"),
  v.literal("staff"),
  v.literal("system"),
);

/** Payment status */
export const paymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("partial"),
  v.literal("refunded"),
);

/** Reschedule history entry */
export const rescheduleHistoryEntryValidator = v.object({
  fromDate: v.string(),
  fromStartTime: v.number(),
  fromEndTime: v.number(),
  toDate: v.string(),
  toStartTime: v.number(),
  toEndTime: v.number(),
  rescheduledBy: v.union(v.literal("customer"), v.literal("staff")),
  rescheduledAt: v.number(),
});

/** Appointment document validator */
export const appointmentDocValidator = v.object({
  _id: v.id("appointments"),
  _creationTime: v.number(),
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
});

/** Appointment service (junction) document validator */
export const appointmentServiceDocValidator = v.object({
  _id: v.id("appointmentServices"),
  _creationTime: v.number(),
  appointmentId: v.id("appointments"),
  serviceId: v.id("services"),
  serviceName: v.string(),
  duration: v.number(),
  price: v.number(),
  staffId: v.id("staff"),
});

/** Slot lock document validator */
export const slotLockDocValidator = v.object({
  _id: v.id("slotLocks"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  staffId: v.id("staff"),
  date: v.string(),
  startTime: v.number(),
  endTime: v.number(),
  sessionId: v.string(),
  expiresAt: v.number(),
});

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
  services: v.array(
    v.object({
      serviceId: v.id("services"),
      serviceName: v.string(),
      duration: v.number(),
      price: v.number(),
    }),
  ),
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
  services: v.array(
    v.object({
      serviceName: v.string(),
      duration: v.number(),
      price: v.number(),
    }),
  ),
});

// =============================================================================
// Product Benefits Validators
// =============================================================================

/** Product benefits document validator */
export const productBenefitsDocValidator = v.object({
  _id: v.id("productBenefits"),
  _creationTime: v.number(),
  polarProductId: v.string(),
  benefits: v.array(v.string()),
});

// =============================================================================
// Notification Validators
// =============================================================================

/** Notification type */
export const notificationTypeValidator = v.union(
  v.literal("new_booking"),
  v.literal("cancellation"),
  v.literal("reminder_30min"),
  v.literal("reschedule"),
  v.literal("no_show"),
  v.literal("status_change"),
);

/** Notification document validator */
export const notificationDocValidator = v.object({
  _id: v.id("notifications"),
  _creationTime: v.number(),
  organizationId: v.id("organization"),
  recipientStaffId: v.id("staff"),
  type: notificationTypeValidator,
  title: v.string(),
  message: v.string(),
  appointmentId: v.optional(v.id("appointments")),
  isRead: v.boolean(),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
});

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

/** Appointment with enriched details (customer, staff, services) */
export const appointmentWithDetailsValidator = v.object({
  _id: v.id("appointments"),
  _creationTime: v.number(),
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
  // Enriched fields
  customerName: v.string(),
  customerPhone: v.string(),
  customerEmail: v.optional(v.string()),
  staffName: v.string(),
  staffImageUrl: v.optional(v.string()),
  services: v.array(
    v.object({
      serviceId: v.id("services"),
      serviceName: v.string(),
      duration: v.number(),
      price: v.number(),
    }),
  ),
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
  services: v.array(
    v.object({
      serviceId: v.id("services"),
      serviceName: v.string(),
      duration: v.number(),
      price: v.number(),
    }),
  ),
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
