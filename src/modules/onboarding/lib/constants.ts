/** Gender options for onboarding wizard */
export const GENDER_OPTIONS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "unspecified", label: "Prefer not to say" },
] as const;

/** Hair type options */
export const HAIR_TYPE_OPTIONS = [
  { id: "straight", label: "Straight" },
  { id: "wavy", label: "Wavy" },
  { id: "curly", label: "Curly" },
  { id: "very_curly", label: "Very Curly" },
] as const;

/** Hair length options */
export const HAIR_LENGTH_OPTIONS = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
  { id: "very_long", label: "Very Long" },
] as const;

/** Common allergens in salon context */
export const COMMON_ALLERGENS = [
  { id: "ppd", label: "Hair Dye (PPD)" },
  { id: "ammonia", label: "Ammonia" },
  { id: "latex", label: "Latex" },
  { id: "peroxide", label: "Peroxide" },
  { id: "fragrance", label: "Fragrance" },
  { id: "nickel", label: "Nickel" },
] as const;

/** Onboarding wizard steps */
export const ONBOARDING_STEPS = [
  { id: "gender", label: "Gender" },
  { id: "birthday", label: "Birthday" },
  { id: "hair_allergy", label: "Hair & Allergies" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

/** Profile completion fields (for progress calculation) */
export const PROFILE_FIELDS = [
  "gender",
  "dateOfBirth",
  "hairType",
  "phone",
] as const;

/** Calculate onboarding progress percentage */
export function calculateOnboardingProgress(profile: {
  gender?: string | null;
  dateOfBirth?: string | null;
  hairType?: string | null;
  phone?: string | null;
}): number {
  let completed = 0;
  if (profile.gender) completed++;
  if (profile.dateOfBirth) completed++;
  if (profile.hairType) completed++;
  if (profile.phone) completed++;
  return Math.round((completed / PROFILE_FIELDS.length) * 100);
}
