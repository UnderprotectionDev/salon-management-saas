"use client";

import { CreateAppointmentDialog } from "@/modules/booking";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import type { CalendarViewMode } from "../../hooks/useCalendarState";
import { DateNavigator } from "./DateNavigator";
import { StaffFilter } from "./StaffFilter";
import { TodayButton } from "./TodayButton";
import { ViewToggle } from "./ViewToggle";

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
  appointmentCount?: number;
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
  appointmentCount,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Left: Today tile + date navigator */}
      <div className="flex items-center gap-3">
        <TodayButton onToday={onToday} />
        <DateNavigator
          selectedDate={selectedDate}
          viewMode={viewMode}
          onPrev={onPrev}
          onNext={onNext}
          appointmentCount={appointmentCount}
        />
      </div>

      {/* Right: Staff filter + Create + View toggle */}
      <div className="flex items-center gap-2">
        {staffList && onStaffFilterChange && staffList.length > 1 && (
          <StaffFilter
            staffList={staffList}
            staffFilter={staffFilter ?? "all"}
            onStaffFilterChange={onStaffFilterChange}
          />
        )}

        {organizationId && (
          <CreateAppointmentDialog
            organizationId={organizationId}
            date={calendarDateStr}
          />
        )}

        <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>
    </div>
  );
}
