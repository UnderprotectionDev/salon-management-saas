"use client";

import { Ban, CalendarClock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/modules/services/lib/currency";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { STATUS_LABELS } from "../../lib/constants";
import type { AppointmentWithDetails } from "../../lib/types";
import type { TransitionAction } from "./AppointmentDetailModal";

export function DetailsContent({
  appointment,
  colors,
  organizationId,
  visibleTransitions,
  canCancel,
  canReschedule,
  isUpdating,
  onStatusChange,
  onCancelOpen,
  onReschedule,
}: {
  appointment: AppointmentWithDetails;
  colors: { bg: string; border: string; text: string };
  organizationId?: Id<"organization">;
  visibleTransitions: TransitionAction[];
  canCancel: boolean;
  canReschedule: boolean;
  isUpdating: boolean;
  onStatusChange: (status: string) => void;
  onCancelOpen: () => void;
  onReschedule?: () => void;
}) {
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Status</span>
          <Badge
            variant="secondary"
            className={`${colors.bg} ${colors.border} ${colors.text}`}
          >
            {STATUS_LABELS[appointment.status] ?? appointment.status}
          </Badge>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Customer</h4>
          <div className="text-sm">
            <div>{appointment.customerName}</div>
            <div className="text-muted-foreground">
              {appointment.customerPhone}
            </div>
            {appointment.customerEmail && (
              <div className="text-muted-foreground">
                {appointment.customerEmail}
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Staff</h4>
          <div className="text-sm">{appointment.staffName}</div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Services</h4>
          <div className="space-y-1">
            {appointment.services.map((s, index) => (
              <div
                key={`${s.serviceId}-${index}`}
                className="flex justify-between text-sm"
              >
                <span>
                  {s.serviceName}{" "}
                  <span className="text-muted-foreground">
                    ({s.duration} min)
                  </span>
                </span>
                <span>{formatPrice(s.price)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t pt-2 font-medium text-sm">
            <span>Total</span>
            <span>{formatPrice(appointment.total)}</span>
          </div>
        </div>

        {appointment.confirmationCode && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Confirmation Code</span>
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                {appointment.confirmationCode}
              </code>
            </div>
          </>
        )}

        {appointment.customerNotes && (
          <>
            <Separator />
            <div className="space-y-1">
              <h4 className="font-medium text-sm">Customer Notes</h4>
              <p className="text-muted-foreground text-sm">
                {appointment.customerNotes}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      {organizationId && (
        <>
          <Separator />
          <div className="space-y-3">
            {visibleTransitions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {visibleTransitions.map((action) => (
                  <Button
                    key={action.value}
                    size="sm"
                    variant={action.variant}
                    disabled={isUpdating}
                    onClick={() => onStatusChange(action.value)}
                  >
                    {isUpdating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      action.icon
                    )}
                    <span className="ml-1.5">{action.label}</span>
                  </Button>
                ))}
              </div>
            )}

            {(canReschedule || canCancel) && (
              <div className="flex gap-2">
                {canReschedule && onReschedule && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={onReschedule}
                  >
                    <CalendarClock className="size-4" />
                    <span className="ml-1.5">Reschedule</span>
                  </Button>
                )}
                {canCancel && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={isUpdating}
                    onClick={onCancelOpen}
                  >
                    <Ban className="size-4" />
                    <span className="ml-1.5">Cancel</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
