import { v } from "convex/values";
import { pick } from "convex-helpers";
import { withSystemFields } from "convex-helpers/validators";
import schema from "../../schema";
import {
  appointmentSourceValidator,
  appointmentStatusValidator,
  customerAccountStatusValidator,
  customerSourceValidator,
  memberRoleValidator,
} from "./enums";

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

/** Date availability for date picker */
export const dateAvailabilityValidator = v.object({
  date: v.string(),
  hasAvailability: v.boolean(),
  slotCount: v.number(),
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
  cancellationPolicyHours: v.number(),
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

// =============================================================================
// Customer List Stats Validators
// =============================================================================

/** Aggregate stats for customer list page header */
export const customerListStatsValidator = v.object({
  totalCustomers: v.number(),
  newThisMonth: v.number(),
  activeCustomers: v.number(),
  averageSpend: v.number(),
});
