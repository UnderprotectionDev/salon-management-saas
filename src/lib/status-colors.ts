/**
 * Centralized appointment status colors, labels, and badge classes.
 *
 * All consumers should import from here instead of defining local status maps.
 * Colors reference CSS variables defined in globals.css (--status-*).
 */

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export const APPOINTMENT_STATUS_COLORS: Record<
  AppointmentStatus,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: "bg-status-pending-bg",
    text: "text-status-pending-text",
    border: "border-status-pending-text/30",
  },
  confirmed: {
    bg: "bg-status-confirmed-bg",
    text: "text-status-confirmed-text",
    border: "border-status-confirmed-text/30",
  },
  checked_in: {
    bg: "bg-status-checked-in-bg",
    text: "text-status-checked-in-text",
    border: "border-status-checked-in-text/30",
  },
  in_progress: {
    bg: "bg-status-in-progress-bg",
    text: "text-status-in-progress-text",
    border: "border-status-in-progress-text/30",
  },
  completed: {
    bg: "bg-status-completed-bg",
    text: "text-status-completed-text",
    border: "border-status-completed-text/30",
  },
  cancelled: {
    bg: "bg-status-cancelled-bg",
    text: "text-status-cancelled-text",
    border: "border-status-cancelled-text/30",
  },
  no_show: {
    bg: "bg-status-no-show-bg",
    text: "text-status-no-show-text",
    border: "border-status-no-show-text/30",
  },
};

/** Pre-composed badge class strings: `"bg-... text-..."` */
export const APPOINTMENT_STATUS_BADGE_CLASSES: Record<
  AppointmentStatus,
  string
> = Object.fromEntries(
  (Object.keys(APPOINTMENT_STATUS_COLORS) as AppointmentStatus[]).map((s) => [
    s,
    `${APPOINTMENT_STATUS_COLORS[s].bg} ${APPOINTMENT_STATUS_COLORS[s].text}`,
  ]),
) as Record<AppointmentStatus, string>;

/** Segment colors for stacked bars / charts (solid background classes). */
export const APPOINTMENT_STATUS_BAR_COLORS: Record<AppointmentStatus, string> =
  {
    pending: "bg-status-pending-text",
    confirmed: "bg-status-confirmed-text",
    checked_in: "bg-status-checked-in-text",
    in_progress: "bg-status-in-progress-text",
    completed: "bg-status-completed-text",
    cancelled: "bg-status-cancelled-text",
    no_show: "bg-status-no-show-text",
  };
