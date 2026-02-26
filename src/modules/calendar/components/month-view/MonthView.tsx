"use client";

import type { AppointmentWithDetails } from "../../lib/types";
import { formatDateStr, getMonthGridDates } from "../../lib/utils";
import { MonthDayCell } from "./MonthDayCell";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type MonthViewProps = {
  selectedDate: Date;
  appointments: AppointmentWithDetails[];
  staffColorMap?: Map<string, string>;
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appt: AppointmentWithDetails) => void;
};

export function MonthView({
  selectedDate,
  appointments,
  staffColorMap,
  onDayClick,
  onAppointmentClick,
}: MonthViewProps) {
  const gridDates = getMonthGridDates(selectedDate);
  const currentMonth = selectedDate.getMonth();
  const todayStr = formatDateStr(new Date());

  // Group appointments by date string
  const apptsByDate = new Map<string, AppointmentWithDetails[]>();
  for (const appt of appointments) {
    if (appt.status === "cancelled" || appt.status === "no_show") continue;
    const list = apptsByDate.get(appt.date);
    if (list) {
      list.push(appt);
    } else {
      apptsByDate.set(appt.date, [appt]);
    }
  }

  // Sort appointments within each day by start time
  for (const [, list] of apptsByDate) {
    list.sort((a, b) => a.startTime - b.startTime);
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      {/* Weekday header row */}
      <div className="grid grid-cols-7 border-b">
        {WEEKDAY_HEADERS.map((day) => (
          <div
            key={day}
            className="border-r last:border-r-0 px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {gridDates.map((date) => {
          const dateStr = formatDateStr(date);
          return (
            <MonthDayCell
              key={dateStr}
              date={date}
              isCurrentMonth={date.getMonth() === currentMonth}
              isToday={dateStr === todayStr}
              appointments={apptsByDate.get(dateStr) ?? []}
              staffColorMap={staffColorMap}
              onDayClick={onDayClick}
              onAppointmentClick={onAppointmentClick}
            />
          );
        })}
      </div>
    </div>
  );
}
