"use client";

import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  HOUR_HEIGHT,
  PIXELS_PER_MINUTE,
} from "../../lib/constants";
import type { AppointmentWithDetails } from "../../lib/types";
import { formatDateStr, parseLocalDate } from "../../lib/utils";
import { AppointmentBlock } from "../dnd/AppointmentBlock";

type WeekViewProps = {
  appointments: AppointmentWithDetails[];
  staffColorMap?: Map<string, string>;
  startDate: string;
  onAppointmentClick: (appt: AppointmentWithDetails) => void;
  startHour?: number;
  endHour?: number;
};

export function WeekView({
  appointments,
  staffColorMap,
  startDate,
  onAppointmentClick,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
}: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const offset =
        (currentMinutes - startHour * 60) * PIXELS_PER_MINUTE - 100;
      scrollRef.current.scrollTop = Math.max(0, offset);
    }
  }, [startHour]);

  // Generate 7 days starting from startDate
  const days: string[] = [];
  const start = parseLocalDate(startDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(formatDateStr(d));
  }

  // Reactive current time — updates every 60s
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setCurrentMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const todayStr = formatDateStr(new Date());
  const showCurrentTime =
    currentMinutes >= startHour * 60 && currentMinutes <= endHour * 60;

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
    { length: endHour - startHour },
    (_, i) => startHour + i,
  );

  return (
    <div
      ref={scrollRef}
      className="overflow-auto rounded-lg border bg-background"
    >
      <div className="min-w-fit">
        {/* Sticky header row */}
        <div className="sticky top-0 z-10 flex border-b bg-background">
          <div className="w-16 shrink-0 border-r" />
          <div className="flex flex-1">
            {days.map((day) => {
              const dayDate = parseLocalDate(day);
              const isToday = day === todayStr;
              return (
                <div
                  key={day}
                  className={`min-w-[140px] flex-1 border-r last:border-r-0 p-2 text-center ${isToday ? "bg-primary/5" : "bg-background"}`}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(dayDate, "EEE")}
                  </div>
                  <div className="mt-0.5 flex justify-center">
                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-full text-sm font-medium ${
                        isToday ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {format(dayDate, "d")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid content: time axis + day columns side by side */}
        <div className="flex">
          {/* Time axis */}
          <div className="relative w-16 shrink-0 border-r">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative border-b border-dashed border-muted"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2.5 right-2 text-xs text-muted-foreground tabular-nums">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="relative flex flex-1">
            {days.map((day) => {
              const isToday = day === todayStr;
              const dayAppts = (apptsByDate.get(day) ?? []).filter(
                (a) => a.status !== "cancelled" && a.status !== "no_show",
              );

              return (
                <div
                  key={day}
                  className={`min-w-[140px] flex-1 border-r last:border-r-0 ${isToday ? "bg-primary/3" : ""}`}
                >
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
                        isDragDisabled
                        staffColor={staffColorMap?.get(appt.staffId)}
                        startHour={startHour}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Current time indicator — scoped to today's column */}
            {showCurrentTime &&
              (() => {
                const todayIndex = days.indexOf(todayStr);
                if (todayIndex === -1) return null;
                const colPercent = 100 / days.length;
                return (
                  <div
                    className="absolute z-20 pointer-events-none"
                    style={{
                      top:
                        (currentMinutes - startHour * 60) * PIXELS_PER_MINUTE,
                      left: `${todayIndex * colPercent}%`,
                      width: `${colPercent}%`,
                    }}
                  >
                    <div className="relative h-0.5 bg-primary">
                      <div className="absolute -left-1 -top-1 size-2.5 rounded-full bg-primary" />
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>
    </div>
  );
}
