"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type PublicCancelDialogProps = {
  organizationId: Id<"organization">;
  confirmationCode: string;
  appointmentDate: string;
  appointmentStartTime: number;
};

export function PublicCancelDialog({
  organizationId,
  confirmationCode,
  appointmentDate,
  appointmentStartTime,
}: PublicCancelDialogProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelByCustomer = useMutation(api.appointments.cancelByCustomer);

  const handleCancel = async () => {
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setIsSubmitting(true);
    try {
      await cancelByCustomer({
        organizationId,
        confirmationCode,
        phone: phone.trim(),
        reason: reason.trim() || undefined,
      });
      toast.success("Appointment cancelled successfully");
      setOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message ?? "Failed to cancel appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Cancel Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogDescription>
            Enter your phone number to verify your identity.
            Cancellation must be at least 2 hours before your appointment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Phone Number *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5XX XXX XX XX"
            />
          </div>
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you cancelling?"
              rows={2}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Confirm Cancel"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
