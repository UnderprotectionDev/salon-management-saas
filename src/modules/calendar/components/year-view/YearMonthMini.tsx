"use client";

import { getStatusColorName, getStatusDotColor } from "../../lib/constants";
import type { AppointmentWithDetails } from "../../lib/types";
import { formatDateStr, getMonthGridDates } from "../../lib/utils";

const MINI_WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type YearMonthMiniProps = {
  monthDate: Date;
  monthName: string;
  appointmentsByDate: Map<string, AppointmentWithDetails[]>;
  todayStr: string;
  currentMonth: number;
  currentYear: number;
  onMonthClick: (date: Date) => void;
  onDayClick: (date: Date) => void;
};

export function YearMonthMini({
  monthDate,
  monthName,
  appointmentsByDate,
  todayStr,
  currentMonth,
  currentYear,
  onMonthClick,
  onDayClick,
}: YearMonthMiniProps) {
  const gridDates = getMonthGridDates(monthDate);
  const month = monthDate.getMonth();
  const isCurrentMonth =
    month === currentMonth && monthDate.getFullYear() === currentYear;

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Month header */}
      <button
        type="button"
        className={`flex w-full items-center justify-center border-b px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent ${
          isCurrentMonth
            ? "bg-primary/5 text-primary"
            : "bg-muted/30 text-foreground"
        }`}
        onClick={() => onMonthClick(monthDate)}
      >
        {monthName}
      </button>

      {/* Body */}
      <div className="bg-background p-3">
        {/* Weekday headers */}
        <div className="mb-1 grid grid-cols-7 gap-0">
          {MINI_WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0">
          {gridDates.map((date) => {
            const dateStr = formatDateStr(date);
            const isThisMonth = date.getMonth() === month;
            const isToday = dateStr === todayStr;
            const dayAppointments = appointmentsByDate.get(dateStr);

            // Get unique status color dots (max 3)
            const uniqueColors: string[] = [];
            if (dayAppointments && isThisMonth) {
              const seen = new Set<string>();
              for (const appt of dayAppointments) {
                const colorName = getStatusColorName(appt.status);
                if (!seen.has(colorName)) {
                  seen.add(colorName);
                  uniqueColors.push(getStatusDotColor(appt.status));
                  if (uniqueColors.length >= 3) break;
                }
              }
            }

            return (
              <button
                key={dateStr}
                type="button"
                className={`relative flex h-11 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] transition-colors hover:bg-accent ${
                  isToday
                    ? "bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                    : isThisMonth
                      ? "text-foreground"
                      : "text-muted-foreground/30"
                }`}
                onClick={() => onDayClick(date)}
                disabled={!isThisMonth}
              >
                {date.getDate()}
                {uniqueColors.length > 0 && (
                  <div className="flex items-center gap-0.5">
                    {uniqueColors.map((dotClass) => (
                      <span
                        key={dotClass}
                        className={`size-1 rounded-full ${isToday ? "bg-primary-foreground" : dotClass}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
