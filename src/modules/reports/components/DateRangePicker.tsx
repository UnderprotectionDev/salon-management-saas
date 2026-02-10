"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDateRange } from "../hooks/useDateRange";

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDate(str: string): Date {
  return new Date(`${str}T00:00:00`);
}

function formatDisplay(str: string): string {
  return parseDate(str).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const presets = [
  {
    label: "Today",
    getValue: () => {
      const now = formatDate(new Date());
      return { from: now, to: now };
    },
  },
  {
    label: "Last 7 days",
    getValue: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: formatDate(from), to: formatDate(now) };
    },
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: formatDate(from), to: formatDate(now) };
    },
  },
  {
    label: "This month",
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatDate(from), to: formatDate(now) };
    },
  },
  {
    label: "Last month",
    getValue: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: formatDate(from), to: formatDate(to) };
    },
  },
];

function getDayCount(range: DateRange | undefined): number {
  if (!range?.from || !range?.to) return 0;
  return Math.ceil(
    (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function DateRangePicker() {
  const { from, to, setRange } = useDateRange();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DateRange | undefined>({
    from: parseDate(from),
    to: parseDate(to),
  });

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSelected({ from: parseDate(from), to: parseDate(to) });
    }
    setOpen(nextOpen);
  }

  function handlePreset(preset: (typeof presets)[number]) {
    const val = preset.getValue();
    setRange(val.from, val.to);
    setSelected({ from: parseDate(val.from), to: parseDate(val.to) });
    setOpen(false);
  }

  const days = getDayCount(selected);
  const isRangeValid = selected?.from && selected?.to && days <= 365;

  function handleApply() {
    if (selected?.from && selected?.to && isRangeValid) {
      const fromStr = formatDate(selected.from);
      const toStr = formatDate(selected.to);
      setRange(fromStr, toStr);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 size-4" />
          {formatDisplay(from)} - {formatDisplay(to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-1 border-r p-3">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-3">
            <Calendar
              mode="range"
              selected={selected}
              onSelect={setSelected}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />
            <div className="flex items-center justify-end gap-2 px-3 pb-2">
              {days > 365 && (
                <span className="text-xs text-destructive">
                  Max range is 1 year
                </span>
              )}
              <Button size="sm" onClick={handleApply} disabled={!isRangeValid}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
