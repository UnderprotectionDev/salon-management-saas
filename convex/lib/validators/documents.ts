import { v } from "convex/values";
import { literals, typedV } from "convex-helpers/validators";
import schema from "../../schema";
import {
  aiAnalysisResultValidator,
  aiQuickAnswersValidator,
} from "../aiValidators";
import { subscriptionStatusValidator } from "./enums";

// Schema-typed v: provides vv.doc("tableName") and type-safe vv.id("tableName")
const vv = typedV(schema);

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

/** Social media — derived from organizationSettings schema */
export const socialMediaValidator =
  schema.tables.organizationSettings.validator.fields.socialMedia;

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

/** react-nice-avatar AvatarConfig validator (all fields optional) */
export const avatarConfigValidator = v.object({
  sex: v.optional(v.union(v.literal("man"), v.literal("woman"))),
  faceColor: v.optional(v.string()),
  earSize: v.optional(v.union(v.literal("small"), v.literal("big"))),
  hairColor: v.optional(v.string()),
  hairStyle: v.optional(
    v.union(
      v.literal("normal"),
      v.literal("thick"),
      v.literal("mohawk"),
      v.literal("womanLong"),
      v.literal("womanShort"),
    ),
  ),
  hairColorRandom: v.optional(v.boolean()),
  hatColor: v.optional(v.string()),
  hatStyle: v.optional(
    v.union(v.literal("none"), v.literal("beanie"), v.literal("turban")),
  ),
  eyeStyle: v.optional(
    v.union(v.literal("circle"), v.literal("oval"), v.literal("smile")),
  ),
  glassesStyle: v.optional(
    v.union(v.literal("none"), v.literal("round"), v.literal("square")),
  ),
  noseStyle: v.optional(
    v.union(v.literal("short"), v.literal("long"), v.literal("round")),
  ),
  mouthStyle: v.optional(
    v.union(v.literal("laugh"), v.literal("smile"), v.literal("peace")),
  ),
  shirtStyle: v.optional(
    v.union(v.literal("hoody"), v.literal("short"), v.literal("polo")),
  ),
  shirtColor: v.optional(v.string()),
  bgColor: v.optional(v.string()),
  isGradient: v.optional(v.boolean()),
  eyeBrowStyle: v.optional(v.union(v.literal("up"), v.literal("upWoman"))),
  accessoriesStyle: v.optional(
    v.union(v.literal("none"), v.literal("earings")),
  ),
});

/** User profile document validator */
export const userProfileDocValidator = vv.doc("userProfile");

/** Notification document validator */
export const notificationDocValidator = vv.doc("notifications");

// Re-export AI validators so other modules can import from validators
export { aiAnalysisResultValidator, aiQuickAnswersValidator };
