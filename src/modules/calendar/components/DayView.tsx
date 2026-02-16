"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import {
  DEFAULT_START_HOUR,
  PIXELS_PER_MINUTE,
  STAFF_HEADER_HEIGHT,
} from "../lib/constants";
import type { AppointmentWithDetails } from "../lib/types";
import { AppointmentBlockOverlay } from "./AppointmentBlock";
import { StaffColumn } from "./StaffColumn";
import { TimeAxis } from "./TimeAxis";

export type DragRescheduleData = {
  appointment: AppointmentWithDetails;
  newStaffId: string;
  newStartTime: number;
  newEndTime: number;
};

type DayViewProps = {
  staffList: Doc<"staff">[];
  appointments: AppointmentWithDetails[];
  date: string;
  onAppointmentClick: (appt: AppointmentWithDetails) => void;
  onDragReschedule?: (data: DragRescheduleData) => void;
  onSlotClick?: (staffId: string, minutes: number) => void;
};

export function DayView({
  staffList,
  appointments,
  date,
  onAppointmentClick,
  onDragReschedule,
  onSlotClick,
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeAppt, setActiveAppt] = useState<AppointmentWithDetails | null>(
    null,
  );

  // Activation distance to distinguish click vs drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

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
    if (!appt.staffId) continue;
    const list = apptsByStaff.get(appt.staffId);
    if (list) list.push(appt);
  }

  // Current time indicator
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

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as
      | { appointment: AppointmentWithDetails }
      | undefined;
    setActiveAppt(data?.appointment ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveAppt(null);

    const { active, over, delta } = event;
    if (!over || !onDragReschedule) return;

    const data = active.data.current as
      | { appointment: AppointmentWithDetails }
      | undefined;
    if (!data?.appointment) return;

    const appt = data.appointment;
    const overData = over.data.current as { staffId?: string } | undefined;
    const newStaffId = overData?.staffId ?? appt.staffId;
    if (!newStaffId) return;

    // Calculate new start time from vertical delta
    const minuteDelta = Math.round(delta.y / PIXELS_PER_MINUTE);
    // Snap to 15-minute intervals
    const rawNewStart = appt.startTime + minuteDelta;
    const newStartTime = Math.round(rawNewStart / 15) * 15;
    const duration = appt.endTime - appt.startTime;
    const newEndTime = newStartTime + duration;

    // Don't fire if nothing changed
    if (newStartTime === appt.startTime && newStaffId === appt.staffId) return;

    // Validate bounds
    if (newStartTime < DEFAULT_START_HOUR * 60 || newEndTime > 20 * 60) return;

    onDragReschedule({
      appointment: appt,
      newStaffId,
      newStartTime,
      newEndTime,
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
                  onSlotClick={onSlotClick}
                />
              ))
            )}

            {/* Current time indicator */}
            {showCurrentTime && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: currentTimeTop + STAFF_HEADER_HEIGHT }}
              >
                <div className="h-0.5 bg-red-500">
                  <div className="absolute -left-1 -top-1 size-2.5 rounded-full bg-red-500" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay - ghost of the appointment being dragged */}
      <DragOverlay dropAnimation={null}>
        {activeAppt ? (
          <AppointmentBlockOverlay appointment={activeAppt} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
