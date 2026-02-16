"use client";

import { useDroppable } from "@dnd-kit/core";
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
  onSlotClick?: (staffId: string, minutes: number) => void;
};

export function StaffColumn({
  staff,
  appointments,
  onAppointmentClick,
  onSlotClick,
}: StaffColumnProps) {
  const hours = Array.from(
    { length: DEFAULT_END_HOUR - DEFAULT_START_HOUR },
    (_, i) => DEFAULT_START_HOUR + i,
  );

  const { setNodeRef, isOver } = useDroppable({
    id: `staff-column-${staff._id}`,
    data: { staffId: staff._id },
  });

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSlotClick) return;
    // Only process clicks on the grid background, not on appointment blocks
    if ((e.target as HTMLElement).closest("button")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMinutes = Math.round(y / 1.5) + DEFAULT_START_HOUR * 60;
    // Snap to 15-minute grid
    const snapped = Math.round(rawMinutes / 15) * 15;
    onSlotClick(staff._id, snapped);
  };

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

      {/* Time grid + appointments (droppable area) */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Grid area uses click for slot selection */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: DnD droppable grid area with click-to-create */}
      <div
        ref={setNodeRef}
        className={`relative transition-colors ${isOver ? "bg-primary/5" : ""}`}
        onClick={handleGridClick}
      >
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
