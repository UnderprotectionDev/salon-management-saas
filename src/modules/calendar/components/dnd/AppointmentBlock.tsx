"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPrice } from "@/lib/currency";
import {
  getStatusDotColor,
  getStatusEventColor,
  PIXELS_PER_MINUTE,
  STATUS_LABELS,
} from "../../lib/constants";
import type { AppointmentWithDetails } from "../../lib/types";
import { formatTime, minutesToPixelOffset } from "../../lib/utils";

type AppointmentBlockProps = {
  appointment: AppointmentWithDetails;
  onClick?: () => void;
  isDragDisabled?: boolean;
  staffColor?: string;
  startHour?: number;
};

const DRAGGABLE_STATUSES = new Set(["pending", "confirmed"]);

export function AppointmentBlock({
  appointment,
  onClick,
  isDragDisabled = false,
  staffColor,
  startHour,
}: AppointmentBlockProps) {
  const canDrag = !isDragDisabled && DRAGGABLE_STATUSES.has(appointment.status);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment._id,
    data: { appointment },
    disabled: !canDrag,
  });

  const top = minutesToPixelOffset(appointment.startTime, startHour);
  const height =
    (appointment.endTime - appointment.startTime) * PIXELS_PER_MINUTE;
  const colorClasses = getStatusEventColor(appointment.status);
  const dotColor = getStatusDotColor(appointment.status);
  const isCompact = height < 50;

  const blockContent = (
    <button
      ref={setNodeRef}
      type="button"
      className={`absolute left-1 right-1 rounded-md border px-2 py-1 text-left overflow-hidden transition-all duration-150 ${colorClasses} ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${isDragging ? "opacity-40 shadow-lg ring-2 ring-primary" : "hover:shadow-md hover:brightness-95 dark:hover:brightness-110"}`}
      style={{
        top,
        height: Math.max(height, 24),
        ...(staffColor
          ? { borderLeftWidth: 3, borderLeftColor: staffColor }
          : {}),
      }}
      onClick={isDragging ? undefined : onClick}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
    >
      <div
        className={`flex items-center gap-1 ${isCompact ? "leading-tight" : ""}`}
      >
        {isCompact && (
          <span
            className={`inline-block size-1.5 shrink-0 rounded-full ${dotColor}`}
          />
        )}
        <span className="text-xs font-semibold truncate">
          {appointment.customerName}
        </span>
      </div>
      {!isCompact && (
        <div className="text-[10px] truncate opacity-70">
          {formatTime(appointment.startTime)} –{" "}
          {formatTime(appointment.endTime)}
        </div>
      )}
    </button>
  );

  // Skip tooltip while dragging
  if (isDragging) return blockContent;

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>{blockContent}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-[220px]">
        <div className="space-y-1">
          <div className="font-medium">{appointment.customerName}</div>
          <div>
            {formatTime(appointment.startTime)} –{" "}
            {formatTime(appointment.endTime)}
          </div>
          <div className="opacity-80">
            {appointment.services.map((s) => s.serviceName).join(", ")}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="opacity-80">
              {STATUS_LABELS[appointment.status] ?? appointment.status}
            </span>
            <span className="font-medium">
              {formatPrice(appointment.total)}
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
