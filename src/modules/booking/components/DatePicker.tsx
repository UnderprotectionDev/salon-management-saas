"use client";

import { Button } from "@/components/ui/button";
import { MAX_ADVANCE_DAYS } from "../lib/constants";

type DatePickerProps = {
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
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

export function DatePicker({ selectedDate, onDateSelect }: DatePickerProps) {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (let i = 0; i < MAX_ADVANCE_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

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

              return (
                <Button
                  key={date}
                  variant={isSelected ? "default" : "outline"}
                  className="flex flex-col h-auto py-3 px-4 min-w-[72px] shrink-0"
                  onClick={() => onDateSelect(date)}
                >
                  <span className="text-xs">{dayName}</span>
                  <span className="text-lg font-semibold">{dayNum}</span>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
