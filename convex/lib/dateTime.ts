/**
 * Date/Time utilities for the booking system.
 * The booking system uses minutes from midnight (number) for time representation.
 * The schedule resolver uses "HH:MM" strings. These helpers bridge the two formats.
 */

/**
 * Convert "HH:MM" string to minutes from midnight.
 * "09:00" → 540, "14:30" → 870
 */
export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to "HH:MM" string.
 * 540 → "09:00", 870 → "14:30"
 */
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Format minutes as display time (24-hour format).
 * 540 → "09:00", 870 → "14:30"
 */
export function formatTimeDisplay(minutes: number): string {
  return minutesToTimeString(minutes);
}

/**
 * Add minutes to a base time.
 * 540 + 60 = 600
 */
export function addMinutes(base: number, add: number): number {
  return base + add;
}

/**
 * Check if two time ranges overlap.
 * Ranges are [start, end) — end-exclusive.
 */
export function isOverlapping(
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Round up to the nearest 15-minute interval.
 * 45 → 45, 50 → 60, 60 → 60
 */
export function roundUpTo15(minutes: number): number {
  return Math.ceil(minutes / 15) * 15;
}

/**
 * Get today's date as "YYYY-MM-DD" string.
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convert a date string + minutes from midnight to epoch milliseconds.
 * Used for time-based policy checks (e.g., 2-hour cancellation window).
 * "2025-01-15" + 540 → epoch ms for 2025-01-15 09:00 UTC
 */
export function dateTimeToEpoch(
  date: string,
  minutesFromMidnight: number,
): number {
  const ms = new Date(`${date}T00:00:00Z`).getTime();
  return ms + minutesFromMidnight * 60 * 1000;
}

/**
 * Add days to a date string and return "YYYY-MM-DD".
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
