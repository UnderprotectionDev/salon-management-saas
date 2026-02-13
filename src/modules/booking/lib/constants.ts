/**
 * Booking module constants
 */

// Legacy step types (kept for backward compatibility)
export const BOOKING_STEPS = [
  "services",
  "staff",
  "datetime",
  "info",
  "confirm",
] as const;

export type BookingStep = (typeof BOOKING_STEPS)[number];

export const STEP_LABELS: Record<BookingStep, string> = {
  services: "Services",
  staff: "Staff",
  datetime: "Date & Time",
  info: "Your Info",
  confirm: "Confirm",
};

// Accordion-based booking panels (new)
export const BOOKING_PANELS = [
  "services",
  "staff",
  "datetime",
  "confirm",
] as const;

export type BookingPanel = (typeof BOOKING_PANELS)[number];

export const PANEL_LABELS: Record<BookingPanel, string> = {
  services: "Service Selection",
  staff: "Staff Selection",
  datetime: "Date & Time",
  confirm: "Details & Confirmation",
};

export const MAX_ADVANCE_DAYS = 30;

export function formatMinutesAsTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
