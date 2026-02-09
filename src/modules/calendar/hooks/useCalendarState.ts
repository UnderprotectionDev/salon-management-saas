"use client";

import { useState } from "react";
import { formatDateStr, getWeekRange } from "../lib/utils";

export type CalendarViewMode = "day" | "week";

export function useCalendarState() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateStr = formatDateStr(selectedDate);
  const weekRange = getWeekRange(selectedDate);

  function goToToday() {
    setSelectedDate(new Date());
  }

  function goToPrev() {
    const d = new Date(selectedDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 7);
    }
    setSelectedDate(d);
  }

  function goToNext() {
    const d = new Date(selectedDate);
    if (viewMode === "day") {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    setSelectedDate(d);
  }

  return {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    dateStr,
    weekRange,
    goToToday,
    goToPrev,
    goToNext,
  };
}
