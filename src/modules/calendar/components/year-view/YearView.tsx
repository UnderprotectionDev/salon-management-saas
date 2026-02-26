"use client";

import type { AppointmentWithDetails } from "../../lib/types";
import { formatDateStr, getYearMonths } from "../../lib/utils";
import { YearMonthMini } from "./YearMonthMini";

type YearViewProps = {
  year: number;
  appointments: AppointmentWithDetails[];
  onMonthClick: (date: Date) => void;
  onDayClick: (date: Date) => void;
};

export function YearView({
  year,
  appointments,
  onMonthClick,
  onDayClick,
}: YearViewProps) {
  const months = getYearMonths(year);
  const now = new Date();
  const todayStr = formatDateStr(now);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Group appointments by date (exclude cancelled/no_show)
  const appointmentsByDate = new Map<string, AppointmentWithDetails[]>();
  for (const appt of appointments) {
    if (appt.status === "cancelled" || appt.status === "no_show") continue;
    const list = appointmentsByDate.get(appt.date);
    if (list) {
      list.push(appt);
    } else {
      appointmentsByDate.set(appt.date, [appt]);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {months.map((m) => (
        <YearMonthMini
          key={m.month}
          monthDate={m.date}
          monthName={m.name}
          appointmentsByDate={appointmentsByDate}
          todayStr={todayStr}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onMonthClick={onMonthClick}
          onDayClick={onDayClick}
        />
      ))}
    </div>
  );
}
