"use client";

import { STATUS_COLORS } from "../lib/constants";
import type { AppointmentWithDetails } from "../lib/types";
import { formatTime, minutesToPixelOffset } from "../lib/utils";

type AppointmentBlockProps = {
  appointment: AppointmentWithDetails;
  onClick?: () => void;
};

export function AppointmentBlock({
  appointment,
  onClick,
}: AppointmentBlockProps) {
  const top = minutesToPixelOffset(appointment.startTime);
  const height = (appointment.endTime - appointment.startTime) * 1.5;
  const colors = STATUS_COLORS[appointment.status] ?? STATUS_COLORS.pending;
  const isCompact = height < 50;

  return (
    <button
      type="button"
      className={`absolute left-1 right-1 rounded-md border px-2 py-1 text-left transition-shadow hover:shadow-md cursor-pointer overflow-hidden ${colors.bg} ${colors.border} ${colors.text}`}
      style={{ top, height: Math.max(height, 20) }}
      onClick={onClick}
    >
      <div
        className={`text-xs font-medium truncate ${isCompact ? "leading-tight" : ""}`}
      >
        {formatTime(appointment.startTime)} - {appointment.customerName}
      </div>
      {!isCompact && (
        <div className="text-[10px] truncate opacity-80">
          {appointment.services.map((s) => s.serviceName).join(", ")}
        </div>
      )}
    </button>
  );
}
