"use client";

import { useMutation } from "convex/react";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
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

export type BusinessHours = {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
};

// Uncontrolled mode: saves directly to organization settings
type UncontrolledProps = {
  organizationId: Id<"organization">;
  initialHours?: BusinessHours;
  onSave?: () => void;
  onChange?: never;
  value?: never;
};

// Controlled mode: parent manages state via onChange
type ControlledProps = {
  organizationId?: never;
  initialHours?: never;
  onSave?: never;
  onChange: (hours: BusinessHours) => void;
  value: BusinessHours;
};

type BusinessHoursEditorProps = UncontrolledProps | ControlledProps;

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
 * Get default business hours for all days
 * Sunday is closed by default
 */
export function getDefaultBusinessHours(): BusinessHours {
  const hours: BusinessHours = {};
  for (const day of DAYS) {
    hours[day] = {
      ...DEFAULT_HOURS,
      closed: day === "sunday",
    };
  }
  return hours;
}

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

export function BusinessHoursEditor(props: BusinessHoursEditorProps) {
  // Determine mode based on props
  const isControlled = "onChange" in props && props.onChange !== undefined;

  const updateSettings = useMutation(api.organizations.updateSettings);
  const [isSaving, setIsSaving] = useState(false);

  // Internal state for uncontrolled mode
  const [internalHours, setInternalHours] = useState<BusinessHours>(() => {
    if (isControlled) {
      return props.value;
    }
    const defaultHours: BusinessHours = {};
    for (const day of DAYS) {
      defaultHours[day] = props.initialHours?.[day] ?? { ...DEFAULT_HOURS };
    }
    return defaultHours;
  });

  // Use controlled value or internal state
  const hours = isControlled ? props.value : internalHours;

  // Sync internal state with controlled value when it changes
  useEffect(() => {
    if (isControlled) {
      setInternalHours(props.value);
    }
  }, [isControlled, props.value]);

  const updateDay = (
    day: (typeof DAYS)[number],
    field: keyof DayHours,
    value: string | boolean,
  ) => {
    const newHours = {
      ...hours,
      [day]: {
        ...hours[day],
        [field]: value,
      },
    };

    if (isControlled) {
      props.onChange(newHours);
    } else {
      setInternalHours(newHours);
    }
  };

  const handleSave = async () => {
    // Controlled mode doesn't have a save button
    if (isControlled) return;

    // Validate times before saving
    const validationError = validateBusinessHours(hours);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        organizationId: props.organizationId,
        businessHours: hours,
      });
      toast.success("Business hours saved successfully");
      props.onSave?.();
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
                <Label className="font-medium">{DAY_LABELS[day]}</Label>
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

      {/* Only show save button in uncontrolled mode */}
      {!isControlled && (
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      )}
    </div>
  );
}
