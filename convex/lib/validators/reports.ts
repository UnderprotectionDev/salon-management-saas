import { v } from "convex/values";
import { pick } from "convex-helpers";
import { nullable, withSystemFields } from "convex-helpers/validators";
import schema from "../../schema";
import { avatarConfigValidator } from "./documents";
import {
  genderValidator,
  hairLengthValidator,
  hairTypeValidator,
  salonPreferencesValidator,
  subscriptionStatusValidator,
} from "./enums";

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

/** Hourly distribution data point */
export const hourlyDistributionValidator = v.object({
  hour: v.number(),
  count: v.number(),
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
  hourlyDistribution: v.array(hourlyDistributionValidator),
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

/** Customer analytics report */
export const customerReportValidator = v.object({
  totalActive: v.number(),
  totalActiveChange: v.number(),
  newInPeriod: v.number(),
  newInPeriodChange: v.number(),
  retentionRate: v.number(),
  retentionRateChange: v.number(),
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

// =============================================================================
// User Onboarding Profile
// =============================================================================

/** User onboarding profile (lightweight for dashboard banner / wizard) */
export const userOnboardingProfileValidator = v.object({
  _id: v.id("userProfile"),
  phone: v.optional(v.string()),
  avatarConfig: v.optional(avatarConfigValidator),
  gender: v.optional(genderValidator),
  dateOfBirth: v.optional(v.string()),
  hairType: v.optional(hairTypeValidator),
  hairLength: v.optional(hairLengthValidator),
  allergies: v.optional(v.array(v.string())),
  allergyNotes: v.optional(v.string()),
  salonPreferences: v.optional(salonPreferencesValidator),
  dataProcessingConsent: v.boolean(),
  marketingConsent: v.optional(v.boolean()),
  emailReminders: v.optional(v.boolean()),
  marketingEmails: v.optional(v.boolean()),
  onboardingCompleted: v.boolean(),
  onboardingDismissedAt: v.optional(v.number()),
});

// =============================================================================
// Setup Progress (Onboarding Checklist)
// =============================================================================

export const setupProgressItemValidator = v.object({
  id: v.string(),
  label: v.string(),
  completed: v.boolean(),
  href: v.string(),
});

export const setupProgressValidator = v.object({
  items: v.array(setupProgressItemValidator),
  dismissed: v.boolean(),
});
