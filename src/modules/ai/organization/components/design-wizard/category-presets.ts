/**
 * Category presets, visual mappings, and type definitions for the Design Wizard.
 *
 * Extracted from the monolithic DesignCatalogManager to be shared across
 * the wizard steps and the catalog list view.
 */

import type { LucideIcon } from "lucide-react";
import {
  Blend,
  Brush,
  CircleDot,
  Crown,
  Droplet,
  Droplets,
  Eye,
  Flower2,
  Gem,
  Hand,
  Heart,
  Layers,
  Leaf,
  Minimize2,
  Origami,
  Paintbrush,
  Palette,
  Scissors,
  Sparkles,
  Star,
  Sun,
  Waves,
  Zap,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export type OrgSalonType =
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
export type DesignSalonType = "hair" | "nail" | "makeup" | "multi";

// Service areas shown in multi-service selector
export const MULTI_SERVICE_AREAS: {
  value: DesignSalonType;
  label: string;
  description: string;
}[] = [
  {
    value: "hair",
    label: "Hair",
    description: "Hair coloring, cutting & styling",
  },
  {
    value: "nail",
    label: "Nails",
    description: "Nail art, gel, acrylic & more",
  },
  {
    value: "makeup",
    label: "Makeup",
    description: "Bridal, editorial & everyday looks",
  },
];

// =============================================================================
// Category Presets
// =============================================================================

export const CATEGORY_PRESETS: Record<OrgSalonType, string[]> = {
  hair_women: [
    "Balayage",
    "Ombre",
    "Highlights",
    "Bob",
    "Pixie Cut",
    "Layers",
    "Braids",
    "Updo",
    "Color Correction",
    "Extensions",
  ],
  nail: [
    "French Tips",
    "Gel Art",
    "Acrylic",
    "Chrome Nails",
    "Marble",
    "Ombre Nails",
    "3D Art",
    "Minimalist",
    "Gel Polish",
  ],
  makeup: [
    "Bridal",
    "Smokey Eye",
    "Natural Glam",
    "Evening Look",
    "Cut Crease",
    "Editorial",
    "No-Makeup Look",
    "Special FX",
  ],
  hair_men: [
    "Fade",
    "Undercut",
    "Buzz Cut",
    "Pompadour",
    "Beard Trim",
    "Line Up",
    "Taper",
    "Textured Crop",
  ],
  children: ["Kids Cut", "First Haircut", "Fun Styles", "School Cut", "Trim"],
  braiding: [
    "Box Braids",
    "Cornrows",
    "Twists",
    "Locs",
    "Protective Style",
    "Feed-In Braids",
  ],
  blowout_bar: [
    "Bouncy Blowout",
    "Sleek Straight",
    "Voluminous Curl",
    "Beach Waves",
    "Silk Press",
  ],
  hair_extensions: [
    "Tape-In",
    "Clip-In",
    "Sew-In",
    "Micro-Link",
    "Wig Styling",
    "Keratin Bond",
  ],
  skincare: [
    "Facial",
    "Chemical Peel",
    "Microdermabrasion",
    "LED Therapy",
    "Hydrafacial",
  ],
  lash_brow: [
    "Lash Extensions",
    "Lash Lift",
    "Brow Lamination",
    "Brow Tint",
    "Microblading",
  ],
  permanent_makeup: [
    "Lip Blush",
    "Eyeliner",
    "Brow Tattoo",
    "Areola",
    "Scar Camouflage",
  ],
  threading: [
    "Brow Threading",
    "Full Face",
    "Upper Lip",
    "Chin",
    "Brow Shaping",
  ],
  head_spa: [
    "Scalp Treatment",
    "Deep Cleanse",
    "Scalp Massage",
    "Hair Mask",
    "Detox",
  ],
  spa: ["Facial", "Body Treatment", "Anti-Aging", "Deep Cleanse", "Relaxation"],
  massage: [
    "Swedish",
    "Deep Tissue",
    "Hot Stone",
    "Sports",
    "Aromatherapy",
    "Reflexology",
  ],
  hammam: [
    "Traditional Hammam",
    "Body Scrub",
    "Foam Massage",
    "Steam Room",
    "Relaxation Package",
  ],
  sauna: [
    "Finnish Sauna",
    "Infrared",
    "Steam Room",
    "Cold Plunge",
    "Aufguss Ritual",
  ],
  ayurveda: [
    "Abhyanga",
    "Shirodhara",
    "Panchakarma",
    "Herbal Steam",
    "Marma Therapy",
  ],
  float_therapy: [
    "60-Min Float",
    "90-Min Float",
    "First Float",
    "Couples Float",
    "Float Package",
  ],
  waxing: ["Brazilian", "Full Leg", "Bikini", "Arm", "Full Body", "Face Wax"],
  tanning: [
    "Spray Tan",
    "UV Bed",
    "Airbrush",
    "Self-Tan Application",
    "Express Tan",
  ],
  laser: [
    "Laser Hair Removal",
    "IPL Facial",
    "Skin Rejuvenation",
    "Pigmentation",
    "Vein Treatment",
  ],
  electrolysis: ["Permanent Removal", "Face", "Body", "Bikini", "Consultation"],
  medspa: [
    "Botox",
    "Filler",
    "PRP",
    "Microneedling",
    "Chemical Peel",
    "Thread Lift",
  ],
  aesthetic_clinic: [
    "Consultation",
    "Laser Treatment",
    "Injectable",
    "Skin Tightening",
    "Body Sculpting",
  ],
  cryotherapy: [
    "Whole Body Cryo",
    "Local Cryo",
    "Cryo Facial",
    "Recovery Session",
    "Fat Freeze",
  ],
  iv_therapy: [
    "Hydration",
    "Immunity Boost",
    "Energy",
    "Beauty Drip",
    "Recovery",
    "NAD+",
  ],
  body_contouring: [
    "CoolSculpting",
    "Cavitation",
    "RF Treatment",
    "Lymphatic Drainage",
    "Wrap",
  ],
  hair_loss: [
    "PRP Hair",
    "Scalp Analysis",
    "Mesotherapy",
    "Low-Level Laser",
    "Consultation",
  ],
  tattoo: [
    "Traditional",
    "Realism",
    "Watercolor",
    "Minimalist",
    "Cover-Up",
    "Custom Design",
  ],
  piercing: ["Ear", "Nose", "Septum", "Belly", "Cartilage", "Dermal"],
  henna: [
    "Bridal Mehndi",
    "Arabic Design",
    "Indo-Arabic",
    "Moroccan",
    "Simple Design",
    "Festival",
  ],
  pet_grooming: [
    "Full Groom",
    "Bath & Brush",
    "Nail Trim",
    "Puppy Cut",
    "De-Shedding",
    "Breed Cut",
  ],
  beauty_center: [
    "Facial",
    "Manicure",
    "Hair Styling",
    "Makeup",
    "Full Package",
  ],
  multi: [
    "Balayage",
    "Ombre",
    "Highlights",
    "Bob",
    "Pixie Cut",
    "French Tips",
    "Gel Art",
    "Acrylic",
    "Chrome Nails",
    "Bridal",
    "Smokey Eye",
    "Natural Glam",
    "Fade",
    "Undercut",
    "Beard Trim",
  ],
};

// =============================================================================
// Category Visual Mappings (gradient + icon for wizard cards)
// =============================================================================

export interface CategoryVisual {
  gradient: string;
  icon: LucideIcon;
}

/**
 * Visual representation for each category.
 * Uses Tailwind gradient classes (oklch-friendly) and Lucide icons.
 */
export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  // Hair categories
  Balayage: { gradient: "from-amber-300 to-yellow-100", icon: Sparkles },
  Ombre: { gradient: "from-purple-400 to-pink-200", icon: Blend },
  Highlights: { gradient: "from-yellow-200 to-amber-100", icon: Sun },
  Bob: { gradient: "from-slate-300 to-gray-100", icon: Scissors },
  "Pixie Cut": { gradient: "from-rose-300 to-pink-100", icon: Star },
  Layers: { gradient: "from-teal-300 to-emerald-100", icon: Layers },
  Braids: { gradient: "from-orange-300 to-amber-100", icon: Waves },
  Updo: { gradient: "from-violet-300 to-purple-100", icon: Crown },
  "Color Correction": {
    gradient: "from-cyan-300 to-blue-100",
    icon: Palette,
  },
  Extensions: { gradient: "from-pink-300 to-rose-100", icon: Flower2 },

  // Nail categories
  "French Tips": { gradient: "from-pink-200 to-white", icon: Hand },
  "Gel Art": { gradient: "from-fuchsia-300 to-pink-100", icon: Paintbrush },
  Acrylic: { gradient: "from-rose-300 to-red-100", icon: Gem },
  "Chrome Nails": { gradient: "from-zinc-400 to-gray-200", icon: CircleDot },
  Marble: { gradient: "from-stone-300 to-neutral-100", icon: Droplets },
  "Ombre Nails": { gradient: "from-violet-300 to-fuchsia-100", icon: Blend },
  "3D Art": { gradient: "from-emerald-300 to-teal-100", icon: Origami },
  Minimalist: { gradient: "from-neutral-200 to-stone-50", icon: Minimize2 },
  "Gel Polish": { gradient: "from-red-300 to-pink-100", icon: Droplet },

  // Makeup categories
  Bridal: { gradient: "from-rose-200 to-pink-50", icon: Heart },
  "Smokey Eye": { gradient: "from-gray-500 to-zinc-200", icon: Eye },
  "Natural Glam": { gradient: "from-amber-200 to-yellow-50", icon: Sparkles },
  "Evening Look": { gradient: "from-indigo-400 to-violet-200", icon: Star },
  "Cut Crease": { gradient: "from-orange-300 to-amber-100", icon: Eye },
  Editorial: { gradient: "from-fuchsia-400 to-purple-200", icon: Brush },
  "No-Makeup Look": { gradient: "from-stone-200 to-neutral-50", icon: Leaf },
  "Special FX": { gradient: "from-red-400 to-orange-200", icon: Zap },

  // Barber categories
  Fade: { gradient: "from-zinc-400 to-stone-200", icon: Scissors },
  Undercut: { gradient: "from-slate-400 to-gray-200", icon: Layers },
  "Buzz Cut": { gradient: "from-stone-400 to-neutral-200", icon: CircleDot },
  Pompadour: { gradient: "from-amber-400 to-yellow-200", icon: Crown },
  "Beard Trim": { gradient: "from-orange-400 to-amber-200", icon: Scissors },
  "Line Up": { gradient: "from-gray-400 to-slate-200", icon: Minimize2 },
  Taper: { gradient: "from-neutral-400 to-stone-200", icon: Layers },
  "Textured Crop": { gradient: "from-teal-400 to-cyan-200", icon: Waves },

  // Spa categories
  Facial: { gradient: "from-sky-200 to-blue-50", icon: Droplets },
  "Body Treatment": { gradient: "from-emerald-200 to-green-50", icon: Leaf },
  "Anti-Aging": { gradient: "from-violet-200 to-purple-50", icon: Sparkles },
  "Deep Cleanse": { gradient: "from-cyan-200 to-sky-50", icon: Droplet },
  Relaxation: { gradient: "from-green-200 to-emerald-50", icon: Flower2 },
};

/**
 * Fallback visual for categories not in the preset map (e.g. custom categories).
 */
export const DEFAULT_CATEGORY_VISUAL: CategoryVisual = {
  gradient: "from-muted to-muted/50",
  icon: Palette,
};

// =============================================================================
// Suggested Tags per Category
// =============================================================================

export const SUGGESTED_TAGS: Record<string, string[]> = {
  // Hair
  Balayage: ["blonde", "natural", "sun-kissed", "dimensional"],
  Ombre: ["gradient", "two-tone", "fade", "color-melt"],
  Highlights: ["foil", "partial", "full", "babylights"],
  Bob: ["short", "blunt", "angled", "textured"],
  "Pixie Cut": ["short", "edgy", "modern", "textured"],
  Layers: ["long", "face-framing", "voluminous", "movement"],
  Braids: ["boho", "fishtail", "dutch", "cornrow"],
  Updo: ["elegant", "messy-bun", "chignon", "formal"],
  "Color Correction": ["fix", "tone", "neutralize", "repair"],
  Extensions: ["tape-in", "clip-in", "sew-in", "volume"],

  // Nail
  "French Tips": ["classic", "modern", "v-shape", "colored"],
  "Gel Art": ["floral", "abstract", "geometric", "freehand"],
  Acrylic: ["coffin", "stiletto", "almond", "square"],
  "Chrome Nails": ["mirror", "silver", "gold", "holographic"],
  Marble: ["stone", "swirl", "luxe", "white-marble"],
  "Ombre Nails": ["gradient", "baby-boomer", "two-tone", "glitter"],
  "3D Art": ["flowers", "rhinestones", "charms", "textured"],
  Minimalist: ["clean", "nude", "single-line", "negative-space"],
  "Gel Polish": ["long-lasting", "glossy", "matte", "shimmer"],

  // Makeup
  Bridal: ["wedding", "elegant", "timeless", "romantic"],
  "Smokey Eye": ["dramatic", "dark", "sultry", "evening"],
  "Natural Glam": ["dewy", "soft", "everyday", "fresh"],
  "Evening Look": ["glamorous", "bold", "night-out", "party"],
  "Cut Crease": ["sharp", "defined", "dramatic", "colorful"],
  Editorial: ["creative", "avant-garde", "fashion", "artistic"],
  "No-Makeup Look": ["skin-first", "minimal", "natural", "effortless"],
  "Special FX": ["prosthetics", "wounds", "fantasy", "theatrical"],
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Map org salon type to design catalog salonType field.
 */
export function toDesignSalonType(
  orgType: OrgSalonType | null | undefined,
  serviceArea?: DesignSalonType,
): DesignSalonType {
  if (orgType === "multi") return serviceArea ?? "hair";
  if (orgType === "hair_women" || orgType === "hair_men" || orgType === "spa")
    return "hair";
  return (orgType as DesignSalonType | undefined) ?? "hair";
}

/**
 * Get category list based on org type and optional service area.
 */
/** Map DesignSalonType (body area) → OrgSalonType key for CATEGORY_PRESETS lookup */
function designAreaToPresetKey(area: DesignSalonType): OrgSalonType {
  if (area === "hair") return "hair_women";
  return area as OrgSalonType;
}

export function getCategories(
  orgType: OrgSalonType | null | undefined,
  serviceArea?: DesignSalonType,
): string[] {
  if (orgType === "multi" && serviceArea) {
    return (
      CATEGORY_PRESETS[designAreaToPresetKey(serviceArea)] ??
      CATEGORY_PRESETS.hair_women
    );
  }
  return (
    CATEGORY_PRESETS[orgType ?? "hair_women"] ?? CATEGORY_PRESETS.hair_women
  );
}

/**
 * Get visual (gradient + icon) for a category.
 */
export function getCategoryVisual(category: string): CategoryVisual {
  return CATEGORY_VISUALS[category] ?? DEFAULT_CATEGORY_VISUAL;
}

/**
 * Get suggested tags for a category.
 */
export function getSuggestedTags(category: string): string[] {
  return SUGGESTED_TAGS[category] ?? [];
}
