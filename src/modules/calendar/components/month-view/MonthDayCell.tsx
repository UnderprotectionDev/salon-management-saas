"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getStatusDotColor,
  getStatusEventColor,
  MAX_VISIBLE_IN_MONTH_CELL,
} from "../../lib/constants";
import type { AppointmentWithDetails } from "../../lib/types";
import { formatTime } from "../../lib/utils";

type MonthDayCellProps = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: AppointmentWithDetails[];
  staffColorMap?: Map<string, string>;
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appt: AppointmentWithDetails) => void;
};

export function MonthDayCell({
  date,
  isCurrentMonth,
  isToday,
  appointments,
  staffColorMap,
  onDayClick,
  onAppointmentClick,
}: MonthDayCellProps) {
  const visible = appointments.slice(0, MAX_VISIBLE_IN_MONTH_CELL);
  const overflowCount = appointments.length - MAX_VISIBLE_IN_MONTH_CELL;
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div
      className={`min-h-[100px] border-b border-r p-1 ${
        isCurrentMonth ? "bg-background" : "bg-muted/30"
      }`}
    >
      {/* Day number */}
      <button
        type="button"
        className={`mb-0.5 flex size-7 items-center justify-center rounded-full text-sm transition-colors hover:bg-accent ${
          isToday
            ? "bg-primary text-primary-foreground font-semibold"
            : isCurrentMonth
              ? "text-foreground"
              : "text-muted-foreground/50"
        }`}
        onClick={() => onDayClick(date)}
      >
        {date.getDate()}
      </button>

      {/* Appointment badges — desktop: full colored badge, mobile: dots only */}
      <div className="space-y-0.5">
        {visible.map((appt) => {
          const colorClasses = getStatusEventColor(appt.status);
          const dotColor = getStatusDotColor(appt.status);
          const staffColor = staffColorMap?.get(appt.staffId);

          return (
            <button
              key={appt._id}
              type="button"
              className="flex w-full items-center transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onAppointmentClick(appt);
              }}
            >
              {/* Mobile: colored dot only */}
              <span
                className={`block size-2 shrink-0 rounded-full sm:hidden ${dotColor}`}
                role="img"
                aria-label={`${appt.customerName} at ${formatTime(appt.startTime)}`}
              />
              {/* Desktop: full colored badge */}
              <span
                className={`hidden sm:flex h-6 w-full items-center rounded-md border px-1.5 text-[11px] font-semibold truncate ${colorClasses} hover:opacity-80`}
                style={
                  staffColor
                    ? { borderLeftWidth: 4, borderLeftColor: staffColor }
                    : undefined
                }
              >
                <span className="tabular-nums mr-1">
                  {formatTime(appt.startTime)}
                </span>
                <span className="truncate">{appt.customerName}</span>
              </span>
            </button>
          );
        })}
        {overflowCount > 0 && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full rounded px-1 py-0.5 text-left text-[11px] font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                +{overflowCount} more
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-0"
              align="start"
              side="bottom"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="border-b px-3 py-2">
                <p className="text-sm font-medium">
                  {date.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appointments.length} appointment
                  {appointments.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                {appointments.map((appt) => {
                  const colorClasses = getStatusEventColor(appt.status);
                  const staffColor = staffColorMap?.get(appt.staffId);

                  return (
                    <button
                      key={appt._id}
                      type="button"
                      className={`flex w-full items-center rounded-md border px-2 py-1.5 text-xs font-medium ${colorClasses} hover:opacity-80 transition-colors`}
                      style={
                        staffColor
                          ? { borderLeftWidth: 4, borderLeftColor: staffColor }
                          : undefined
                      }
                      onClick={() => {
                        setPopoverOpen(false);
                        onAppointmentClick(appt);
                      }}
                    >
                      <span className="tabular-nums mr-1.5 shrink-0">
                        {formatTime(appt.startTime)}
                      </span>
                      <span className="truncate">{appt.customerName}</span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t px-3 py-2">
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => {
                    setPopoverOpen(false);
                    onDayClick(date);
                  }}
                >
                  View full day &rarr;
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
