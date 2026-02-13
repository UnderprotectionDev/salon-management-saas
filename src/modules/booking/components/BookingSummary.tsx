"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMinutesAsTime } from "../lib/constants";

type BookingSummaryProps = {
  organizationId: Id<"organization">;
  services: Array<{
    _id: Id<"services">;
    name: string;
    duration: number;
    bufferTime?: number;
    price: number;
  }>;
  staffName: string;
  staffId: Id<"staff">;
  date: string;
  startTime: number;
  endTime: number;
  customer: {
    name: string;
    phone: string;
    email: string;
    notes: string;
  };
  sessionId: string;
  onBack: () => void;
  onConfirm: (result: {
    appointmentId: Id<"appointments">;
    confirmationCode: string;
  }) => void;
};

export function BookingSummary({
  organizationId,
  services,
  staffName,
  staffId,
  date,
  startTime,
  endTime,
  customer,
  sessionId,
  onBack,
  onConfirm,
}: BookingSummaryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createAppointment = useMutation(api.appointments.create);
  const linkCustomer = useMutation(api.customers.linkToCurrentUser);
  const savePhoneToProfile = useMutation(api.userProfile.savePhoneFromBooking);

  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

  const [yr, mo, dy] = date.split("-").map(Number);
  const formattedDate = new Date(yr, mo - 1, dy).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleConfirm = async () => {
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
          name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined,
          notes: customer.notes || undefined,
        },
        sessionId,
      });

      // Link customer record to authenticated user (best-effort, don't block confirmation)
      linkCustomer({ customerId: result.customerId }).catch(() => {
        // Silently ignore if linking fails
      });

      // Save phone to user profile (best-effort, auto-fills for next booking)
      if (customer.phone) {
        savePhoneToProfile({ phone: customer.phone }).catch(() => {
          // Silently ignore if saving fails
        });
      }

      onConfirm(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { data?: { message?: string } })?.data?.message ??
            "Failed to create appointment");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Appointment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground">Date & Time</div>
            <div className="font-medium">{formattedDate}</div>
            <div className="text-sm">
              {formatMinutesAsTime(startTime)} - {formatMinutesAsTime(endTime)}{" "}
              ({totalDuration} min)
            </div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground">Staff</div>
            <div className="font-medium">{staffName}</div>
          </div>

          <Separator />

          <div>
            <div className="text-sm text-muted-foreground mb-1">Services</div>
            {services.map((s) => (
              <div key={s._id} className="flex justify-between text-sm py-1">
                <span>
                  {s.name} ({s.duration} min
                  {s.bufferTime ? ` + ${s.bufferTime} min prep` : ""})
                </span>
                <span>{formatPrice(s.price)}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contact Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span> {customer.name}
          </div>
          <div>
            <span className="text-muted-foreground">Phone:</span>{" "}
            {customer.phone}
          </div>
          {customer.email && (
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              {customer.email}
            </div>
          )}
          {customer.notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span>{" "}
              {customer.notes}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Booking...
            </>
          ) : (
            "Confirm Booking"
          )}
        </Button>
      </div>
    </div>
  );
}
