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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMinutesAsTime } from "../lib/constants";

type ConfirmBookingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: Id<"organization">;
  services: Array<{
    _id: Id<"services">;
    name: string;
    duration: number;
    price: number;
  }>;
  staffId: Id<"staff">;
  staffName: string;
  date: string;
  startTime: number;
  endTime: number;
  sessionId: string;
  initialCustomer: {
    name: string;
    phone: string;
    email: string;
  };
  onConfirm: (result: {
    appointmentId: string;
    confirmationCode: string;
    details: {
      date: string;
      startTime: number;
      endTime: number;
      staffName: string;
      services: Array<{ name: string; duration: number; price: number }>;
    };
  }) => void;
};

export function ConfirmBookingDialog({
  open,
  onOpenChange,
  organizationId,
  services,
  staffId,
  staffName,
  date,
  startTime,
  endTime,
  sessionId,
  initialCustomer,
  onConfirm,
}: ConfirmBookingDialogProps) {
  const [name, setName] = useState(initialCustomer.name);
  const [phone, setPhone] = useState(initialCustomer.phone);
  const [email, setEmail] = useState(initialCustomer.email);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createAppointment = useMutation(api.appointments.create);
  const linkCustomer = useMutation(api.customers.linkToCurrentUser);
  const savePhoneToProfile = useMutation(api.userProfile.savePhoneFromBooking);

  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-US",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Full name is required";
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+90 5\d{2} \d{3} \d{2} \d{2}$/.test(phone)) {
      newErrors.phone = "Format: +90 5XX XXX XX XX";
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await createAppointment({
        organizationId,
        staffId,
        date,
        startTime,
        endTime,
        serviceIds: services.map((s) => s._id),
        customer: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        sessionId,
      });

      // Best-effort: link customer and save phone (log errors for debugging)
      linkCustomer({ customerId: result.customerId }).catch((e: unknown) =>
        console.error("Failed to link customer:", e),
      );
      if (phone) {
        savePhoneToProfile({ phone: phone.trim() }).catch((e: unknown) =>
          console.error("Failed to save phone to profile:", e),
        );
      }

      onConfirm({
        appointmentId: result.appointmentId as string,
        confirmationCode: result.confirmationCode,
        details: {
          date,
          startTime,
          endTime,
          staffName,
          services: services.map((s) => ({
            name: s.name,
            duration: s.duration,
            price: s.price,
          })),
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { data?: { message?: string } })?.data?.message ??
            "Could not create appointment");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wider text-sm">
            Confirm Booking
          </DialogTitle>
          <DialogDescription>
            Review your details and confirm the appointment.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="space-y-2 text-sm">
          {services.map((s) => (
            <div key={s._id} className="flex justify-between">
              <span className="uppercase text-xs font-medium">{s.name}</span>
              <span className="font-semibold">{formatPrice(s.price)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Staff</span>
            <span className="font-medium text-foreground">{staffName}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Date</span>
            <span className="font-medium text-foreground">{formattedDate}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Time</span>
            <span className="font-medium text-foreground">
              {formatMinutesAsTime(startTime)} - {formatMinutesAsTime(endTime)}{" "}
              ({totalDuration} min)
            </span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>

        <Separator />

        {/* Customer form */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="confirm-name"
              className="text-xs uppercase tracking-wider"
            >
              Full Name *
            </Label>
            <Input
              id="confirm-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="confirm-phone"
              className="text-xs uppercase tracking-wider"
            >
              Phone *
            </Label>
            <Input
              id="confirm-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5XX XXX XX XX"
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="confirm-email"
              className="text-xs uppercase tracking-wider"
            >
              Email
            </Label>
            <Input
              id="confirm-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="confirm-notes"
              className="text-xs uppercase tracking-wider"
            >
              Notes
            </Label>
            <Textarea
              id="confirm-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special requests..."
              rows={2}
            />
          </div>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full uppercase tracking-wider text-xs font-semibold"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Confirm Booking"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
