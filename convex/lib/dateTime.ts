/**
 * Date/Time utilities for the booking system.
 * The booking system uses minutes from midnight (number) for time representation.
 * The schedule resolver uses "HH:MM" strings. These helpers bridge the two formats.
 *
 * TIMEZONE NOTE: All appointment times are stored as local times (minutes from midnight)
 * in the salon's timezone. When converting to epoch for policy checks, we must account
 * for the organization's timezone (default: "Europe/Istanbul", UTC+3).
 */

/** Default timezone for Turkish salons */
const DEFAULT_TIMEZONE = "Europe/Istanbul";

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
 * Format minutes from midnight as short time string "HH:MM".
 * Shared utility — used by triggers, appointments, and frontend.
 * 540 → "09:00", 870 → "14:30"
 */
export function formatMinutesShort(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
 * Get the UTC offset in milliseconds for a given timezone at a specific date.
 * Uses Intl.DateTimeFormat to resolve the offset without external dependencies.
 */
function getTimezoneOffsetMs(
  timezone: string,
  refDate: Date = new Date(),
): number {
  // Get the timezone's local time representation
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(refDate);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  const tzYear = get("year");
  const tzMonth = get("month") - 1;
  const tzDay = get("day");
  let tzHour = get("hour");
  // Intl may return 24 for midnight in some locales
  if (tzHour === 24) tzHour = 0;
  const tzMinute = get("minute");
  const tzSecond = get("second");

  // Create a UTC date representing what the local clock shows
  const localAsUtc = Date.UTC(
    tzYear,
    tzMonth,
    tzDay,
    tzHour,
    tzMinute,
    tzSecond,
  );

  // The offset is the difference between "local time as UTC" and actual UTC
  return localAsUtc - refDate.getTime();
}

/**
 * Get today's date as "YYYY-MM-DD" string in the given timezone.
 * Defaults to Turkey timezone to ensure correct date after 21:00 UTC.
 */
export function getTodayDateString(
  timezone: string = DEFAULT_TIMEZONE,
): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA format gives YYYY-MM-DD
  return formatter.format(now);
}

/**
 * Convert a date string + minutes from midnight to epoch milliseconds.
 * Used for time-based policy checks (e.g., 2-hour cancellation window).
 *
 * The date and minutesFromMidnight represent LOCAL time in the salon's timezone.
 * We convert to UTC epoch by accounting for the timezone offset.
 *
 * "2025-01-15" + 540 + "Europe/Istanbul" → epoch ms for 2025-01-15 09:00 Istanbul time
 */
export function dateTimeToEpoch(
  date: string,
  minutesFromMidnight: number,
  timezone: string = DEFAULT_TIMEZONE,
): number {
  // Start with midnight UTC for this date
  const midnightUtc = new Date(`${date}T00:00:00Z`).getTime();
  // Add the minutes to get the "naive" time as if UTC
  const naiveEpoch = midnightUtc + minutesFromMidnight * 60 * 1000;
  // Get the timezone offset at this approximate time
  let offsetMs = getTimezoneOffsetMs(timezone, new Date(naiveEpoch));
  let adjustedEpoch = naiveEpoch - offsetMs;
  // Iterate to handle DST boundary edge cases
  const offsetMs2 = getTimezoneOffsetMs(timezone, new Date(adjustedEpoch));
  if (offsetMs2 !== offsetMs) {
    offsetMs = offsetMs2;
    adjustedEpoch = naiveEpoch - offsetMs;
  }
  return adjustedEpoch;
}

/**
 * Get current time as minutes from midnight in a given timezone.
 * Used for filtering past slots.
 */
export function getCurrentMinutes(timezone: string = DEFAULT_TIMEZONE): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  let hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  if (hour === 24) hour = 0;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * Add days to a date string and return "YYYY-MM-DD".
 * Uses UTC-safe parsing.
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
