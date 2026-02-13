"use client";

import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type WeeklyDatePickerProps = {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  organizationId: Id<"organization">;
  serviceIds: Id<"services">[];
  staffId: Id<"staff"> | null;
  disabled?: boolean;
};

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function getWeekStart(offset: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  // Monday = 0 offset
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7) + offset * 7);
  return monday;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function WeeklyDatePicker({
  selectedDate,
  onDateSelect,
  organizationId,
  serviceIds,
  staffId,
  disabled = false,
}: WeeklyDatePickerProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = getWeekStart(weekOffset);
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDates.push(formatDateStr(d));
  }

  const startDate = weekDates[0];
  const endDate = weekDates[weekDates.length - 1];

  // Month/year label
  const firstDate = new Date(`${weekDates[0]}T00:00:00`);
  const lastDate = new Date(`${weekDates[6]}T00:00:00`);
  const monthLabel =
    firstDate.getMonth() === lastDate.getMonth()
      ? firstDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : `${firstDate.toLocaleDateString("en-US", { month: "short" })} / ${lastDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

  // Fetch availability for this week
  const availability = useQuery(
    api.slots.availableDates,
    organizationId && serviceIds.length > 0 && startDate && endDate
      ? {
          organizationId,
          serviceIds,
          staffId: staffId ?? undefined,
          startDate,
          endDate,
        }
      : "skip",
  );

  const availabilityMap = new Map((availability ?? []).map((a) => [a.date, a]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={disabled || weekOffset === 0}
          className="size-8"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs uppercase tracking-widest font-semibold">
          {monthLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWeekOffset((w) => w + 1)}
          disabled={disabled || weekOffset >= 4}
          className="size-8"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] uppercase tracking-widest text-muted-foreground font-medium pb-1"
          >
            {label}
          </div>
        ))}

        {/* Date cells */}
        {weekDates.map((dateStr) => {
          const d = new Date(`${dateStr}T00:00:00`);
          const dayNum = d.getDate();
          const isPast = d < today;
          const isSelected = selectedDate === dateStr;
          const dateAvail = availabilityMap.get(dateStr);
          const hasSlots = dateAvail?.hasAvailability === true;
          const slotCount = dateAvail?.slotCount ?? 0;
          const isDisabled =
            isPast || (availability !== undefined && !hasSlots);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => !isDisabled && onDateSelect(dateStr)}
              disabled={isDisabled}
              className={`flex flex-col items-center py-3 px-1 border transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : isDisabled
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:bg-accent/50"
              }`}
            >
              <span className="text-lg font-semibold tabular-nums">
                {dayNum}
              </span>
              {!isDisabled && availability !== undefined && slotCount > 0 && (
                <span
                  className={`text-[10px] ${
                    isSelected
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {slotCount} {slotCount === 1 ? "slot" : "slots"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
