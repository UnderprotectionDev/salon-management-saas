export const PIXELS_PER_MINUTE = 1.5;
export const HOUR_HEIGHT = PIXELS_PER_MINUTE * 60; // 90px
export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 20;
export const TOTAL_HOURS = DEFAULT_END_HOUR - DEFAULT_START_HOUR;
/** Height of the sticky staff header row in px (avatar + padding + border). */
export const STAFF_HEADER_HEIGHT = 41;
/** Maximum visible appointment pills in a month cell before showing "+N more". */
export const MAX_VISIBLE_IN_MONTH_CELL = 3;

/**
 * Palette of left-border colors used to visually distinguish staff members.
 * Staff are assigned colors by their index in the staff list.
 */
export const STAFF_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal
  "#f97316", // orange
  "#a855f7", // purple
] as const;

/** Get a staff color by index (wraps around). */
export function getStaffColor(index: number): string {
  return STAFF_COLORS[index % STAFF_COLORS.length];
}

/**
 * Palette of left-border colors used to visually distinguish services.
 * A service name is hashed to pick one consistently.
 */
export const SERVICE_BORDER_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal
  "#f97316", // orange
  "#a855f7", // purple
] as const;

/** Deterministic color for a given service name. */
export function getServiceColor(serviceName: string): string {
  let hash = 0;
  for (let i = 0; i < serviceName.length; i++) {
    hash = (hash * 31 + serviceName.charCodeAt(i)) | 0;
  }
  return SERVICE_BORDER_COLORS[Math.abs(hash) % SERVICE_BORDER_COLORS.length];
}

export {
  APPOINTMENT_STATUS_COLORS as STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS as STATUS_LABELS,
} from "@/lib/status-colors";

import type { AppointmentStatus } from "@/lib/status-colors";

/**
 * Semantic event color name for each appointment status.
 * Maps to big-calendar–style tinted card colors.
 */
type EventColorName =
  | "yellow"
  | "blue"
  | "green"
  | "purple"
  | "gray"
  | "red"
  | "orange";

const STATUS_EVENT_COLOR_MAP: Record<AppointmentStatus, EventColorName> = {
  pending: "yellow",
  confirmed: "blue",
  checked_in: "green",
  in_progress: "purple",
  completed: "gray",
  cancelled: "red",
  no_show: "orange",
};

/**
 * Tailwind classes for full-background tinted event cards.
 * Uses the centralized --status-* CSS variables from globals.css so
 * calendar blocks stay consistent with badges and other status indicators.
 */
export const EVENT_COLOR_CLASSES: Record<EventColorName, string> = {
  yellow:
    "border-status-pending-text/25 bg-status-pending-bg text-status-pending-text",
  blue: "border-status-confirmed-text/25 bg-status-confirmed-bg text-status-confirmed-text",
  green:
    "border-status-checked-in-text/25 bg-status-checked-in-bg text-status-checked-in-text",
  purple:
    "border-status-in-progress-text/25 bg-status-in-progress-bg text-status-in-progress-text",
  gray: "border-status-completed-text/20 bg-status-completed-bg text-status-completed-text",
  red: "border-status-cancelled-text/25 bg-status-cancelled-bg text-status-cancelled-text",
  orange:
    "border-status-no-show-text/25 bg-status-no-show-bg text-status-no-show-text",
};

/** Dot color classes for year view indicators. */
const EVENT_DOT_COLORS: Record<EventColorName, string> = {
  yellow: "bg-amber-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-purple-500",
  gray: "bg-gray-400",
  red: "bg-red-500",
  orange: "bg-orange-500",
};

/** Get the full-card color class string for an appointment status. */
export function getStatusEventColor(status: AppointmentStatus): string {
  return EVENT_COLOR_CLASSES[STATUS_EVENT_COLOR_MAP[status]];
}

/** Get the dot bg class for an appointment status (year view). */
export function getStatusDotColor(status: AppointmentStatus): string {
  return EVENT_DOT_COLORS[STATUS_EVENT_COLOR_MAP[status]];
}

/** Get the semantic color name for a status. */
export function getStatusColorName(status: AppointmentStatus): EventColorName {
  return STATUS_EVENT_COLOR_MAP[status];
}
