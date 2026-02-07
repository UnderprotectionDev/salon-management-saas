"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatMinutesAsTime } from "../lib/constants";
import { formatPrice } from "@/modules/services/lib/currency";

type BookingConfirmationProps = {
  confirmationCode: string;
  slug: string;
  onNewBooking: () => void;
  details?: {
    date: string;
    startTime: number;
    endTime: number;
    staffName: string;
    services: Array<{ name: string; duration: number; price: number }>;
  };
};

export function BookingConfirmation({
  confirmationCode,
  slug,
  onNewBooking,
  details,
}: BookingConfirmationProps) {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 rounded-full bg-green-100 p-4">
        <CheckCircle2 className="size-12 text-green-600" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">Booking Confirmed!</h2>
      <p className="text-muted-foreground mb-6 text-center">
        Your appointment has been successfully booked.
      </p>
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          {/* Confirmation Code */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">
              Confirmation Code
            </div>
            <div className="text-3xl font-mono font-bold tracking-widest">
              {confirmationCode}
            </div>
          </div>

          {/* Appointment Details */}
          {details && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{details.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {formatMinutesAsTime(details.startTime)} –{" "}
                    {formatMinutesAsTime(details.endTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff</span>
                  <span className="font-medium">{details.staffName}</span>
                </div>
                {details.services.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Services</span>
                    <ul className="mt-1 space-y-1">
                      {details.services.map((s, index) => (
                        <li
                          key={`${s.name}-${index}`}
                          className="flex justify-between text-xs"
                        >
                          <span>
                            {s.name} ({s.duration} min)
                          </span>
                          <span>{formatPrice(s.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground text-center">
            Please save this code. You may need it for check-in or cancellation.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-3 mt-6">
        <Button variant="outline" asChild>
          <Link href={`/${slug}/appointment/${confirmationCode}`}>
            <ExternalLink className="mr-2 size-4" />
            Check appointment status
          </Link>
        </Button>
        <Button variant="ghost" onClick={onNewBooking}>
          Book Another Appointment
        </Button>
      </div>
    </div>
  );
}
