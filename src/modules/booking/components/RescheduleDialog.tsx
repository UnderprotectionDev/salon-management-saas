"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DatePicker } from "./DatePicker";
import { TimeSlotGrid } from "./TimeSlotGrid";

type RescheduleDialogProps = {
  appointmentId: Id<"appointments">;
  organizationId: Id<"organization">;
  currentDate: string;
  currentStartTime: number;
  currentEndTime: number;
  staffId: Id<"staff">;
  serviceIds: Id<"services">[];
};

const generateSessionId = () =>
  `reschedule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function RescheduleDialog({
  appointmentId,
  organizationId,
  currentDate,
  currentStartTime,
  currentEndTime,
  staffId,
  serviceIds,
}: RescheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<number | null>(
    null,
  );
  const [selectedEndTime, setSelectedEndTime] = useState<number | null>(null);
  const [newStaffId, setNewStaffId] = useState<Id<"staff"> | "">(staffId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId] = useState(generateSessionId);

  const reschedule = useMutation(api.appointments.reschedule);

  const staffMembers = useQuery(
    api.staff.listActive,
    open ? { organizationId } : "skip",
  );

  // Filter staff who can perform all services
  const eligibleStaff = (staffMembers ?? []).filter((s) => {
    const staffServiceIds = s.serviceIds ?? [];
    return serviceIds.every((sid: Id<"services">) =>
      staffServiceIds.includes(sid),
    );
  });

  const handleSlotSelect = (
    startTime: number,
    endTime: number,
    lockId: Id<"slotLocks"> | null,
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
      await reschedule({
        organizationId,
        appointmentId,
        newDate: selectedDate,
        newStartTime: selectedStartTime,
        newEndTime: selectedEndTime,
        newStaffId:
          newStaffId && newStaffId !== staffId
            ? (newStaffId as Id<"staff">)
            : undefined,
      });
      toast.success("Appointment rescheduled successfully");
      setOpen(false);
    } catch (error: unknown) {
      const msg =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to reschedule appointment";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setSelectedDate(null);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    setNewStaffId(staffId);
  };

  const activeStaffId = (newStaffId as Id<"staff">) || staffId;

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
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Staff Change (optional) */}
          {eligibleStaff.length > 1 && (
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select
                value={newStaffId}
                onValueChange={(v) => {
                  setNewStaffId(v as Id<"staff">);
                  setSelectedStartTime(null);
                  setSelectedEndTime(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleStaff.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date */}
          <DatePicker
            selectedDate={selectedDate}
            onDateSelect={(d) => {
              setSelectedDate(d);
              setSelectedStartTime(null);
              setSelectedEndTime(null);
            }}
          />

          {/* Time Slots */}
          {selectedDate && (
            <TimeSlotGrid
              organizationId={organizationId}
              date={selectedDate}
              serviceIds={serviceIds}
              staffId={activeStaffId}
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
