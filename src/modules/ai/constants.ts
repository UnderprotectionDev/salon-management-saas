/**
 * AI module shared constants
 */

export type SalonType = "hair" | "nail" | "makeup" | "barber" | "spa" | "multi";

/**
 * Salon types that support the virtual try-on feature.
 * Used by the AI Hub page and PhotoAnalysisView to show/hide try-on entry points.
 */
export const TRYON_ENABLED_TYPES = new Set<SalonType>([
  "hair",
  "nail",
  "makeup",
  "multi",
]);
