import {
  Scissors,
  Paintbrush,
  Sparkles,
  Flower2,
  Zap,
  Stethoscope,
  Palette,
  PawPrint,
} from "lucide-react";

export const USER_SALON_CATEGORIES = [
  {
    key: "hair_styling",
    label: "Hair & Styling",
    icon: Scissors,
    prefsKey: "hair" as const,
  },
  {
    key: "nails_makeup",
    label: "Nails & Makeup",
    icon: Paintbrush,
    prefsKey: "nails" as const,
  },
  {
    key: "skin_face",
    label: "Skin & Face",
    icon: Sparkles,
    prefsKey: "skin" as const,
  },
  {
    key: "spa_wellness",
    label: "Spa & Wellness",
    icon: Flower2,
    prefsKey: "spa" as const,
  },
  {
    key: "body_treatments",
    label: "Body Treatments",
    icon: Zap,
    prefsKey: "body" as const,
  },
  {
    key: "medical_aesthetic",
    label: "Medical & Aesthetic",
    icon: Stethoscope,
    prefsKey: "medical" as const,
  },
  {
    key: "art_expression",
    label: "Art & Expression",
    icon: Palette,
    prefsKey: "art" as const,
  },
  {
    key: "specialty",
    label: "Specialty",
    icon: PawPrint,
    prefsKey: "specialty" as const,
  },
] as const;

export const HAIR_COLOR_OPTIONS = [
  { id: "black", label: "Black" },
  { id: "dark_brown", label: "Dark Brown" },
  { id: "light_brown", label: "Light Brown" },
  { id: "blonde", label: "Blonde" },
  { id: "red", label: "Red" },
  { id: "auburn", label: "Auburn" },
  { id: "gray", label: "Gray" },
  { id: "other", label: "Other" },
] as const;

/** Shared sensitivity level options (used by scalp, skin, etc.) */
export const SENSITIVITY_LEVEL_OPTIONS = [
  { id: "none", label: "None" },
  { id: "mild", label: "Mild" },
  { id: "moderate", label: "Moderate" },
  { id: "severe", label: "Severe" },
] as const;

export const SCALP_SENSITIVITY_OPTIONS = SENSITIVITY_LEVEL_OPTIONS;

export const NAIL_TYPE_OPTIONS = [
  { id: "natural", label: "Natural" },
  { id: "gel", label: "Gel" },
  { id: "acrylic", label: "Acrylic" },
  { id: "none", label: "None" },
] as const;

export const SKIN_TONE_OPTIONS = [
  { id: "fair", label: "Fair" },
  { id: "light", label: "Light" },
  { id: "medium", label: "Medium" },
  { id: "olive", label: "Olive" },
  { id: "tan", label: "Tan" },
  { id: "dark", label: "Dark" },
] as const;

export const SKIN_TYPE_OPTIONS = [
  { id: "normal", label: "Normal" },
  { id: "dry", label: "Dry" },
  { id: "oily", label: "Oily" },
  { id: "combination", label: "Combination" },
  { id: "sensitive", label: "Sensitive" },
] as const;

export const SKIN_CONDITIONS_OPTIONS = [
  { id: "acne", label: "Acne" },
  { id: "rosacea", label: "Rosacea" },
  { id: "eczema", label: "Eczema" },
  { id: "psoriasis", label: "Psoriasis" },
  { id: "none", label: "None" },
] as const;

export const CHRONIC_PAIN_OPTIONS = [
  { id: "back", label: "Back" },
  { id: "neck", label: "Neck" },
  { id: "shoulders", label: "Shoulders" },
  { id: "legs", label: "Legs" },
  { id: "none", label: "None" },
] as const;

export const SKIN_SENSITIVITY_LEVEL_OPTIONS = SENSITIVITY_LEVEL_OPTIONS;

export const TANNING_HISTORY_OPTIONS = [
  { id: "none", label: "None" },
  { id: "occasional", label: "Occasional" },
  { id: "regular", label: "Regular" },
] as const;

export const PET_SIZE_OPTIONS = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
] as const;

/** Metal allergy options for Art & Expression category (tattoo/piercing) */
export const METAL_ALLERGY_OPTIONS = [
  { id: "nickel", label: "Nickel" },
  { id: "cobalt", label: "Cobalt" },
  { id: "chromium", label: "Chromium" },
  { id: "titanium", label: "Titanium" },
  { id: "gold", label: "Gold" },
  { id: "silver", label: "Silver" },
] as const;

// =============================================================================
// New preference field options
// =============================================================================

export const WASH_FREQUENCY_OPTIONS = [
  { id: "daily", label: "Daily" },
  { id: "every_other_day", label: "Every Other Day" },
  { id: "twice_week", label: "Twice a Week" },
  { id: "weekly", label: "Weekly" },
  { id: "less", label: "Less Often" },
] as const;

export const HEAT_TOOL_USAGE_OPTIONS = [
  { id: "none", label: "None" },
  { id: "occasional", label: "Occasional" },
  { id: "frequent", label: "Frequent" },
  { id: "daily", label: "Daily" },
] as const;

export const DAILY_ROUTINE_OPTIONS = [
  { id: "none", label: "None" },
  { id: "basic", label: "Basic" },
  { id: "moderate", label: "Moderate" },
  { id: "extensive", label: "Extensive" },
] as const;

export const SUNSCREEN_USAGE_OPTIONS = [
  { id: "never", label: "Never" },
  { id: "sometimes", label: "Sometimes" },
  { id: "daily", label: "Daily" },
] as const;

export const ACTIVE_INGREDIENT_OPTIONS = [
  { id: "retinol", label: "Retinol" },
  { id: "aha_bha", label: "AHA/BHA" },
  { id: "vitamin_c", label: "Vitamin C" },
  { id: "niacinamide", label: "Niacinamide" },
] as const;

export const PRESSURE_PREFERENCE_OPTIONS = [
  { id: "light", label: "Light" },
  { id: "medium", label: "Medium" },
  { id: "firm", label: "Firm" },
  { id: "deep", label: "Deep" },
] as const;

export const AROMATHERAPY_OPTIONS = [
  { id: "lavender", label: "Lavender" },
  { id: "eucalyptus", label: "Eucalyptus" },
  { id: "peppermint", label: "Peppermint" },
  { id: "citrus", label: "Citrus" },
] as const;

export const FOCUS_AREA_OPTIONS = [
  { id: "back", label: "Back" },
  { id: "neck", label: "Neck" },
  { id: "shoulders", label: "Shoulders" },
  { id: "legs", label: "Legs" },
  { id: "feet", label: "Feet" },
] as const;

export const HAIR_REMOVAL_METHOD_OPTIONS = [
  { id: "waxing", label: "Waxing" },
  { id: "laser", label: "Laser" },
  { id: "ipl", label: "IPL" },
  { id: "sugaring", label: "Sugaring" },
  { id: "threading", label: "Threading" },
  { id: "shaving", label: "Shaving" },
] as const;

export const PAIN_TOLERANCE_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
] as const;

export const TREATMENT_AREA_OPTIONS = [
  { id: "legs", label: "Legs" },
  { id: "arms", label: "Arms" },
  { id: "underarms", label: "Underarms" },
  { id: "bikini", label: "Bikini" },
  { id: "face", label: "Face" },
  { id: "back", label: "Back" },
] as const;
