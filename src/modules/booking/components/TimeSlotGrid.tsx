"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMinutesAsTime } from "../lib/constants";

type TimeSlotGridProps = {
  organizationId: Id<"organization">;
  date: string;
  serviceIds: Id<"services">[];
  staffId: Id<"staff"> | null;
  selectedStartTime: number | null;
  selectedStaffId?: Id<"staff"> | null;
  sessionId: string;
  onSlotSelect: (
    startTime: number,
    endTime: number,
    lockId: Id<"slotLocks"> | null,
    lockExpiresAt?: number | null,
    slotStaffId?: Id<"staff">,
  ) => void;
  disabled?: boolean;
};

export function TimeSlotGrid({
  organizationId,
  date,
  serviceIds,
  staffId,
  selectedStartTime,
  selectedStaffId,
  sessionId,
  onSlotSelect,
  disabled = false,
}: TimeSlotGridProps) {
  const [isLocking, setIsLocking] = useState(false);
  const slots = useQuery(api.slots.available, {
    organizationId,
    date,
    serviceIds,
    staffId: staffId ?? undefined,
    sessionId,
  });

  const acquireLock = useMutation(api.slotLocks.acquire);

  const handleSlotClick = async (slot: NonNullable<typeof slots>[number]) => {
    if (isLocking || disabled) return;
    setIsLocking(true);
    try {
      const result = await acquireLock({
        organizationId,
        staffId: slot.staffId,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        sessionId,
      });
      onSlotSelect(
        slot.startTime,
        slot.endTime,
        result.lockId,
        result.expiresAt,
        slot.staffId,
      );
    } catch (error: unknown) {
      const msg =
        (error as { data?: { message?: string } })?.data?.message ??
        "Could not reserve time slot";
      toast.error(msg);
    } finally {
      setIsLocking(false);
    }
  };

  if (slots === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No available times found for this date.
      </div>
    );
  }

  const isButtonDisabled = isLocking || disabled;

  // If a specific staff is selected, show flat grid
  if (staffId) {
    return (
      <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {slots.map((slot) => {
            const isSelected = selectedStartTime === slot.startTime;
            return (
              <button
                key={`${slot.staffId}-${slot.startTime}`}
                type="button"
                onClick={() => handleSlotClick(slot)}
                disabled={isButtonDisabled}
                aria-pressed={isSelected}
                className={`py-2.5 px-1 text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent/50"
                }`}
              >
                {formatMinutesAsTime(slot.startTime)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // No staff selected: group by staff
  const byStaff = new Map<string, typeof slots>();
  for (const slot of slots) {
    const key = slot.staffId;
    const list = byStaff.get(key) ?? [];
    list.push(slot);
    byStaff.set(key, list);
  }

  return (
    <div
      className={`space-y-4 ${disabled ? "opacity-40 pointer-events-none" : ""}`}
    >
      {Array.from(byStaff.entries()).map(([sid, staffSlots]) => (
        <div key={sid}>
          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            {staffSlots[0].staffName}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {staffSlots.map((slot) => {
              const isSelected =
                selectedStartTime === slot.startTime &&
                (selectedStaffId === undefined || selectedStaffId === slot.staffId);
              return (
                <button
                  key={`${slot.staffId}-${slot.startTime}`}
                  type="button"
                  onClick={() => handleSlotClick(slot)}
                  disabled={isButtonDisabled}
                  aria-pressed={isSelected}
                  className={`py-2.5 px-1 text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent/50"
                  }`}
                >
                  {formatMinutesAsTime(slot.startTime)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
