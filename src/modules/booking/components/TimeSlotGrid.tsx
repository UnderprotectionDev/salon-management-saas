"use client";

import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMinutesAsTime } from "../lib/constants";

type TimeSlotGridProps = {
  organizationId: Id<"organization">;
  date: string;
  serviceIds: Id<"services">[];
  staffId: Id<"staff"> | null;
  selectedStartTime: number | null;
  sessionId: string;
  onSlotSelect: (
    startTime: number,
    endTime: number,
    lockId: Id<"slotLocks"> | null,
    lockExpiresAt?: number | null,
  ) => void;
};

export function TimeSlotGrid({
  organizationId,
  date,
  serviceIds,
  staffId,
  selectedStartTime,
  sessionId,
  onSlotSelect,
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
    if (isLocking) return;
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
      onSlotSelect(slot.startTime, slot.endTime, result.lockId, result.expiresAt);
    } catch (error: any) {
      toast.error(error?.data?.message ?? "Failed to reserve time slot");
    } finally {
      setIsLocking(false);
    }
  };

  if (slots === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No available times for this date. Try another date or staff member.
        </p>
      </div>
    );
  }

  // Group slots by staff
  const byStaff = new Map<string, typeof slots>();
  for (const slot of slots) {
    const key = slot.staffId;
    const list = byStaff.get(key) ?? [];
    list.push(slot);
    byStaff.set(key, list);
  }

  // If a specific staff is selected, show flat grid
  if (staffId) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {slots.length} available time{slots.length !== 1 ? "s" : ""}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {slots.map((slot) => (
            <Button
              key={`${slot.staffId}-${slot.startTime}`}
              variant={
                selectedStartTime === slot.startTime ? "default" : "outline"
              }
              size="sm"
              disabled={isLocking}
              onClick={() => handleSlotClick(slot)}
            >
              {formatMinutesAsTime(slot.startTime)}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // No staff selected: group by staff
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {slots.length} available time{slots.length !== 1 ? "s" : ""}
      </p>
      {Array.from(byStaff.entries()).map(([sid, staffSlots]) => (
        <div key={sid}>
          <h4 className="text-sm font-medium mb-2">
            {staffSlots[0].staffName}
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {staffSlots.map((slot) => (
              <Button
                key={`${slot.staffId}-${slot.startTime}`}
                variant={
                  selectedStartTime === slot.startTime ? "default" : "outline"
                }
                size="sm"
                disabled={isLocking}
                onClick={() => handleSlotClick(slot)}
              >
                {formatMinutesAsTime(slot.startTime)}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
