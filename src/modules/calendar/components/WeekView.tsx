"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useRef } from "react";
import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  HOUR_HEIGHT,
  PIXELS_PER_MINUTE,
} from "../lib/constants";
import type { AppointmentWithDetails } from "../lib/types";
import { formatDateStr } from "../lib/utils";
import { AppointmentBlock } from "./AppointmentBlock";
import { TimeAxis } from "./TimeAxis";

type WeekViewProps = {
  appointments: AppointmentWithDetails[];
  startDate: string;
  onAppointmentClick: (appt: AppointmentWithDetails) => void;
};

export function WeekView({
  appointments,
  startDate,
  onAppointmentClick,
}: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const offset =
        (currentMinutes - DEFAULT_START_HOUR * 60) * PIXELS_PER_MINUTE - 100;
      scrollRef.current.scrollTop = Math.max(0, offset);
    }
  }, []);

  // Generate 7 days starting from startDate
  const days: string[] = [];
  const start = new Date(`${startDate}T00:00:00`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(formatDateStr(d));
  }

  const todayStr = formatDateStr(new Date());

  // Group appointments by date
  const apptsByDate = new Map<string, AppointmentWithDetails[]>();
  for (const day of days) {
    apptsByDate.set(day, []);
  }
  for (const appt of appointments) {
    const list = apptsByDate.get(appt.date);
    if (list) list.push(appt);
  }

  const hours = Array.from(
    { length: DEFAULT_END_HOUR - DEFAULT_START_HOUR },
    (_, i) => DEFAULT_START_HOUR + i,
  );

  return (
    <div
      ref={scrollRef}
      className="overflow-auto rounded-lg border bg-background"
    >
      <div className="flex min-w-fit">
        <TimeAxis />
        <div className="flex flex-1">
          {days.map((day) => {
            const dayDate = parseISO(day);
            const isToday = day === todayStr;
            const dayAppts = (apptsByDate.get(day) ?? []).filter(
              (a) => a.status !== "cancelled" && a.status !== "no_show",
            );

            return (
              <div
                key={day}
                className={`min-w-[140px] flex-1 border-r last:border-r-0 ${isToday ? "bg-blue-50/30" : ""}`}
              >
                {/* Day header */}
                <div
                  className={`sticky top-0 z-10 border-b p-2 text-center ${isToday ? "bg-blue-50" : "bg-background"}`}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(dayDate, "EEE")}
                  </div>
                  <div
                    className={`text-sm font-medium ${isToday ? "text-blue-600" : ""}`}
                  >
                    {format(dayDate, "d")}
                  </div>
                </div>

                {/* Time grid + appointments */}
                <div className="relative">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-dashed border-muted"
                      style={{ height: HOUR_HEIGHT }}
                    />
                  ))}

                  {dayAppts.map((appt) => (
                    <AppointmentBlock
                      key={appt._id}
                      appointment={appt}
                      onClick={() => onAppointmentClick(appt)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
