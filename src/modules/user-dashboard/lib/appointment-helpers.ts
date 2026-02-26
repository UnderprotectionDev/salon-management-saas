export const ACTIVE_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "in_progress",
];
export const PAST_STATUSES = ["completed", "cancelled", "no_show"];

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function isPastStatus(status: string): boolean {
  return PAST_STATUSES.includes(status);
}

export function canModifyAppointment(
  date: string,
  startTime: number,
  status: string,
  cancellationPolicyHours = 2,
): boolean {
  if (!isActiveStatus(status)) return false;
  const parts = date.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (!year || !month || !day) return false;
  const hours = Math.floor(startTime / 60);
  const minutes = startTime % 60;
  const appointmentEpoch = Date.UTC(year, month - 1, day, hours, minutes);
  const policyBefore = appointmentEpoch - cancellationPolicyHours * 60 * 60 * 1000;
  return Date.now() < policyBefore;
}
