"use client";

import { format } from "date-fns";
import { CalendarX2, Clock, Scissors, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/currency";
import {
  getStatusEventColor,
  STATUS_COLORS,
  STATUS_LABELS,
} from "../../lib/constants";
import type { AppointmentWithDetails } from "../../lib/types";
import { formatTime, parseLocalDate } from "../../lib/utils";

type AgendaViewProps = {
  appointments: AppointmentWithDetails[];
  staffColorMap?: Map<string, string>;
  onAppointmentClick: (appt: AppointmentWithDetails) => void;
};

export function AgendaView({
  appointments,
  staffColorMap,
  onAppointmentClick,
}: AgendaViewProps) {
  // Filter out cancelled/no_show and sort by date + time
  const filtered = appointments
    .filter((a) => a.status !== "cancelled" && a.status !== "no_show")
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime - b.startTime;
    });

  // Group by date
  const grouped = new Map<string, AppointmentWithDetails[]>();
  for (const appt of filtered) {
    const list = grouped.get(appt.date);
    if (list) {
      list.push(appt);
    } else {
      grouped.set(appt.date, [appt]);
    }
  }

  if (grouped.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-background p-12 text-muted-foreground">
        <CalendarX2 className="mb-3 size-10 opacity-50" />
        <p className="text-sm font-medium">No appointments in this period</p>
        <p className="text-xs">Try selecting a different date range</p>
      </div>
    );
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateStr, dayAppts]) => {
        const date = parseLocalDate(dateStr);
        const isToday = dateStr === todayStr;

        return (
          <div key={dateStr}>
            {/* Date group header */}
            <div className="sticky top-0 z-10 mb-2 flex items-center gap-2">
              <h3 className="text-sm font-semibold">
                {format(date, "EEEE, MMMM d, yyyy")}
              </h3>
              {isToday && (
                <Badge variant="default" className="text-[10px]">
                  Today
                </Badge>
              )}
            </div>

            {/* Appointment cards */}
            <div className="grid gap-2">
              {dayAppts.map((appt) => {
                const colorClasses = getStatusEventColor(appt.status);
                const statusColors =
                  STATUS_COLORS[appt.status] ?? STATUS_COLORS.pending;
                const duration = appt.endTime - appt.startTime;
                const staffColor = appt.staffId
                  ? staffColorMap?.get(appt.staffId)
                  : undefined;

                return (
                  <button
                    key={appt._id}
                    type="button"
                    className={`w-full rounded-md border p-3 text-left text-sm transition-shadow hover:shadow-md ${colorClasses}`}
                    style={
                      staffColor
                        ? { borderLeftWidth: 4, borderLeftColor: staffColor }
                        : undefined
                    }
                    onClick={() => onAppointmentClick(appt)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left content */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {/* Customer name + status */}
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">
                            {appt.customerName}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`shrink-0 text-[10px] ${statusColors.bg} ${statusColors.text}`}
                          >
                            {STATUS_LABELS[appt.status] ?? appt.status}
                          </Badge>
                        </div>

                        {/* Icon-labeled fields */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-80">
                          <span className="inline-flex items-center gap-1">
                            <User className="size-3" />
                            {appt.staffName}
                          </span>
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock className="size-3" />
                            {formatTime(appt.startTime)} –{" "}
                            {formatTime(appt.endTime)} ({duration} min)
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Scissors className="size-3" />
                            {appt.services.map((s) => s.serviceName).join(", ")}
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="shrink-0 text-sm font-semibold tabular-nums">
                        {formatPrice(appt.total)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
