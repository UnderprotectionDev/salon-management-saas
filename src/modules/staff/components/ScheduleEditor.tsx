"use client";

import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  DAY_LABELS,
  DAYS,
  TIME_OPTIONS,
  timeToMinutes,
} from "@/modules/staff/lib/constants";

type DaySchedule = {
  start: string;
  end: string;
  available: boolean;
};

export type StaffSchedule = {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
};

type ScheduleEditorProps = {
  value: StaffSchedule;
  onChange: (schedule: StaffSchedule) => void;
};

const DEFAULT_DAY: DaySchedule = {
  start: "09:00",
  end: "18:00",
  available: true,
};

export function validateSchedule(schedule: StaffSchedule): string | null {
  for (const day of DAYS) {
    const daySchedule = schedule[day];
    if (daySchedule && daySchedule.available) {
      const startMinutes = timeToMinutes(daySchedule.start);
      const endMinutes = timeToMinutes(daySchedule.end);
      if (startMinutes >= endMinutes) {
        return `${DAY_LABELS[day]}: Start time must be before end time`;
      }
    }
  }
  return null;
}

export function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  const updateDay = (
    day: (typeof DAYS)[number],
    field: keyof DaySchedule,
    fieldValue: string | boolean,
  ) => {
    onChange({
      ...value,
      [day]: {
        ...(value[day] ?? DEFAULT_DAY),
        [field]: fieldValue,
      },
    });
  };

  return (
    <div className="space-y-4">
      {DAYS.map((day) => {
        const daySchedule = value[day] ?? DEFAULT_DAY;
        return (
          <div
            key={day}
            className="flex flex-col sm:flex-row sm:items-center gap-4 py-3 border-b last:border-b-0"
          >
            <div className="flex items-center justify-between sm:w-32">
              <Label className="font-medium">{DAY_LABELS[day]}</Label>
              <Switch
                id={`${day}-switch-mobile`}
                checked={daySchedule.available}
                onCheckedChange={(checked) =>
                  updateDay(day, "available", checked)
                }
                aria-label={`Toggle ${DAY_LABELS[day]} availability`}
                className="sm:hidden"
              />
            </div>

            <div className="hidden sm:block">
              <Switch
                id={`${day}-switch`}
                checked={daySchedule.available}
                onCheckedChange={(checked) =>
                  updateDay(day, "available", checked)
                }
                aria-label={`Toggle ${DAY_LABELS[day]} availability`}
              />
            </div>

            {!daySchedule.available ? (
              <span className="text-muted-foreground text-sm flex-1">
                Unavailable
              </span>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <Clock className="size-4 text-muted-foreground hidden sm:block" />
                <Select
                  value={daySchedule.start}
                  onValueChange={(v) => updateDay(day, "start", v)}
                >
                  <SelectTrigger
                    className="w-24"
                    aria-label={`${DAY_LABELS[day]} start time`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground">to</span>
                <Select
                  value={daySchedule.end}
                  onValueChange={(v) => updateDay(day, "end", v)}
                >
                  <SelectTrigger
                    className="w-24"
                    aria-label={`${DAY_LABELS[day]} end time`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
