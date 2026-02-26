"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarViewMode } from "../../hooks/useCalendarState";
import { getWeekRange, parseLocalDate } from "../../lib/utils";

type DateNavigatorProps = {
  selectedDate: Date;
  viewMode: CalendarViewMode;
  onPrev: () => void;
  onNext: () => void;
  appointmentCount?: number;
};

function getTitle(selectedDate: Date, viewMode: CalendarViewMode): string {
  switch (viewMode) {
    case "day":
      return format(selectedDate, "MMMM yyyy");
    case "week":
      return format(selectedDate, "MMMM yyyy");
    case "month":
    case "agenda":
      return format(selectedDate, "MMMM yyyy");
    case "year":
      return String(selectedDate.getFullYear());
  }
}

function getSubtitle(
  selectedDate: Date,
  viewMode: CalendarViewMode,
): string | null {
  switch (viewMode) {
    case "day":
      return format(selectedDate, "EEEE, MMMM d");
    case "week": {
      const range = getWeekRange(selectedDate);
      const start = parseLocalDate(range.startDate);
      const end = parseLocalDate(range.endDate);
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, "MMM d")} – ${format(end, "d")}`;
      }
      return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
    }
    case "month":
    case "agenda":
    case "year":
      return null;
  }
}

export function DateNavigator({
  selectedDate,
  viewMode,
  onPrev,
  onNext,
  appointmentCount,
}: DateNavigatorProps) {
  const title = getTitle(selectedDate, viewMode);
  const subtitle = getSubtitle(selectedDate, viewMode);

  return (
    <div className="flex flex-col gap-0.5">
      {/* Line 1: Title + count badge */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {appointmentCount !== undefined && appointmentCount > 0 && (
          <Badge variant="outline" className="text-xs font-normal">
            {appointmentCount} appointment{appointmentCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Line 2: Prev/Next + subtitle */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-6"
          onClick={onPrev}
          aria-label="Previous"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-6"
          onClick={onNext}
          aria-label="Next"
        >
          <ChevronRight className="size-3.5" />
        </Button>
        {subtitle && (
          <span className="ml-1 text-sm text-muted-foreground">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
