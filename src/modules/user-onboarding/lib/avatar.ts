import { genConfig } from "react-nice-avatar";
import type { AvatarConfig } from "react-nice-avatar";

export type Gender = "male" | "female" | "unspecified";

// ─── Palettes ────────────────────────────────────────────────────────────────

const FACE_COLORS = [
  "#F9C9B6", // light peach
  "#FDDBB4", // warm beige
  "#EDB98A", // golden
  "#D08B5B", // medium brown
  "#AC6651", // caramel
  "#614335", // deep brown
  "#C68642", // tan
  "#8D5524", // dark tan
];

const HAIR_COLORS = [
  "#000000", // black
  "#2C1B18", // dark brown
  "#77311D", // brown
  "#B5651D", // light brown
  "#D4A017", // blonde
  "#A0522D", // sienna
  "#808080", // gray
  "#C0C0C0", // silver
  "#FC909F", // pink
  "#506AF4", // blue
  "#F48150", // orange
  "#9B59B6", // purple
  "#E74C3C", // red
];

const BG_COLORS = [
  "#9287FF", // lavender
  "#6BD9E9", // cyan
  "#FC909F", // pink
  "#F4D150", // yellow
  "#E0DDFF", // pale violet
  "#D2EFF3", // pale cyan
  "#FFD28F", // pale orange
  "#FFABD8", // pale pink
  "#506AF4", // blue
  "#F48150", // coral
  "#B0E0E6", // powder blue
  "#98FB98", // pale green
  "#DDA0DD", // plum
  "#87CEEB", // sky blue
  "#F0E68C", // khaki
  "#20B2AA", // light sea green
];

const EYE_STYLES = ["circle", "oval", "smile"] as const;
const NOSE_STYLES = ["short", "long", "round"] as const;
const MOUTH_STYLES = ["laugh", "smile", "peace"] as const;
const SHIRT_STYLES = ["hoody", "short", "polo"] as const;
const EAR_SIZES = ["small", "big"] as const;

// Weighted: mostly no glasses but occasional
const GLASSES_STYLES = [
  "none",
  "none",
  "none",
  "none",
  "round",
  "square",
] as const;

const MALE_HAIR_STYLES = ["normal", "thick", "mohawk"] as const;
// Weighted: mostly no hat so hair is visible
const MALE_HAT_STYLES = [
  "none",
  "none",
  "none",
  "beanie",
  "turban",
] as const;

const FEMALE_HAIR_STYLES = ["womanLong", "womanShort"] as const;
// Weighted: earings appear occasionally
const FEMALE_ACCESSORIES = ["none", "none", "earings"] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Generator ───────────────────────────────────────────────────────────────

/**
 * Generate a react-nice-avatar config with explicit variety across all
 * visual dimensions: skin tone, hair color/style, eyes, nose, mouth,
 * shirt, glasses, hat, ear size, background color.
 *
 * Male:
 *   - sex: "man" | hairStyle: normal/thick/mohawk
 *   - occasional hat (beanie/turban) — hair hidden when hat worn
 *   - eyeBrowStyle: "up"
 *
 * Female:
 *   - sex: "woman" | hairStyle: womanLong/womanShort (always visible)
 *   - hatStyle: "none" (to keep feminine hair visible)
 *   - eyeBrowStyle: "upWoman"
 *   - occasional earings
 *
 * Unspecified: all dimensions fully random
 */
export function generateAvatarConfig(gender?: Gender | null): AvatarConfig {
  const shared = {
    faceColor: pickRandom(FACE_COLORS),
    hairColor: pickRandom(HAIR_COLORS),
    bgColor: pickRandom(BG_COLORS),
    eyeStyle: pickRandom(EYE_STYLES),
    noseStyle: pickRandom(NOSE_STYLES),
    mouthStyle: pickRandom(MOUTH_STYLES),
    shirtStyle: pickRandom(SHIRT_STYLES),
    earSize: pickRandom(EAR_SIZES),
    glassesStyle: pickRandom(GLASSES_STYLES),
  };

  if (gender === "male") {
    const hatStyle = pickRandom(MALE_HAT_STYLES);
    // When a hat is worn the hair is hidden — still pick a style for the
    // edge case where genConfig needs it, but it won't be visible.
    const hairStyle =
      hatStyle === "none" ? pickRandom(MALE_HAIR_STYLES) : "normal";
    return genConfig({
      ...shared,
      sex: "man",
      eyeBrowStyle: "up",
      hairStyle,
      hatStyle,
    });
  }

  if (gender === "female") {
    return genConfig({
      ...shared,
      sex: "woman",
      eyeBrowStyle: "upWoman",
      hairStyle: pickRandom(FEMALE_HAIR_STYLES),
      hatStyle: "none",
      accessoriesStyle: pickRandom(FEMALE_ACCESSORIES),
    });
  }

  // Unspecified: fully explicit randomization (no sex constraint)
  return genConfig(shared);
}

export function generateAvatarSet(
  gender?: Gender | null,
  count = 6,
): AvatarConfig[] {
  return Array.from({ length: count }, () => generateAvatarConfig(gender));
}

export type { AvatarConfig };
