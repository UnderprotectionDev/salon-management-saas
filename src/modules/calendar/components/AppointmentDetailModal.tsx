"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/modules/services/lib/currency";
import { STATUS_COLORS } from "../lib/constants";
import type { AppointmentWithDetails } from "../lib/types";
import { formatTime } from "../lib/utils";

type AppointmentDetailModalProps = {
  appointment: AppointmentWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export function AppointmentDetailModal({
  appointment,
  open,
  onOpenChange,
}: AppointmentDetailModalProps) {
  if (!appointment) return null;

  const colors = STATUS_COLORS[appointment.status] ?? STATUS_COLORS.pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            {appointment.date} at {formatTime(appointment.startTime)} -{" "}
            {formatTime(appointment.endTime)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge
              variant="secondary"
              className={`${colors.bg} ${colors.text} ${colors.border}`}
            >
              {statusLabels[appointment.status] ?? appointment.status}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Customer</h4>
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
            <h4 className="text-sm font-medium">Staff</h4>
            <div className="text-sm">{appointment.staffName}</div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Services</h4>
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
            <div className="flex justify-between border-t pt-2 text-sm font-medium">
              <span>Total</span>
              <span>{formatPrice(appointment.total)}</span>
            </div>
          </div>

          {appointment.confirmationCode && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confirmation Code</span>
                <code className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {appointment.confirmationCode}
                </code>
              </div>
            </>
          )}

          {appointment.customerNotes && (
            <>
              <Separator />
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Customer Notes</h4>
                <p className="text-sm text-muted-foreground">
                  {appointment.customerNotes}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
