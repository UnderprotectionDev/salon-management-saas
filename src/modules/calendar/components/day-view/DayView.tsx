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
import { Calendar } from "@/components/ui/calendar";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  PIXELS_PER_MINUTE,
  STAFF_HEADER_HEIGHT,
} from "../../lib/constants";
import type {
  AppointmentWithDetails,
  DragRescheduleData,
} from "../../lib/types";
import { formatTime } from "../../lib/utils";
import { AppointmentBlockOverlay } from "../dnd/AppointmentBlockOverlay";
import { StaffColumn } from "./StaffColumn";
import { TimeAxis } from "./TimeAxis";

type DayViewProps = {
  staffList: Doc<"staff">[];
  appointments: AppointmentWithDetails[];
  staffColorMap?: Map<string, string>;
  date: string;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onAppointmentClick: (appt: AppointmentWithDetails) => void;
  onDragReschedule?: (data: DragRescheduleData) => void;
  onSlotClick?: (staffId: string, minutes: number) => void;
  startHour?: number;
  endHour?: number;
};

export function DayView({
  staffList,
  appointments,
  staffColorMap,
  date,
  selectedDate,
  onDateSelect,
  onAppointmentClick,
  onDragReschedule,
  onSlotClick,
  startHour = DEFAULT_START_HOUR,
  endHour = DEFAULT_END_HOUR,
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
        (currentMinutes - startHour * 60) * PIXELS_PER_MINUTE - 100;
      scrollRef.current.scrollTop = Math.max(0, offset);
    }
  }, [startHour]);

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

  // Reactive current time — updates every 60s so the time indicator and
  // "happening now" panel stay fresh without full page re-render.
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

  // Current time indicator
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isToday = date === todayStr;
  const showCurrentTime =
    isToday &&
    currentMinutes >= startHour * 60 &&
    currentMinutes <= endHour * 60;
  const currentTimeTop = (currentMinutes - startHour * 60) * PIXELS_PER_MINUTE;

  // Happening now: appointments currently in progress
  const happeningNow = isToday
    ? appointments.filter(
        (a) =>
          a.status !== "cancelled" &&
          a.status !== "no_show" &&
          a.status !== "completed" &&
          a.startTime <= currentMinutes &&
          a.endTime > currentMinutes,
      )
    : [];

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

    // Validate bounds using dynamic hours
    if (newStartTime < startHour * 60 || newEndTime > endHour * 60) return;

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
      <div className="flex gap-4">
        {/* Main calendar area */}
        <div
          ref={scrollRef}
          className="relative flex-1 overflow-auto rounded-lg border bg-background"
          style={{ maxHeight: "calc(100vh - 220px)" }}
        >
          <div className="flex min-w-fit">
            <TimeAxis startHour={startHour} endHour={endHour} />
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
                    staffColor={staffColorMap?.get(staff._id)}
                    startHour={startHour}
                    endHour={endHour}
                  />
                ))
              )}

              {/* Current time indicator */}
              {showCurrentTime && (
                <div
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: currentTimeTop + STAFF_HEADER_HEIGHT }}
                >
                  <div className="relative h-0.5 bg-primary">
                    <div className="absolute -left-1 -top-1 size-2.5 rounded-full bg-primary" />
                    <span className="absolute -left-16 -top-2.5 text-[10px] font-medium text-primary tabular-nums">
                      {formatTime(currentMinutes)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar — desktop only */}
        <div className="hidden w-64 shrink-0 space-y-4 md:block">
          {/* Mini calendar */}
          {selectedDate && onDateSelect && (
            <div className="rounded-lg border bg-background p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && onDateSelect(d)}
                className="w-full"
              />
            </div>
          )}

          {/* Happening now */}
          <div className="rounded-lg border bg-background p-3">
            <div className="mb-2 flex items-center gap-2">
              {happeningNow.length > 0 && (
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
              )}
              <h3 className="text-sm font-semibold">Happening now</h3>
            </div>

            {happeningNow.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                No appointments at the moment
              </p>
            ) : (
              <div className="space-y-2">
                {happeningNow.map((appt) => (
                  <button
                    key={appt._id}
                    type="button"
                    className="w-full rounded-md border bg-muted/30 p-2 text-left transition-colors hover:bg-accent"
                    onClick={() => onAppointmentClick(appt)}
                  >
                    <div className="text-xs font-medium truncate">
                      {appt.customerName}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {appt.staffName}
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay - ghost of the appointment being dragged */}
      <DragOverlay dropAnimation={null}>
        {activeAppt ? (
          <AppointmentBlockOverlay
            appointment={activeAppt}
            staffColor={
              activeAppt.staffId
                ? staffColorMap?.get(activeAppt.staffId)
                : undefined
            }
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
