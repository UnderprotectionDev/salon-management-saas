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
  serviceIds: v.optional(v.array(v.string())),
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
