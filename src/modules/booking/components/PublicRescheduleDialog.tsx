"use client";

import { useMutation, useQuery } from "convex/react";
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
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { DatePicker } from "./DatePicker";
import { TimeSlotGrid } from "./TimeSlotGrid";

type PublicRescheduleDialogProps = {
  organizationId: Id<"organization">;
  confirmationCode: string;
  staffId: Id<"staff">;
  serviceIds: Id<"services">[];
  customerPhone: string;
};

type Step = "verify" | "datetime" | "confirm";

const generateSessionId = () =>
  `reschedule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function PublicRescheduleDialog({
  organizationId,
  confirmationCode,
  staffId,
  serviceIds,
  customerPhone,
}: PublicRescheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("verify");
  const [phone, setPhone] = useState(customerPhone);
  const [verified, setVerified] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<number | null>(
    null,
  );
  const [selectedEndTime, setSelectedEndTime] = useState<number | null>(null);
  const [lockId, setLockId] = useState<Id<"slotLocks"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId] = useState(generateSessionId);

  const rescheduleByCustomer = useMutation(
    api.appointments.rescheduleByCustomer,
  );

  const handleVerify = () => {
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    // Client-side: just check if they entered a phone — server validates match
    setVerified(true);
    setStep("datetime");
  };

  const handleSlotSelect = (
    startTime: number,
    endTime: number,
    lockResult: Id<"slotLocks"> | null,
  ) => {
    setSelectedStartTime(startTime);
    setSelectedEndTime(endTime);
    setLockId(lockResult);
  };

  const handleReschedule = async () => {
    if (
      !selectedDate ||
      selectedStartTime === null ||
      selectedEndTime === null
    ) {
      toast.error("Please select a new date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      await rescheduleByCustomer({
        organizationId,
        confirmationCode,
        phone: phone.trim(),
        newDate: selectedDate,
        newStartTime: selectedStartTime,
        newEndTime: selectedEndTime,
        sessionId,
      });
      toast.success("Appointment rescheduled successfully");
      setOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message ?? "Failed to reschedule appointment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setStep("verify");
    setPhone(customerPhone);
    setVerified(false);
    setSelectedDate(null);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
    setLockId(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            {step === "verify"
              ? "Enter your phone number to verify your identity."
              : "Select a new date and time for your appointment."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Verify Phone */}
        {step === "verify" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
              />
            </div>
            <Button onClick={handleVerify} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Select New DateTime */}
        {step === "datetime" && (
          <div className="space-y-4 pt-2">
            <DatePicker
              selectedDate={selectedDate}
              onDateSelect={(d) => {
                setSelectedDate(d);
                setSelectedStartTime(null);
                setSelectedEndTime(null);
                setLockId(null);
              }}
            />
            {selectedDate && (
              <TimeSlotGrid
                organizationId={organizationId}
                date={selectedDate}
                serviceIds={serviceIds}
                staffId={staffId}
                selectedStartTime={selectedStartTime}
                sessionId={sessionId}
                onSlotSelect={handleSlotSelect}
              />
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("verify")}>
                Back
              </Button>
              {selectedStartTime !== null && (
                <Button onClick={handleReschedule} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Confirm Reschedule"
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
