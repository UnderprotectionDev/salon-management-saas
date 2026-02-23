export const PIXELS_PER_MINUTE = 1.5;
export const HOUR_HEIGHT = PIXELS_PER_MINUTE * 60; // 90px
export const DEFAULT_START_HOUR = 8;
export const DEFAULT_END_HOUR = 20;
export const TOTAL_HOURS = DEFAULT_END_HOUR - DEFAULT_START_HOUR;
/** Height of the sticky staff header row in px (avatar + padding + border). */
export const STAFF_HEADER_HEIGHT = 41;

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
  APPOINTMENT_STATUS_LABELS as STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS as STATUS_COLORS,
} from "@/lib/status-colors";
