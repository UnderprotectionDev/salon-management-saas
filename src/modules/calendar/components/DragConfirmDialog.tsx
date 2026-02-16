"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DEFAULT_END_HOUR, DEFAULT_START_HOUR } from "../lib/constants";
import type { AppointmentWithDetails } from "../lib/types";
import { formatTime } from "../lib/utils";
import type { DragRescheduleData } from "./DayView";

type DragConfirmDialogProps = {
  data: DragRescheduleData | null;
  organizationId: Id<"organization">;
  date: string;
  /** All appointments for the current day — used for conflict detection. */
  appointments: AppointmentWithDetails[];
  onClose: () => void;
};

const SLOT_STEP = 15; // minutes between slot start times
const EXCLUDED_STATUSES = new Set(["cancelled", "no_show"]);

/**
 * Check whether a proposed slot [start, start+duration) overlaps with any
 * existing appointment on the target staff's schedule.
 */
function hasConflict(
  slotStart: number,
  slotEnd: number,
  staffAppointments: AppointmentWithDetails[],
): boolean {
  return staffAppointments.some(
    (a) => slotStart < a.endTime && slotEnd > a.startTime,
  );
}

export function DragConfirmDialog({
  data,
  organizationId,
  date,
  appointments,
  onClose,
}: DragConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reschedule = useMutation(api.appointments.reschedule);

  // Editable new start time — initialized from drag calculation
  const [selectedStart, setSelectedStart] = useState<number | null>(null);

  // Reset selected time when the appointment changes
  const prevApptId = useRef(data?.appointment._id);
  if (data && data.appointment._id !== prevApptId.current) {
    prevApptId.current = data.appointment._id;
    setSelectedStart(null);
  }

  if (!data) return null;

  const { appointment, newStaffId, newStartTime: dragStartTime } = data;
  const duration = appointment.endTime - appointment.startTime;
  const staffChanged = newStaffId !== appointment.staffId;

  // Target staff's existing appointments (exclude self + cancelled/no_show)
  const staffAppointments = appointments.filter(
    (a) =>
      a.staffId === newStaffId &&
      a._id !== appointment._id &&
      !EXCLUDED_STATUSES.has(a.status),
  );

  // Generate time slots with 15-min steps, each spanning the appointment's duration
  const startMin = DEFAULT_START_HOUR * 60;
  const endMin = DEFAULT_END_HOUR * 60;
  const slots: Array<{
    start: number;
    end: number;
    conflict: boolean;
  }> = [];

  for (let m = startMin; m + duration <= endMin; m += SLOT_STEP) {
    slots.push({
      start: m,
      end: m + duration,
      conflict: hasConflict(m, m + duration, staffAppointments),
    });
  }

  // Use user-selected time if changed, otherwise use drag-calculated time
  const effectiveStart = selectedStart ?? dragStartTime;
  const effectiveEnd = effectiveStart + duration;
  const effectiveConflict = hasConflict(
    effectiveStart,
    effectiveEnd,
    staffAppointments,
  );

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Validate bounds
    if (effectiveStart < startMin || effectiveEnd > endMin) {
      toast.error("Selected time is outside working hours");
      return;
    }

    if (effectiveConflict) {
      toast.error("Selected time conflicts with an existing appointment");
      return;
    }

    setIsSubmitting(true);
    try {
      await reschedule({
        organizationId,
        appointmentId: appointment._id,
        newDate: date,
        newStartTime: effectiveStart,
        newEndTime: effectiveEnd,
        newStaffId: staffChanged ? (newStaffId as Id<"staff">) : undefined,
      });
      toast.success("Appointment rescheduled");
      onClose();
    } catch (error: unknown) {
      const msg =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to reschedule appointment";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={!!data} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reschedule Appointment</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Move{" "}
                <span className="font-medium">{appointment.customerName}</span>
                &apos;s appointment?
              </p>

              <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium">
                    {formatTime(appointment.startTime)} -{" "}
                    {formatTime(appointment.endTime)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    ({duration} min)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">
                    {formatTime(effectiveStart)} - {formatTime(effectiveEnd)}
                  </span>
                  {effectiveConflict && (
                    <span className="text-xs text-destructive font-medium">
                      Conflict
                    </span>
                  )}
                </div>

                {staffChanged && (
                  <div className="text-muted-foreground mt-1">
                    Staff member will be changed.
                  </div>
                )}
              </div>

              {/* Time selector */}
              <div className="space-y-1">
                <label
                  htmlFor="drag-time-select"
                  className="text-sm font-medium"
                >
                  Select time
                </label>
                <Select
                  value={String(effectiveStart)}
                  onValueChange={(v) => setSelectedStart(Number(v))}
                >
                  <SelectTrigger id="drag-time-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    {slots.map((slot) => (
                      <SelectItem
                        key={slot.start}
                        value={String(slot.start)}
                        disabled={slot.conflict}
                        className={slot.conflict ? "opacity-40" : ""}
                      >
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                        {slot.conflict ? " (Busy)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isSubmitting || effectiveConflict}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Confirm Move
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
