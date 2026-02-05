"use client";

import { useMutation } from "convex/react";
import { Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

type BusinessHours = {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
};

type BusinessHoursEditorProps = {
  organizationId: Id<"organization">;
  initialHours?: BusinessHours;
  onSave?: () => void;
};

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DEFAULT_HOURS: DayHours = {
  open: "09:00",
  close: "18:00",
  closed: false,
};

/**
 * Convert time string (HH:MM) to minutes for comparison
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Validate that open time is before close time
 */
function validateBusinessHours(hours: BusinessHours): string | null {
  for (const day of DAYS) {
    const dayHours = hours[day];
    if (dayHours && !dayHours.closed) {
      const openMinutes = timeToMinutes(dayHours.open);
      const closeMinutes = timeToMinutes(dayHours.close);
      if (openMinutes >= closeMinutes) {
        return `${DAY_LABELS[day]}: Opening time must be before closing time`;
      }
    }
  }
  return null;
}

const TIME_OPTIONS = [
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
];

export function BusinessHoursEditor({
  organizationId,
  initialHours,
  onSave,
}: BusinessHoursEditorProps) {
  const updateSettings = useMutation(api.organizations.updateSettings);
  const [isSaving, setIsSaving] = useState(false);

  const [hours, setHours] = useState<BusinessHours>(() => {
    const defaultHours: BusinessHours = {};
    for (const day of DAYS) {
      defaultHours[day] = initialHours?.[day] ?? { ...DEFAULT_HOURS };
    }
    return defaultHours;
  });

  const updateDay = (
    day: (typeof DAYS)[number],
    field: keyof DayHours,
    value: string | boolean,
  ) => {
    setHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    // Validate times before saving
    const validationError = validateBusinessHours(hours);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        organizationId,
        businessHours: hours,
      });
      toast.success("Business hours saved successfully");
      onSave?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save business hours. Please try again.";
      toast.error(message);
      console.error("Failed to save business hours:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {DAYS.map((day) => {
          const dayHours = hours[day] ?? DEFAULT_HOURS;
          return (
            <div
              key={day}
              className="flex flex-col sm:flex-row sm:items-center gap-4 py-3 border-b last:border-b-0"
            >
              <div className="flex items-center justify-between sm:w-32">
                <Label htmlFor={`${day}-switch`} className="font-medium">
                  {DAY_LABELS[day]}
                </Label>
                <Switch
                  id={`${day}-switch-mobile`}
                  checked={!dayHours.closed}
                  onCheckedChange={(checked) =>
                    updateDay(day, "closed", !checked)
                  }
                  aria-label={`Toggle ${DAY_LABELS[day]} availability`}
                  className="sm:hidden"
                />
              </div>

              <div className="hidden sm:block">
                <Switch
                  id={`${day}-switch`}
                  checked={!dayHours.closed}
                  onCheckedChange={(checked) =>
                    updateDay(day, "closed", !checked)
                  }
                  aria-label={`Toggle ${DAY_LABELS[day]} availability`}
                />
              </div>

              {dayHours.closed ? (
                <span className="text-muted-foreground text-sm flex-1">
                  Closed
                </span>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <Clock className="size-4 text-muted-foreground hidden sm:block" />
                  <Select
                    value={dayHours.open}
                    onValueChange={(value) => updateDay(day, "open", value)}
                  >
                    <SelectTrigger
                      className="w-24"
                      aria-label={`${DAY_LABELS[day]} opening time`}
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
                    value={dayHours.close}
                    onValueChange={(value) => updateDay(day, "close", value)}
                  >
                    <SelectTrigger
                      className="w-24"
                      aria-label={`${DAY_LABELS[day]} closing time`}
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

      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full sm:w-auto"
      >
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
