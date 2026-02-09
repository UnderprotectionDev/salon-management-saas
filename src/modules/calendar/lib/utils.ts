import { DEFAULT_START_HOUR, PIXELS_PER_MINUTE } from "./constants";

/**
 * Convert minutes from midnight to pixel offset from calendar top.
 */
export function minutesToPixelOffset(minutes: number): number {
  return (minutes - DEFAULT_START_HOUR * 60) * PIXELS_PER_MINUTE;
}

/**
 * Convert pixel offset to minutes from midnight.
 */
export function pixelOffsetToMinutes(pixels: number): number {
  return Math.round(pixels / PIXELS_PER_MINUTE) + DEFAULT_START_HOUR * 60;
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
