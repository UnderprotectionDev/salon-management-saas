import { v } from "convex/values";
import { pick } from "convex-helpers";
import {
  literals,
  nullable,
  typedV,
  withSystemFields,
} from "convex-helpers/validators";
import schema from "../schema";

// Schema-typed v: provides vv.doc("tableName") and type-safe vv.id("tableName")
const vv = typedV(schema);

// =============================================================================
// Enum Validators (used in args: positions — kept explicit for readability)
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

/** User profile gender: male | female | unspecified */
export const genderValidator = literals("male", "female", "unspecified");

/** Hair type: straight | wavy | curly | very_curly */
export const hairTypeValidator = literals(
  "straight",
  "wavy",
  "curly",
  "very_curly",
);

/** Hair length: short | medium | long | very_long */
export const hairLengthValidator = literals(
  "short",
  "medium",
  "long",
  "very_long",
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
// Schema-Derived Nested Validators (used in args: positions)
// =============================================================================

/** Address object — derived from organizationSettings schema */
export const addressValidator =
  schema.tables.organizationSettings.validator.fields.address;

/** Single business hours day entry */
export const businessHoursDayValidator = v.optional(
  v.object({ open: v.string(), close: v.string(), closed: v.boolean() }),
);

/** Full weekly business hours — derived from organizationSettings schema */
export const businessHoursValidator =
  schema.tables.organizationSettings.validator.fields.businessHours;

/** Booking settings — derived from organizationSettings schema */
export const bookingSettingsValidator =
  schema.tables.organizationSettings.validator.fields.bookingSettings;

/** Single staff day schedule entry */
export const staffDayScheduleValidator = v.optional(
  v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
);

/** Full weekly staff schedule — derived from staff schema */
export const staffScheduleValidator =
  schema.tables.staff.validator.fields.defaultSchedule;

/** Subscription detail (for billing page — composite, not a doc) */
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

// =============================================================================
// Reusable Sub-Validators (used in composite validators)
// =============================================================================

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
// Document Validators (auto-generated from schema via typedV)
// =============================================================================

/** Organization document validator */
export const organizationDocValidator = vv.doc("organization");

/** Member document validator */
export const memberDocValidator = vv.doc("member");

/** Invitation document validator */
export const invitationDocValidator = vv.doc("invitation");

/** Organization settings document validator */
export const organizationSettingsDocValidator = vv.doc("organizationSettings");

/** Staff document validator */
export const staffDocValidator = vv.doc("staff");

/** Service category document validator */
export const serviceCategoryDocValidator = vv.doc("serviceCategories");

/** Service document validator */
export const serviceDocValidator = vv.doc("services");

/** Schedule override document validator */
export const scheduleOverrideDocValidator = vv.doc("scheduleOverrides");

/** Time-off request document validator */
export const timeOffRequestDocValidator = vv.doc("timeOffRequests");

/** Staff overtime document validator */
export const staffOvertimeDocValidator = vv.doc("staffOvertime");

/** Customer document validator */
export const customerDocValidator = vv.doc("customers");

/** Appointment document validator */
export const appointmentDocValidator = vv.doc("appointments");

/** Appointment service (junction) document validator */
export const appointmentServiceDocValidator = vv.doc("appointmentServices");

/** Slot lock document validator */
export const slotLockDocValidator = vv.doc("slotLocks");

/** User profile document validator */
export const userProfileDocValidator = vv.doc("userProfile");

/** Notification document validator */
export const notificationDocValidator = vv.doc("notifications");

/** Product benefits document validator */
export const productBenefitsDocValidator = vv.doc("productBenefits");

// =============================================================================
// Composite Validators (enriched return types — schema fields + extensions)
// =============================================================================

/** Organization with role and memberId (for listForUser) */
export const organizationWithRoleValidator = v.object(
  withSystemFields("organization", {
    ...schema.tables.organization.validator.fields,
    role: memberRoleValidator,
    memberId: v.id("member"),
  }),
);

/** Service with category name (enriched query result) */
export const serviceWithCategoryValidator = v.object(
  withSystemFields("services", {
    ...schema.tables.services.validator.fields,
    categoryName: v.optional(v.string()),
  }),
);

/** Service category with service count */
export const serviceCategoryWithCountValidator = v.object(
  withSystemFields("serviceCategories", {
    ...schema.tables.serviceCategories.validator.fields,
    serviceCount: v.number(),
  }),
);

/** Time-off request with staff name (enriched for admin panel) */
export const timeOffRequestWithStaffValidator = v.object(
  withSystemFields("timeOffRequests", {
    ...schema.tables.timeOffRequests.validator.fields,
    staffName: v.string(),
    approvedByName: v.optional(v.string()),
  }),
);

/** Customer list item (lightweight subset via pick) */
export const customerListItemValidator = v.object(
  pick(
    withSystemFields("customers", schema.tables.customers.validator.fields),
    [
      "_id",
      "_creationTime",
      "name",
      "email",
      "phone",
      "accountStatus",
      "totalVisits",
      "totalSpent",
      "lastVisitDate",
      "noShowCount",
      "tags",
      "source",
      "createdAt",
    ],
  ),
);

/** Customer search result (lightweight for phone autocomplete via pick) */
export const customerSearchResultValidator = v.object(
  pick(
    withSystemFields("customers", schema.tables.customers.validator.fields),
    ["_id", "name", "phone", "email"],
  ),
);

/** Customer with preferred staff (enriched for detail page) */
export const customerWithStaffValidator = v.object(
  withSystemFields("customers", {
    ...schema.tables.customers.validator.fields,
    preferredStaffName: v.optional(v.string()),
  }),
);

/** Invitation with organization info (for getPendingForCurrentUser) */
export const invitationWithOrgValidator = v.object(
  withSystemFields("invitation", {
    ...schema.tables.invitation.validator.fields,
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
  staffId: v.union(v.id("staff"), v.null()),
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
    ...schema.tables.appointments.validator.fields,
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    staffName: v.string(), // "Deleted staff" when staffId is null
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
  lastVisitDate: nullable(v.string()),
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
  staffId: v.union(v.id("staff"), v.null()),
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

/** User onboarding profile (lightweight for dashboard banner / wizard) */
export const userOnboardingProfileValidator = v.object({
  _id: v.id("userProfile"),
  phone: v.optional(v.string()),
  gender: v.optional(genderValidator),
  dateOfBirth: v.optional(v.string()),
  hairType: v.optional(hairTypeValidator),
  hairLength: v.optional(hairLengthValidator),
  allergies: v.optional(v.array(v.string())),
  allergyNotes: v.optional(v.string()),
  dataProcessingConsent: v.boolean(),
  marketingConsent: v.optional(v.boolean()),
  emailReminders: v.optional(v.boolean()),
  marketingEmails: v.optional(v.boolean()),
  onboardingCompleted: v.boolean(),
  onboardingDismissedAt: v.optional(v.number()),
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
  ownerName: nullable(v.string()),
  ownerEmail: nullable(v.string()),
  memberCount: v.number(),
  customerCount: v.number(),
  appointmentCount: v.number(),
  revenue: v.number(),
  subscriptionStatus: nullable(subscriptionStatusValidator),
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

/** Admin action log entry (subset of adminActions via pick) */
export const adminActionLogValidator = v.object(
  pick(
    withSystemFields(
      "adminActions",
      schema.tables.adminActions.validator.fields,
    ),
    [
      "_id",
      "_creationTime",
      "adminEmail",
      "action",
      "targetType",
      "targetId",
      "reason",
      "createdAt",
    ],
  ),
);
