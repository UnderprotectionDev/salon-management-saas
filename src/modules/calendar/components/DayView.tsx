"use client";

import { useEffect, useRef } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { DEFAULT_START_HOUR, PIXELS_PER_MINUTE } from "../lib/constants";
import type { AppointmentWithDetails } from "../lib/types";
import { StaffColumn } from "./StaffColumn";
import { TimeAxis } from "./TimeAxis";

type DayViewProps = {
  staffList: Doc<"staff">[];
  appointments: AppointmentWithDetails[];
  date: string;
  onAppointmentClick: (appt: AppointmentWithDetails) => void;
};

export function DayView({
  staffList,
  appointments,
  date,
  onAppointmentClick,
}: DayViewProps) {
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

  // Group appointments by staff
  const apptsByStaff = new Map<string, AppointmentWithDetails[]>();
  for (const staff of staffList) {
    apptsByStaff.set(staff._id, []);
  }
  for (const appt of appointments) {
    // Appointments without staffId are not displayed in the day view
    if (!appt.staffId) continue;
    const list = apptsByStaff.get(appt.staffId);
    if (list) list.push(appt);
  }

  // Current time indicator - only show on today
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isToday = date === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const showCurrentTime =
    isToday &&
    currentMinutes >= DEFAULT_START_HOUR * 60 &&
    currentMinutes <= 20 * 60;
  const currentTimeTop =
    (currentMinutes - DEFAULT_START_HOUR * 60) * PIXELS_PER_MINUTE;

  return (
    <div
      ref={scrollRef}
      className="relative overflow-auto rounded-lg border bg-background"
      style={{ maxHeight: "calc(100vh - 220px)" }}
    >
      <div className="flex min-w-fit">
        <TimeAxis />
        <div className="relative flex flex-1">
          {staffList.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-muted-foreground">
              No active staff members
            </div>
          ) : (
            staffList.map((staff) => (
              <StaffColumn
                key={staff._id}
                staff={staff}
                appointments={apptsByStaff.get(staff._id) ?? []}
                onAppointmentClick={onAppointmentClick}
              />
            ))
          )}

          {/* Current time indicator */}
          {showCurrentTime && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: currentTimeTop + 41 }}
            >
              <div className="h-0.5 bg-red-500">
                <div className="absolute -left-1 -top-1 size-2.5 rounded-full bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
