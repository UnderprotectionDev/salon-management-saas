"use client";

import { useMutation } from "convex/react";
import { X } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type CancelAppointmentDialogProps = {
  appointmentId: Id<"appointments">;
  organizationId: Id<"organization">;
};

export function CancelAppointmentDialog({
  appointmentId,
  organizationId,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const cancelAppointment = useMutation(api.appointments.cancel);

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await cancelAppointment({
        organizationId,
        appointmentId,
        reason: reason || undefined,
        cancelledBy: "staff",
      });
      toast.success("Appointment cancelled");
      setOpen(false);
      setReason("");
    } catch (error: unknown) {
      const msg =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to cancel appointment";
      toast.error(msg);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          aria-label="Cancel appointment"
        >
          <X className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel this appointment? This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Reason for cancellation (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Appointment</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Cancel Appointment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
