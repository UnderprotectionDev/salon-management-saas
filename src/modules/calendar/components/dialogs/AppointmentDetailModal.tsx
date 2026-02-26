"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AppointmentPrepView } from "@/modules/ai/staff/components/AppointmentPrepView";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { STATUS_COLORS } from "../../lib/constants";
import type { AppointmentWithDetails } from "../../lib/types";
import { formatTime } from "../../lib/utils";
import { DetailsContent } from "./DetailsContent";

type AppointmentDetailModalProps = {
  appointment: AppointmentWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: Id<"organization">;
  onRescheduleRequest?: (appointment: AppointmentWithDetails) => void;
};

export type TransitionAction = {
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

  // Check if salon has AI features enabled (salonType defined)
  const salonType = useQuery(
    api.organizations.getSalonType,
    organizationId ? { organizationId } : "skip",
  );
  const showAiTab =
    salonType !== null && salonType !== undefined && salonType.length > 0;

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
  // Parse date parts explicitly to avoid timezone-dependent string parsing
  const [year, month, day] = appointment.date.split("-").map(Number);
  const appointmentDateTime = new Date(
    year,
    month - 1,
    day,
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
        <DialogContent className={organizationId ? "max-w-lg" : "max-w-md"}>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              {appointment.date} at {formatTime(appointment.startTime)} -{" "}
              {formatTime(appointment.endTime)}
            </DialogDescription>
          </DialogHeader>

          {showAiTab ? (
            <Tabs defaultValue="details">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">
                  Details
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex-1">
                  AI Insights
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-3">
                <DetailsContent
                  appointment={appointment}
                  colors={colors}
                  organizationId={organizationId}
                  visibleTransitions={visibleTransitions}
                  canCancel={canCancel}
                  canReschedule={canReschedule}
                  isUpdating={isUpdating}
                  onStatusChange={handleStatusChange}
                  onCancelOpen={() => setCancelOpen(true)}
                  onReschedule={
                    onRescheduleRequest
                      ? () => {
                          onOpenChange(false);
                          onRescheduleRequest(appointment);
                        }
                      : undefined
                  }
                />
              </TabsContent>

              <TabsContent value="ai" className="mt-3">
                {organizationId && (
                  <AppointmentPrepView
                    organizationId={organizationId}
                    customerId={appointment.customerId}
                  />
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <DetailsContent
              appointment={appointment}
              colors={colors}
              organizationId={organizationId}
              visibleTransitions={visibleTransitions}
              canCancel={canCancel}
              canReschedule={canReschedule}
              isUpdating={isUpdating}
              onStatusChange={handleStatusChange}
              onCancelOpen={() => setCancelOpen(true)}
              onReschedule={
                onRescheduleRequest
                  ? () => {
                      onOpenChange(false);
                      onRescheduleRequest(appointment);
                    }
                  : undefined
              }
            />
          )}
        </DialogContent>
      </Dialog>
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
