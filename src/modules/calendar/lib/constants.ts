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

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export const STATUS_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  pending: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-800",
  },
  confirmed: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-800",
  },
  checked_in: {
    bg: "bg-indigo-50",
    border: "border-indigo-300",
    text: "text-indigo-800",
  },
  in_progress: {
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-800",
  },
  completed: {
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-800",
  },
  cancelled: {
    bg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-500",
  },
  no_show: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800" },
};
