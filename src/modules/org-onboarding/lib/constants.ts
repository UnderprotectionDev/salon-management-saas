import {
  Activity,
  Baby,
  CircleDot,
  Crosshair,
  Droplets,
  Eye,
  Feather,
  Flame,
  Flower2,
  Gem,
  Grip,
  Hand,
  Leaf,
  Link,
  Paintbrush,
  Palette,
  PawPrint,
  Pen,
  PenLine,
  Scissors,
  ScissorsLineDashed,
  Snowflake,
  Sparkles,
  Stethoscope,
  Sun,
  Syringe,
  Target,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import type { BusinessHours } from "@/components/business-hours/BusinessHoursEditor";

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
  | "beauty_center";

export type SalonTypeCategory = {
  key: string;
  label: string;
  types: { value: OrgSalonType; label: string; icon: typeof Scissors }[];
};

export const SALON_TYPE_CATEGORIES: SalonTypeCategory[] = [
  {
    key: "hair_styling",
    label: "Hair & Styling",
    types: [
      { value: "hair_women", label: "Women's Salon", icon: Scissors },
      { value: "hair_men", label: "Men's Salon", icon: ScissorsLineDashed },
      { value: "children", label: "Children's Salon", icon: Baby },
      { value: "braiding", label: "Braiding / Protective Styles", icon: Grip },
      { value: "blowout_bar", label: "Blow Dry Bar", icon: Wind },
      {
        value: "hair_extensions",
        label: "Extensions / Wig Studio",
        icon: Link,
      },
    ],
  },
  {
    key: "nails_makeup",
    label: "Nails & Makeup",
    types: [
      { value: "nail", label: "Nail Salon", icon: Paintbrush },
      { value: "makeup", label: "Makeup", icon: Palette },
    ],
  },
  {
    key: "skin_face",
    label: "Skin & Face",
    types: [
      { value: "skincare", label: "Skincare", icon: Sparkles },
      { value: "lash_brow", label: "Lash & Brow", icon: Eye },
      { value: "permanent_makeup", label: "Permanent Makeup", icon: PenLine },
      { value: "threading", label: "Threading / Brow Bar", icon: Target },
      { value: "head_spa", label: "Head Spa", icon: Droplets },
    ],
  },
  {
    key: "spa_wellness",
    label: "Spa & Wellness",
    types: [
      { value: "spa", label: "Spa", icon: Flower2 },
      { value: "massage", label: "Massage", icon: Hand },
      { value: "hammam", label: "Hammam", icon: Waves },
      { value: "sauna", label: "Sauna / Bath House", icon: Flame },
      { value: "ayurveda", label: "Ayurvedic Center", icon: Leaf },
      { value: "float_therapy", label: "Float Therapy", icon: Feather },
    ],
  },
  {
    key: "body_treatments",
    label: "Body Treatments",
    types: [
      { value: "waxing", label: "Waxing", icon: Zap },
      { value: "tanning", label: "Tanning", icon: Sun },
      { value: "laser", label: "Laser / IPL", icon: Crosshair },
      { value: "electrolysis", label: "Electrolysis", icon: Activity },
    ],
  },
  {
    key: "medical_aesthetic",
    label: "Medical & Aesthetic",
    types: [
      { value: "medspa", label: "Med Spa", icon: Syringe },
      {
        value: "aesthetic_clinic",
        label: "Aesthetic Clinic",
        icon: Stethoscope,
      },
      { value: "cryotherapy", label: "Cryotherapy", icon: Snowflake },
      { value: "iv_therapy", label: "IV Therapy", icon: Activity },
      { value: "body_contouring", label: "Body Contouring", icon: Target },
      {
        value: "hair_loss",
        label: "Hair Loss / Trichology",
        icon: Stethoscope,
      },
    ],
  },
  {
    key: "art_expression",
    label: "Art & Expression",
    types: [
      { value: "tattoo", label: "Tattoo", icon: Pen },
      { value: "piercing", label: "Piercing", icon: CircleDot },
      { value: "henna", label: "Henna / Mehndi", icon: Feather },
    ],
  },
  {
    key: "specialty",
    label: "Specialty",
    types: [
      { value: "pet_grooming", label: "Pet Grooming", icon: PawPrint },
      { value: "beauty_center", label: "Beauty Center", icon: Gem },
    ],
  },
];

/** Flat array of all salon type options (backward-compatible) */
export const SALON_TYPE_OPTIONS = SALON_TYPE_CATEGORIES.flatMap((c) => c.types);

export const STEPS = [
  {
    number: "01",
    label: "SALON DETAILS",
    title: "DEFINE YOUR SALON",
    description:
      "Create your salon workspace. This sets up your brand identity, booking URL, and service categories.",
    required: true,
  },
  {
    number: "02",
    label: "LOCATION",
    title: "WHERE TO FIND YOU",
    description:
      "Add your contact details and address so customers can reach and find you. All fields are optional.",
    required: false,
  },
  {
    number: "03",
    label: "SCHEDULE",
    title: "SET YOUR HOURS",
    description:
      "Configure your weekly business hours. This determines when customers can book appointments.",
    required: false,
  },
] as const;

export const ONBOARDING_INPUT =
  "border-0 border-b border-border rounded-none bg-transparent shadow-none px-0 h-12 text-base focus-visible:ring-0 focus-visible:border-brand";

export type HourPreset = {
  label: string;
  description: string;
  hours: BusinessHours;
};

const DAYS_ALL = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function buildPreset(
  openDays: readonly string[],
  open: string,
  close: string,
): BusinessHours {
  const hours: BusinessHours = {};
  for (const day of DAYS_ALL) {
    hours[day] = openDays.includes(day)
      ? { open, close, closed: false }
      : { open: "09:00", close: "18:00", closed: true };
  }
  return hours;
}

export const HOUR_PRESETS: HourPreset[] = [
  {
    label: "Standard",
    description: "Mon-Fri 09:00-18:00",
    hours: buildPreset(
      ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "09:00",
      "18:00",
    ),
  },
  {
    label: "Extended",
    description: "Mon-Sat 09:00-20:00",
    hours: buildPreset(
      ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      "09:00",
      "20:00",
    ),
  },
  {
    label: "Weekend",
    description: "Wed-Sun 10:00-19:00",
    hours: buildPreset(
      ["wednesday", "thursday", "friday", "saturday", "sunday"],
      "10:00",
      "19:00",
    ),
  },
];
