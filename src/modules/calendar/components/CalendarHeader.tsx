"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CreateAppointmentDialog } from "@/modules/booking";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { CalendarViewMode } from "../hooks/useCalendarState";

type CalendarHeaderProps = {
  selectedDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  organizationId?: Id<"organization">;
  calendarDateStr: string;
};

export function CalendarHeader({
  selectedDate,
  viewMode,
  onViewModeChange,
  onToday,
  onPrev,
  onNext,
  organizationId,
  calendarDateStr,
}: CalendarHeaderProps) {
  const title =
    viewMode === "day"
      ? format(selectedDate, "EEEE, MMMM d, yyyy")
      : `Week of ${format(selectedDate, "MMM d, yyyy")}`;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onPrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {organizationId && (
          <CreateAppointmentDialog
            organizationId={organizationId}
            date={calendarDateStr}
          />
        )}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => {
            if (v) onViewModeChange(v as CalendarViewMode);
          }}
        >
          <ToggleGroupItem value="day" aria-label="Day view" className="text-xs">
            Day
          </ToggleGroupItem>
          <ToggleGroupItem
            value="week"
            aria-label="Week view"
            className="text-xs"
          >
            Week
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
