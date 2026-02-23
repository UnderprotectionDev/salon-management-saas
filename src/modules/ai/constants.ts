/**
 * AI module shared constants
 */

export type SalonType =
  | "hair_women"
  | "hair_men"
  | "children"
  | "braiding"
  | "blowout_bar"
  | "hair_extensions"
  | "nail"
  | "makeup"
  | "skincare"
  | "lash_brow"
  | "permanent_makeup"
  | "threading"
  | "head_spa"
  | "spa"
  | "massage"
  | "hammam"
  | "sauna"
  | "ayurveda"
  | "float_therapy"
  | "waxing"
  | "tanning"
  | "laser"
  | "electrolysis"
  | "medspa"
  | "aesthetic_clinic"
  | "cryotherapy"
  | "iv_therapy"
  | "body_contouring"
  | "hair_loss"
  | "tattoo"
  | "piercing"
  | "henna"
  | "pet_grooming"
  | "beauty_center"
  | "multi";

/**
 * Salon types that support the virtual try-on feature.
 * Used by the AI Hub page and PhotoAnalysisView to show/hide try-on entry points.
 */
export const TRYON_ENABLED_TYPES = new Set<SalonType>([
  "hair_women",
  "hair_men",
  "nail",
  "makeup",
  "multi",
]);
