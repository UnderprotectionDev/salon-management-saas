/**
 * AI Feature Constants
 *
 * Central configuration for all AI-related features including
 * credit costs, salon type mappings, and quick question definitions.
 */

// =========================================================================
// Salon Type Definitions
// =========================================================================

/** Internal AI salon type — includes "multi" for derived multi-service salons */
export type SalonType = "hair" | "nail" | "makeup" | "barber" | "spa" | "multi";

/** Individual org salon type (stored in DB — no "multi" option) */
export type OrgSalonType = "hair" | "nail" | "makeup" | "barber" | "spa";

/**
 * Derives the effective SalonType for AI features from the org's multi-select array.
 * - 0 or undefined → null
 * - 1 item → that item
 * - 2+ items → "multi"
 */
export function deriveEffectiveSalonType(
  types: OrgSalonType[] | undefined | null,
): SalonType | null {
  if (!types || types.length === 0) return null;
  if (types.length === 1) return types[0];
  return "multi";
}

/**
 * Salon types that support virtual try-on.
 * Barber and spa do not have try-on capability.
 */
export const TRYON_ENABLED_TYPES: SalonType[] = [
  "hair",
  "nail",
  "makeup",
  "multi",
];

/**
 * Maps salon type to the body region used for try-on (used in VirtualTryOnView).
 */
export const SALON_TYPE_TRYON_MODE_MAP: Record<
  string,
  "hair" | "fingertip" | "face"
> = {
  hair: "hair",
  nail: "fingertip",
  makeup: "face",
  multi: "face", // Default to face for multi-service salons
};

/**
 * Maximum number of photos allowed per salon type for multi-image analysis.
 */
export const MAX_PHOTOS_BY_TYPE: Record<string, number> = {
  hair: 3, // front + side + back
  nail: 2, // both hands
  makeup: 2, // front + profile
  barber: 2,
  spa: 1,
  multi: 3,
};

/**
 * Angle labels for multi-image analysis by salon type.
 */
export const PHOTO_ANGLE_LABELS: Record<string, string[]> = {
  hair: ["Front", "Side", "Back"],
  nail: ["Left Hand", "Right Hand"],
  makeup: ["Front", "Profile"],
  barber: ["Front", "Side"],
  spa: ["Front"],
  multi: ["Front", "Side", "Back"],
};

// =========================================================================
// Credit Costs
// =========================================================================

export const CREDIT_COSTS = {
  photoAnalysisSingle: 5,
  photoAnalysisMulti: 8,
  quickQuestion: 2,
  virtualTryOn: 10,
  careSchedule: 2,
} as const;

export type CreditFeatureType =
  | "photoAnalysis"
  | "quickQuestion"
  | "virtualTryOn"
  | "careSchedule";

// =========================================================================
// Credit Packages (USD, Polar one-time checkout)
// =========================================================================

export const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    priceUsd: 199, // $1.99 in cents
    priceDisplay: "$1.99",
  },
  {
    id: "popular",
    name: "Popular",
    credits: 200,
    priceUsd: 599, // $5.99 in cents
    priceDisplay: "$5.99",
    badge: "Best Value",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 500,
    priceUsd: 1199, // $11.99 in cents
    priceDisplay: "$11.99",
  },
] as const;

// =========================================================================
// Quick Questions by Salon Type
// =========================================================================

export const QUICK_QUESTIONS_BY_TYPE: Record<
  string,
  { key: string; label: string }[]
> = {
  hair: [
    { key: "best_cut", label: "Best cut for my face shape?" },
    { key: "color_recs", label: "Color recommendations?" },
    { key: "home_care", label: "Home care routine?" },
  ],
  nail: [
    { key: "best_shape", label: "Best nail shape for my hands?" },
    { key: "strengthen", label: "Strengthening tips?" },
    { key: "polish_color", label: "Polish color suggestions?" },
  ],
  makeup: [
    { key: "foundation", label: "Foundation match advice?" },
    { key: "eye_looks", label: "Eye shape-based looks?" },
    { key: "skincare", label: "Skincare suggestions?" },
  ],
  barber: [
    { key: "best_cut", label: "Best cut for my face shape?" },
    { key: "beard_style", label: "Beard style recommendations?" },
    { key: "grooming", label: "Grooming routine?" },
  ],
  spa: [
    { key: "skin_type", label: "What's my skin type?" },
    { key: "treatment_recs", label: "Treatment recommendations?" },
    { key: "home_routine", label: "Home skincare routine?" },
  ],
  multi: [
    { key: "best_cut", label: "Best cut for my face shape?" },
    { key: "color_recs", label: "Color recommendations?" },
    { key: "skincare", label: "Skincare suggestions?" },
  ],
};

// =========================================================================
// Analysis Focus Areas by Salon Type
// =========================================================================

export const ANALYSIS_FOCUS_BY_TYPE: Record<string, string[]> = {
  hair: [
    "face shape",
    "facial symmetry",
    "hair type",
    "hair color",
    "hair density",
    "hair condition",
  ],
  nail: ["nail shape", "nail condition", "hand skin tone", "cuticle health"],
  makeup: [
    "face shape",
    "skin tone (Fitzpatrick scale)",
    "undertone",
    "eye color",
    "eye shape",
    "lip shape",
  ],
  barber: [
    "face shape",
    "facial symmetry",
    "hair type",
    "beard growth pattern",
    "jawline definition",
  ],
  spa: ["skin type", "skin condition", "pore size", "hydration level"],
  multi: [
    "face shape",
    "skin tone",
    "hair type",
    "hair color",
    "overall condition",
  ],
};
