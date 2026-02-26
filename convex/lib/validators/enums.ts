import { v } from "convex/values";
import { literals } from "convex-helpers/validators";

// =============================================================================
// Enum Validators (used in args: positions — kept explicit for readability)
// =============================================================================

/** Member role: owner | staff */
export const memberRoleValidator = literals("owner", "staff");

/** Invitation role: always staff (no owner invitations) */
export const invitationRoleValidator = v.literal("staff");

/** Staff status: active | inactive | pending */
export const staffStatusValidator = literals("active", "inactive", "pending");

/** Subscription status */
export const subscriptionStatusValidator = literals(
  "active",
  "trialing",
  "past_due",
  "canceling",
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

/** Scalp sensitivity: none | mild | moderate | severe */
export const scalpSensitivityValidator = literals(
  "none",
  "mild",
  "moderate",
  "severe",
);

/** Nail type: natural | gel | acrylic | none */
export const nailTypeValidator = literals("natural", "gel", "acrylic", "none");

/** Skin tone: fair | light | medium | olive | tan | dark */
export const skinToneValidator = literals(
  "fair",
  "light",
  "medium",
  "olive",
  "tan",
  "dark",
);

/** Skin type: normal | dry | oily | combination | sensitive */
export const skinTypeValidator = literals(
  "normal",
  "dry",
  "oily",
  "combination",
  "sensitive",
);

/** Skin sensitivity level: none | mild | moderate | severe */
export const skinSensitivityLevelValidator = literals(
  "none",
  "mild",
  "moderate",
  "severe",
);

/** Tanning history: none | occasional | regular */
export const tanningHistoryValidator = literals(
  "none",
  "occasional",
  "regular",
);

/** Pet size: small | medium | large */
export const petSizeValidator = literals("small", "medium", "large");

/** Wash frequency: daily | every_other_day | twice_week | weekly | less */
export const washFrequencyValidator = literals(
  "daily",
  "every_other_day",
  "twice_week",
  "weekly",
  "less",
);

/** Heat tool usage: none | occasional | frequent | daily */
export const heatToolUsageValidator = literals(
  "none",
  "occasional",
  "frequent",
  "daily",
);

/** Daily skincare routine: none | basic | moderate | extensive */
export const dailyRoutineValidator = literals(
  "none",
  "basic",
  "moderate",
  "extensive",
);

/** Sunscreen usage: never | sometimes | daily */
export const sunscreenUsageValidator = literals("never", "sometimes", "daily");

/** Massage pressure preference: light | medium | firm | deep */
export const pressurePreferenceValidator = literals(
  "light",
  "medium",
  "firm",
  "deep",
);

/** Hair removal method */
export const hairRemovalMethodValidator = literals(
  "waxing",
  "laser",
  "ipl",
  "sugaring",
  "threading",
  "shaving",
);

/** Pain tolerance: low | medium | high */
export const painToleranceValidator = literals("low", "medium", "high");

// =============================================================================
// Salon Preference Sub-Validators
// =============================================================================

export const hairPreferencesValidator = v.object({
  hairType: v.optional(hairTypeValidator),
  hairLength: v.optional(hairLengthValidator),
  naturalHairColor: v.optional(v.string()),
  currentHairColor: v.optional(v.string()),
  colorTreated: v.optional(v.boolean()),
  scalpSensitivity: v.optional(scalpSensitivityValidator),
  photos: v.optional(v.array(v.id("_storage"))),
  washFrequency: v.optional(washFrequencyValidator),
  heatToolUsage: v.optional(heatToolUsageValidator),
  productsUsed: v.optional(v.string()),
  lastChemicalTreatment: v.optional(v.string()),
});

export const nailsPreferencesValidator = v.object({
  nailType: v.optional(nailTypeValidator),
  skinTone: v.optional(skinToneValidator),
  sensitiveSkin: v.optional(v.boolean()),
});

export const skinPreferencesValidator = v.object({
  skinType: v.optional(skinTypeValidator),
  skinConditions: v.optional(v.array(v.string())),
  lashExtensionsHistory: v.optional(v.boolean()),
  photos: v.optional(v.array(v.id("_storage"))),
  dailyRoutine: v.optional(dailyRoutineValidator),
  sunscreenUsage: v.optional(sunscreenUsageValidator),
  activeIngredients: v.optional(v.array(v.string())),
  lastFacialDate: v.optional(v.string()),
});

export const spaPreferencesValidator = v.object({
  pregnancy: v.optional(v.boolean()),
  bloodPressureIssues: v.optional(v.boolean()),
  chronicPainAreas: v.optional(v.array(v.string())),
  pressurePreference: v.optional(pressurePreferenceValidator),
  aromatherapyPreference: v.optional(v.array(v.string())),
  focusAreas: v.optional(v.array(v.string())),
});

export const bodyPreferencesValidator = v.object({
  skinSensitivityLevel: v.optional(skinSensitivityLevelValidator),
  previousLaserTreatments: v.optional(v.boolean()),
  tanningHistory: v.optional(tanningHistoryValidator),
  preferredMethod: v.optional(hairRemovalMethodValidator),
  painTolerance: v.optional(painToleranceValidator),
  lastTreatmentDate: v.optional(v.string()),
  treatmentAreas: v.optional(v.array(v.string())),
});

export const medicalPreferencesValidator = v.object({
  currentMedications: v.optional(v.string()),
  previousProcedures: v.optional(v.string()),
  physicianClearance: v.optional(v.boolean()),
});

export const artPreferencesValidator = v.object({
  previousTattoos: v.optional(v.boolean()),
  keloidTendency: v.optional(v.boolean()),
  metalAllergies: v.optional(v.array(v.string())),
  photos: v.optional(v.array(v.id("_storage"))),
});

export const specialtyPreferencesValidator = v.object({
  petType: v.optional(v.string()),
  petBreed: v.optional(v.string()),
  petSize: v.optional(petSizeValidator),
  photos: v.optional(v.array(v.id("_storage"))),
});

export const salonPreferencesValidator = v.object({
  selectedCategories: v.array(v.string()),
  hair: v.optional(hairPreferencesValidator),
  nails: v.optional(nailsPreferencesValidator),
  skin: v.optional(skinPreferencesValidator),
  spa: v.optional(spaPreferencesValidator),
  body: v.optional(bodyPreferencesValidator),
  medical: v.optional(medicalPreferencesValidator),
  art: v.optional(artPreferencesValidator),
  specialty: v.optional(specialtyPreferencesValidator),
});

/** Notification type */
export const notificationTypeValidator = literals(
  "new_booking",
  "cancellation",
  "reminder_30min",
  "reschedule",
  "no_show",
  "status_change",
  "low_stock",
);
