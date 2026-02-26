"use client";

import { useState } from "react";
import { formatDateStr, getMonthRange, getWeekRange } from "../lib/utils";

export type CalendarViewMode = "day" | "week" | "month" | "year" | "agenda";

export function useCalendarState() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateStr = formatDateStr(selectedDate);
  const weekRange = getWeekRange(selectedDate);
  const monthRange = getMonthRange(selectedDate);
  const yearValue = selectedDate.getFullYear();

  function goToToday() {
    setSelectedDate(new Date());
  }

  function goToPrev() {
    const d = new Date(selectedDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() - 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() - 7);
    } else if (viewMode === "month" || viewMode === "agenda") {
      // Clamp day to avoid overflow (e.g. Jan 31 → Feb 28, not Mar 3)
      const targetMonth = d.getMonth() - 1;
      const targetYear =
        targetMonth < 0 ? d.getFullYear() - 1 : d.getFullYear();
      const clampedMonth = ((targetMonth % 12) + 12) % 12;
      const lastDay = new Date(targetYear, clampedMonth + 1, 0).getDate();
      d.setDate(Math.min(d.getDate(), lastDay));
      d.setMonth(targetMonth);
    } else {
      d.setFullYear(d.getFullYear() - 1);
    }
    setSelectedDate(d);
  }

  function goToNext() {
    const d = new Date(selectedDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() + 1);
    } else if (viewMode === "week") {
      d.setDate(d.getDate() + 7);
    } else if (viewMode === "month" || viewMode === "agenda") {
      // Clamp day to avoid overflow (e.g. Jan 31 → Feb 28, not Mar 3)
      const targetMonth = d.getMonth() + 1;
      const targetYear =
        targetMonth > 11 ? d.getFullYear() + 1 : d.getFullYear();
      const clampedMonth = targetMonth % 12;
      const lastDay = new Date(targetYear, clampedMonth + 1, 0).getDate();
      d.setDate(Math.min(d.getDate(), lastDay));
      d.setMonth(targetMonth);
    } else {
      d.setFullYear(d.getFullYear() + 1);
    }
    setSelectedDate(d);
  }

  /** Navigate to a specific date and optionally change view mode. */
  function goToDate(date: Date, mode?: CalendarViewMode) {
    setSelectedDate(new Date(date));
    if (mode) setViewMode(mode);
  }

  return {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    dateStr,
    weekRange,
    monthRange,
    yearValue,
    goToToday,
    goToPrev,
    goToNext,
    goToDate,
  };
}
