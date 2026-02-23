import {
  Flower2,
  Paintbrush,
  Palette,
  Scissors,
  ScissorsLineDashed,
} from "lucide-react";
import type { BusinessHours } from "@/components/business-hours/BusinessHoursEditor";

export type OrgSalonType = "hair" | "nail" | "makeup" | "barber" | "spa";

export const SALON_TYPE_OPTIONS: {
  value: OrgSalonType;
  label: string;
  icon: typeof Scissors;
}[] = [
  { value: "hair", label: "Hair Salon", icon: Scissors },
  { value: "nail", label: "Nail Salon", icon: Paintbrush },
  { value: "makeup", label: "Makeup", icon: Palette },
  { value: "barber", label: "Barber", icon: ScissorsLineDashed },
  { value: "spa", label: "Spa", icon: Flower2 },
];

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
