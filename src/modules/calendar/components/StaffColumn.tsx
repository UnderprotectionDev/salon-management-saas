"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Doc } from "../../../../convex/_generated/dataModel";
import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  HOUR_HEIGHT,
} from "../lib/constants";
import type { AppointmentWithDetails } from "../lib/types";
import { AppointmentBlock } from "./AppointmentBlock";

type StaffColumnProps = {
  staff: Doc<"staff">;
  appointments: AppointmentWithDetails[];
  onAppointmentClick: (appt: AppointmentWithDetails) => void;
};

export function StaffColumn({
  staff,
  appointments,
  onAppointmentClick,
}: StaffColumnProps) {
  const hours = Array.from(
    { length: DEFAULT_END_HOUR - DEFAULT_START_HOUR },
    (_, i) => DEFAULT_START_HOUR + i,
  );

  return (
    <div className="min-w-[180px] flex-1 border-r last:border-r-0">
      {/* Staff header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background p-2">
        <Avatar className="size-6">
          <AvatarFallback className="text-[10px]">
            {staff.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium truncate">{staff.name}</span>
      </div>

      {/* Time grid + appointments */}
      <div className="relative">
        {/* Grid lines */}
        {hours.map((hour) => (
          <div
            key={hour}
            className="border-b border-dashed border-muted"
            style={{ height: HOUR_HEIGHT }}
          />
        ))}

        {/* Appointment blocks */}
        {appointments
          .filter((a) => a.status !== "cancelled" && a.status !== "no_show")
          .map((appt) => (
            <AppointmentBlock
              key={appt._id}
              appointment={appt}
              onClick={() => onAppointmentClick(appt)}
            />
          ))}
      </div>
    </div>
  );
}
