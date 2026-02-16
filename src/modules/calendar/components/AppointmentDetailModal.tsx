"use client";

import { useMutation } from "convex/react";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Loader2,
  LogIn,
  Play,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { STATUS_COLORS, STATUS_LABELS } from "../lib/constants";
import type { AppointmentWithDetails } from "../lib/types";
import { formatTime } from "../lib/utils";

type AppointmentDetailModalProps = {
  appointment: AppointmentWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: Id<"organization">;
  onRescheduleRequest?: (appointment: AppointmentWithDetails) => void;
};

type TransitionAction = {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant: "default" | "secondary" | "destructive";
};

const TRANSITIONS: Record<string, TransitionAction[]> = {
  pending: [
    {
      label: "Confirm",
      value: "confirmed",
      icon: <CheckCircle2 className="size-4" />,
      variant: "default",
    },
    {
      label: "No Show",
      value: "no_show",
      icon: <AlertTriangle className="size-4" />,
      variant: "destructive",
    },
  ],
  confirmed: [
    {
      label: "Check In",
      value: "checked_in",
      icon: <LogIn className="size-4" />,
      variant: "default",
    },
    {
      label: "No Show",
      value: "no_show",
      icon: <AlertTriangle className="size-4" />,
      variant: "destructive",
    },
  ],
  checked_in: [
    {
      label: "Start Service",
      value: "in_progress",
      icon: <Play className="size-4" />,
      variant: "default",
    },
    {
      label: "No Show",
      value: "no_show",
      icon: <AlertTriangle className="size-4" />,
      variant: "destructive",
    },
  ],
  in_progress: [
    {
      label: "Complete",
      value: "completed",
      icon: <CircleDot className="size-4" />,
      variant: "default",
    },
    {
      label: "No Show",
      value: "no_show",
      icon: <AlertTriangle className="size-4" />,
      variant: "destructive",
    },
  ],
};

export function AppointmentDetailModal({
  appointment,
  open,
  onOpenChange,
  organizationId,
  onRescheduleRequest,
}: AppointmentDetailModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Reset cancel reason when cancel dialog closes
  const handleCancelOpenChange = (v: boolean) => {
    setCancelOpen(v);
    if (!v) setCancelReason("");
  };

  const updateStatus = useMutation(api.appointments.updateStatus);
  const cancelAppointment = useMutation(api.appointments.cancel);

  if (!appointment) return null;

  const colors = STATUS_COLORS[appointment.status] ?? STATUS_COLORS.pending;
  const transitions = TRANSITIONS[appointment.status] ?? [];

  // Filter no-show: only allow after appointment start time
  const appointmentDateTime = new Date(`${appointment.date}T00:00:00`);
  appointmentDateTime.setHours(
    Math.floor(appointment.startTime / 60),
    appointment.startTime % 60,
    0,
    0,
  );
  const isPast = appointmentDateTime.getTime() < Date.now();
  const visibleTransitions = isPast
    ? transitions
    : transitions.filter((t) => t.value !== "no_show");

  const canCancel =
    appointment.status !== "cancelled" &&
    appointment.status !== "completed" &&
    appointment.status !== "no_show";

  const canReschedule =
    appointment.status === "pending" || appointment.status === "confirmed";

  const handleStatusChange = async (newStatus: string) => {
    if (!organizationId) return;
    setIsUpdating(true);
    try {
      await updateStatus({
        organizationId,
        appointmentId: appointment._id,
        status: newStatus as
          | "confirmed"
          | "checked_in"
          | "in_progress"
          | "completed"
          | "no_show",
      });
      toast.success("Status updated");
      onOpenChange(false);
    } catch (error: unknown) {
      const msg =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to update status";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    setIsUpdating(true);
    try {
      await cancelAppointment({
        organizationId,
        appointmentId: appointment._id,
        reason: cancelReason || undefined,
        cancelledBy: "staff",
      });
      toast.success("Appointment cancelled");
      setCancelOpen(false);
      setCancelReason("");
      onOpenChange(false);
    } catch (error: unknown) {
      const msg =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to cancel appointment";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
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
                className={`${colors.bg} ${colors.border} ${colors.text}`}
              >
                {STATUS_LABELS[appointment.status] ?? appointment.status}
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
                  <span className="text-muted-foreground">
                    Confirmation Code
                  </span>
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

          {/* Action buttons */}
          {organizationId && (
            <>
              <Separator />
              <div className="space-y-3">
                {/* Status transition buttons */}
                {visibleTransitions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {visibleTransitions.map((action) => (
                      <Button
                        key={action.value}
                        size="sm"
                        variant={action.variant}
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(action.value)}
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

                {/* Reschedule & Cancel row */}
                {(canReschedule || canCancel) && (
                  <div className="flex gap-2">
                    {canReschedule && onRescheduleRequest && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onOpenChange(false);
                          onRescheduleRequest(appointment);
                        }}
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
                        onClick={() => setCancelOpen(true)}
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
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={handleCancelOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for cancellation (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
