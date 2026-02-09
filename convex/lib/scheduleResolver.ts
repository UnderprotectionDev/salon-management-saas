import type { Doc } from "../_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type DaySchedule = {
  start: string;
  end: string;
  available: boolean;
};

type DefaultSchedule = Partial<Record<DayOfWeek, DaySchedule>>;

export type ResolvedDay = {
  date: string;
  available: boolean;
  effectiveStart: string | null;
  effectiveEnd: string | null;
  overtimeWindows: Array<{ start: string; end: string }>;
  overrideType: "custom_hours" | "day_off" | "time_off" | null;
  isTimeOff: boolean;
};

// =============================================================================
// Helpers
// =============================================================================

const DAY_MAP: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Get the day of week name from a "YYYY-MM-DD" date string.
 */
export function getDayOfWeek(dateStr: string): DayOfWeek {
  const date = new Date(`${dateStr}T00:00:00`);
  return DAY_MAP[date.getDay()];
}

/**
 * Generate an array of "YYYY-MM-DD" strings between start and end (inclusive).
 */
export function getDatesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (current <= last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// =============================================================================
// Schedule Resolution
// =============================================================================

/**
 * Resolve the effective schedule for a single day, combining default schedule,
 * override, and overtime entries.
 */
export function resolveSchedule(params: {
  date: string;
  defaultSchedule: DefaultSchedule | undefined;
  override: Doc<"scheduleOverrides"> | null;
  overtimeEntries: Doc<"staffOvertime">[];
}): ResolvedDay {
  const { date, defaultSchedule, override, overtimeEntries } = params;

  const dayOfWeek = getDayOfWeek(date);
  const defaultDay = defaultSchedule?.[dayOfWeek];

  let available: boolean;
  let effectiveStart: string | null;
  let effectiveEnd: string | null;
  let overrideType: ResolvedDay["overrideType"] = null;
  let isTimeOff = false;

  if (override) {
    overrideType = override.type;

    if (override.type === "day_off" || override.type === "time_off") {
      available = false;
      effectiveStart = null;
      effectiveEnd = null;
      isTimeOff = override.type === "time_off";
    } else {
      // custom_hours
      available = true;
      effectiveStart = override.startTime ?? null;
      effectiveEnd = override.endTime ?? null;
    }
  } else if (defaultDay) {
    available = defaultDay.available;
    effectiveStart = defaultDay.available ? defaultDay.start : null;
    effectiveEnd = defaultDay.available ? defaultDay.end : null;
  } else {
    available = false;
    effectiveStart = null;
    effectiveEnd = null;
  }

  const overtimeWindows = overtimeEntries.map((entry) => ({
    start: entry.startTime,
    end: entry.endTime,
  }));

  return {
    date,
    available,
    effectiveStart,
    effectiveEnd,
    overtimeWindows,
    overrideType,
    isTimeOff,
  };
}

/**
 * Resolve the effective schedule for a date range, combining default schedule,
 * overrides, and overtime entries.
 */
export function resolveScheduleRange(params: {
  startDate: string;
  endDate: string;
  defaultSchedule: DefaultSchedule | undefined;
  overrides: Doc<"scheduleOverrides">[];
  overtimeEntries: Doc<"staffOvertime">[];
}): ResolvedDay[] {
  const { startDate, endDate, defaultSchedule, overrides, overtimeEntries } =
    params;

  const dates = getDatesBetween(startDate, endDate);

  return dates.map((date) => {
    const override = overrides.find((o) => o.date === date) ?? null;
    const dayOvertime = overtimeEntries.filter((o) => o.date === date);

    return resolveSchedule({
      date,
      defaultSchedule,
      override,
      overtimeEntries: dayOvertime,
    });
  });
}
