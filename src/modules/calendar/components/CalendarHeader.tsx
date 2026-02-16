"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CreateAppointmentDialog } from "@/modules/booking";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
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
  staffList?: Doc<"staff">[];
  staffFilter?: Id<"staff"> | "all";
  onStaffFilterChange?: (value: Id<"staff"> | "all") => void;
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
  staffList,
  staffFilter,
  onStaffFilterChange,
}: CalendarHeaderProps) {
  const title =
    viewMode === "day"
      ? format(selectedDate, "EEEE, MMMM d, yyyy")
      : `Week of ${format(selectedDate, "MMM d, yyyy")}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            aria-label="Previous"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            aria-label="Next"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="flex items-center gap-2">
        {/* Staff filter - only for owners */}
        {staffList && onStaffFilterChange && staffList.length > 1 && (
          <Select
            value={staffFilter ?? "all"}
            onValueChange={(v) => onStaffFilterChange(v as Id<"staff"> | "all")}
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
          <ToggleGroupItem
            value="day"
            aria-label="Day view"
            className="text-xs"
          >
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
