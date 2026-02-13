"use client";

import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { MAX_ADVANCE_DAYS } from "../lib/constants";

type DatePickerProps = {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  organizationId?: Id<"organization">;
  serviceIds?: Id<"services">[];
  staffId?: Id<"staff"> | null;
  maxAdvanceDays?: number;
};

type MonthGroup = {
  label: string;
  dates: string[];
};

function groupDatesByMonth(dates: string[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let currentKey = "";
  let currentGroup: MonthGroup | null = null;

  for (const dateStr of dates) {
    const d = new Date(`${dateStr}T00:00:00`);
    const label = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    if (label !== currentKey) {
      currentKey = label;
      currentGroup = { label, dates: [] };
      groups.push(currentGroup);
    }
    currentGroup!.dates.push(dateStr);
  }

  return groups;
}

export function DatePicker({
  selectedDate,
  onDateSelect,
  organizationId,
  serviceIds,
  staffId,
  maxAdvanceDays,
}: DatePickerProps) {
  const advanceDays = maxAdvanceDays ?? MAX_ADVANCE_DAYS;
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (let i = 0; i < advanceDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }

  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // Fetch date availability (optional — only when org and services are provided)
  const availability = useQuery(
    api.slots.availableDates,
    organizationId &&
      serviceIds &&
      serviceIds.length > 0 &&
      startDate &&
      endDate
      ? {
          organizationId,
          serviceIds,
          staffId: staffId ?? undefined,
          startDate,
          endDate,
        }
      : "skip",
  );

  // Build availability map
  const availabilityMap = new Map((availability ?? []).map((a) => [a.date, a]));

  const monthGroups = groupDatesByMonth(dates);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select a date for appointment
      </p>
      {monthGroups.map((group) => (
        <div key={group.label} className="space-y-2">
          <h4 className="text-sm font-medium">{group.label}</h4>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {group.dates.map((date) => {
              const d = new Date(`${date}T00:00:00`);
              const isToday = d.getTime() === today.getTime();
              const isTomorrow = d.getTime() === tomorrow.getTime();
              const dayName = isToday
                ? "Today"
                : isTomorrow
                  ? "Tomorrow"
                  : d.toLocaleDateString("en-US", { weekday: "short" });
              const dayNum = d.getDate();
              const isSelected = selectedDate === date;

              // Date availability
              const dateAvail = availabilityMap.get(date);
              const isUnavailable =
                availability !== undefined &&
                dateAvail !== undefined &&
                !dateAvail.hasAvailability;
              const hasAvailability = dateAvail?.hasAvailability === true;

              return (
                <Button
                  key={date}
                  variant={isSelected ? "default" : "outline"}
                  className={`flex flex-col h-auto py-3 px-4 min-w-[72px] shrink-0 relative ${
                    isUnavailable ? "opacity-40" : ""
                  }`}
                  disabled={isUnavailable}
                  onClick={() => onDateSelect(date)}
                >
                  <span className="text-xs">{dayName}</span>
                  <span className="text-lg font-semibold">{dayNum}</span>
                  {/* Availability dot indicator */}
                  {availability !== undefined && !isSelected && (
                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 size-1.5 rounded-full ${
                        hasAvailability
                          ? "bg-green-500"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
