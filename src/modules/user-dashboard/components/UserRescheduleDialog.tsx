"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getConvexErrorMessage } from "@/lib/convex-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker, TimeSlotGrid } from "@/modules/booking";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const generateSessionId = () =>
  `reschedule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function UserRescheduleDialog({
  appointmentId,
  organizationId,
  staffId,
  serviceIds,
}: {
  appointmentId: Id<"appointments">;
  organizationId: Id<"organization">;
  staffId: Id<"staff">;
  serviceIds: Id<"services">[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<number | null>(
    null,
  );
  const [selectedEndTime, setSelectedEndTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId] = useState(generateSessionId);

  const rescheduleByUser = useMutation(
    api.appointmentReschedule.rescheduleByUser,
  );

  const handleSlotSelect = (
    startTime: number,
    endTime: number,
    _lockResult: Id<"slotLocks"> | null,
  ) => {
    setSelectedStartTime(startTime);
    setSelectedEndTime(endTime);
  };

  const handleReschedule = async () => {
    if (
      !selectedDate ||
      selectedStartTime === null ||
      selectedEndTime === null
    ) {
      toast.error("Please select a new date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      await rescheduleByUser({
        appointmentId,
        newDate: selectedDate,
        newStartTime: selectedStartTime,
        newEndTime: selectedEndTime,
        sessionId,
      });
      toast.success("Appointment rescheduled successfully");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(getConvexErrorMessage(error, "Unexpected error occurred"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setSelectedDate(null);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Select a new date and time for your appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <DatePicker
            selectedDate={selectedDate}
            onDateSelect={(d) => {
              setSelectedDate(d);
              setSelectedStartTime(null);
              setSelectedEndTime(null);
            }}
          />
          {selectedDate && (
            <TimeSlotGrid
              organizationId={organizationId}
              date={selectedDate}
              serviceIds={serviceIds}
              staffId={staffId}
              selectedStartTime={selectedStartTime}
              sessionId={sessionId}
              onSlotSelect={handleSlotSelect}
            />
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {selectedStartTime !== null && (
              <Button onClick={handleReschedule} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Confirm Reschedule"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
