"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPrice } from "@/modules/services/lib/currency";
import {
  getServiceColor,
  STATUS_COLORS,
  STATUS_LABELS,
} from "../lib/constants";
import type { AppointmentWithDetails } from "../lib/types";
import { formatTime, minutesToPixelOffset } from "../lib/utils";

type AppointmentBlockProps = {
  appointment: AppointmentWithDetails;
  onClick?: () => void;
  isDragDisabled?: boolean;
};

const DRAGGABLE_STATUSES = new Set(["pending", "confirmed"]);

export function AppointmentBlock({
  appointment,
  onClick,
  isDragDisabled = false,
}: AppointmentBlockProps) {
  const canDrag = !isDragDisabled && DRAGGABLE_STATUSES.has(appointment.status);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment._id,
    data: { appointment },
    disabled: !canDrag,
  });

  const top = minutesToPixelOffset(appointment.startTime);
  const height = (appointment.endTime - appointment.startTime) * 1.5;
  const colors = STATUS_COLORS[appointment.status] ?? STATUS_COLORS.pending;
  const isCompact = height < 50;
  const serviceBorderColor =
    appointment.services.length > 0
      ? getServiceColor(appointment.services[0].serviceName)
      : undefined;

  const blockContent = (
    <button
      ref={setNodeRef}
      type="button"
      className={`absolute left-1 right-1 rounded-md border px-2 py-1 text-left transition-shadow overflow-hidden ${colors.bg} ${colors.border} ${colors.text} ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${isDragging ? "opacity-40 shadow-lg ring-2 ring-primary" : "hover:shadow-md"}`}
      style={{
        top,
        height: Math.max(height, 20),
        borderLeftWidth: serviceBorderColor ? 4 : undefined,
        borderLeftColor: serviceBorderColor,
      }}
      onClick={isDragging ? undefined : onClick}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
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

  // Skip tooltip while dragging
  if (isDragging) return blockContent;

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>{blockContent}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-[220px]">
        <div className="space-y-1">
          <div className="font-medium">{appointment.customerName}</div>
          <div>
            {formatTime(appointment.startTime)} -{" "}
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

/** Lightweight version rendered inside DragOverlay (no hooks). */
export function AppointmentBlockOverlay({
  appointment,
}: {
  appointment: AppointmentWithDetails;
}) {
  const height = (appointment.endTime - appointment.startTime) * 1.5;
  const colors = STATUS_COLORS[appointment.status] ?? STATUS_COLORS.pending;
  const isCompact = height < 50;
  const serviceBorderColor =
    appointment.services.length > 0
      ? getServiceColor(appointment.services[0].serviceName)
      : undefined;

  return (
    <div
      className={`w-[170px] rounded-md border px-2 py-1 text-left shadow-xl ring-2 ring-primary/50 ${colors.bg} ${colors.border} ${colors.text}`}
      style={{
        height: Math.max(height, 20),
        borderLeftWidth: serviceBorderColor ? 4 : undefined,
        borderLeftColor: serviceBorderColor,
      }}
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
    </div>
  );
}
