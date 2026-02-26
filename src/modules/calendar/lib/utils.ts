import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  PIXELS_PER_MINUTE,
} from "./constants";

/**
 * Convert minutes from midnight to pixel offset from calendar top.
 */
export function minutesToPixelOffset(
  minutes: number,
  startHour = DEFAULT_START_HOUR,
): number {
  return (minutes - startHour * 60) * PIXELS_PER_MINUTE;
}

/**
 * Convert pixel offset to minutes from midnight.
 */
export function pixelOffsetToMinutes(
  pixels: number,
  startHour = DEFAULT_START_HOUR,
): number {
  return Math.round(pixels / PIXELS_PER_MINUTE) + startHour * 60;
}

/**
 * Parse a time string like "09:00" into minutes from midnight (540).
 */
export function timeStringToMinutes(str: string): number {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Convert a "YYYY-MM-DD" date string to a lowercase day name
 * (e.g. "monday", "tuesday").
 */
export function getDayName(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const names = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return names[d.getDay()];
}

type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

type BusinessHours = {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
};

/**
 * Compute the calendar hour range from organization business hours.
 * Iterates all 7 days, finds the earliest open time (floored to hour)
 * and the latest close time (ceiled to hour).
 * Falls back to DEFAULT_START_HOUR / DEFAULT_END_HOUR if no data.
 */
export function computeCalendarHourRange(businessHours?: BusinessHours): {
  startHour: number;
  endHour: number;
} {
  if (!businessHours) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }

  const days: (keyof BusinessHours)[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  let earliest = 24 * 60;
  let latest = 0;
  let hasAnyOpen = false;

  for (const day of days) {
    const dh = businessHours[day];
    if (!dh || dh.closed) continue;
    hasAnyOpen = true;
    earliest = Math.min(earliest, timeStringToMinutes(dh.open));
    latest = Math.max(latest, timeStringToMinutes(dh.close));
  }

  if (!hasAnyOpen) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }

  const s = Math.floor(earliest / 60);
  const e = Math.ceil(latest / 60);

  return {
    startHour: s,
    endHour: Math.max(e, s + 1),
  };
}

/**
 * Format minutes from midnight to HH:MM string.
 */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Get the Monday-Sunday range for the week containing a given date.
 */
export function getWeekRange(date: Date): {
  startDate: string;
  endDate: string;
} {
  const d = new Date(date);
  const day = d.getDay();
  // Shift so Monday = 0
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: formatDateStr(monday),
    endDate: formatDateStr(sunday),
  };
}

/**
 * Format a Date to "YYYY-MM-DD".
 */
export function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Get the full calendar grid range for a month view.
 * Covers Monday of the first week to Sunday of the last week (35-42 days).
 */
export function getMonthRange(date: Date): {
  startDate: string;
  endDate: string;
} {
  // First day of the month
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDay = first.getDay();
  // Monday-based: shift back to Monday
  const diff = firstDay === 0 ? -6 : 1 - firstDay;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() + diff);

  // Last day of the month
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const lastDay = last.getDay();
  // Forward to Sunday
  const endDiff = lastDay === 0 ? 0 : 7 - lastDay;
  const gridEnd = new Date(last);
  gridEnd.setDate(last.getDate() + endDiff);

  return {
    startDate: formatDateStr(gridStart),
    endDate: formatDateStr(gridEnd),
  };
}

/**
 * Get all dates in the month grid (Monday-aligned, 35-42 days).
 */
export function getMonthGridDates(date: Date): Date[] {
  const range = getMonthRange(date);
  const dates: Date[] = [];
  const current = parseLocalDate(range.startDate);
  const end = parseLocalDate(range.endDate);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Get 12 month data objects for the year view.
 */
export function getYearMonths(
  year: number,
): Array<{ month: number; name: string; date: Date }> {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return monthNames.map((name, i) => ({
    month: i,
    name,
    date: new Date(year, i, 1),
  }));
}

/**
 * Parse a "YYYY-MM-DD" string into a local Date (no timezone shift).
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}
