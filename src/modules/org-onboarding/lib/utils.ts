import { getDefaultBusinessHours } from "@/components/business-hours/BusinessHoursEditor";
import type { BusinessHours } from "@/components/business-hours/BusinessHoursEditor";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function computeHoursSummary(hours: BusinessHours): string {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const;
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const openDays: { index: number; open: string; close: string }[] = [];
  for (let i = 0; i < days.length; i++) {
    const d = hours[days[i]];
    if (d && !d.closed) {
      openDays.push({ index: i, open: d.open, close: d.close });
    }
  }

  if (openDays.length === 0) return "All days closed";

  const sameHours = openDays.every(
    (d) => d.open === openDays[0].open && d.close === openDays[0].close,
  );

  if (sameHours && openDays.length > 1) {
    const ranges: string[] = [];
    let rangeStart = openDays[0].index;
    let prev = openDays[0].index;

    for (let i = 1; i < openDays.length; i++) {
      if (openDays[i].index === prev + 1) {
        prev = openDays[i].index;
      } else {
        ranges.push(
          rangeStart === prev
            ? dayLabels[rangeStart]
            : `${dayLabels[rangeStart]}-${dayLabels[prev]}`,
        );
        rangeStart = openDays[i].index;
        prev = openDays[i].index;
      }
    }
    ranges.push(
      rangeStart === prev
        ? dayLabels[rangeStart]
        : `${dayLabels[rangeStart]}-${dayLabels[prev]}`,
    );

    return `Open ${openDays.length} days, ${ranges.join(", ")} ${openDays[0].open}-${openDays[0].close}`;
  }

  return `Open ${openDays.length} day${openDays.length === 1 ? "" : "s"}`;
}

export const DEFAULT_HOURS_SUMMARY = computeHoursSummary(
  getDefaultBusinessHours(),
);
