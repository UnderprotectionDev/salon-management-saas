"use client";

import { getStatusEventColor, PIXELS_PER_MINUTE } from "../../lib/constants";
import type { AppointmentWithDetails } from "../../lib/types";
import { formatTime } from "../../lib/utils";

/** Lightweight version rendered inside DragOverlay (no hooks). */
export function AppointmentBlockOverlay({
  appointment,
  staffColor,
}: {
  appointment: AppointmentWithDetails;
  staffColor?: string;
}) {
  const height =
    (appointment.endTime - appointment.startTime) * PIXELS_PER_MINUTE;
  const colorClasses = getStatusEventColor(appointment.status);
  const isCompact = height < 50;

  return (
    <div
      className={`w-[170px] rounded-md border px-2 py-1 text-left shadow-xl ring-2 ring-primary/50 ${colorClasses}`}
      style={{
        height: Math.max(height, 24),
        ...(staffColor
          ? { borderLeftWidth: 3, borderLeftColor: staffColor }
          : {}),
      }}
    >
      <div
        className={`text-xs font-semibold truncate ${isCompact ? "leading-tight" : ""}`}
      >
        {appointment.customerName}
      </div>
      {!isCompact && (
        <div className="text-[10px] truncate opacity-70">
          {formatTime(appointment.startTime)} –{" "}
          {formatTime(appointment.endTime)}
        </div>
      )}
    </div>
  );
}
