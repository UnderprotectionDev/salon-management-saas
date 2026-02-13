"use client";

import {
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/modules/services/lib/currency";
import { generateGoogleCalendarURL, generateICS } from "../lib/calendar";
import { formatMinutesAsTime } from "../lib/constants";

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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
  organizationName?: string;
};

export function BookingConfirmation({
  confirmationCode,
  slug,
  onNewBooking,
  details,
  organizationName,
}: BookingConfirmationProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(confirmationCode);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleDownloadICS = () => {
    if (!details) return;
    const icsContent = generateICS({
      date: details.date,
      startTime: details.startTime,
      endTime: details.endTime,
      staffName: details.staffName,
      services: details.services.map((s) => s.name),
      confirmationCode,
      organizationName: organizationName ?? slug,
    });
    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appointment-${confirmationCode}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGoogleCalendar = () => {
    if (!details) return;
    const url = generateGoogleCalendarURL({
      date: details.date,
      startTime: details.startTime,
      endTime: details.endTime,
      staffName: details.staffName,
      services: details.services.map((s) => s.name),
      confirmationCode,
      organizationName: organizationName ?? slug,
    });
    window.open(url, "_blank");
  };

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
          {/* Confirmation Code with copy button */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">
              Confirmation Code
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-2 text-3xl font-mono font-bold tracking-widest hover:opacity-70 transition-opacity cursor-pointer"
              title="Click to copy"
            >
              {confirmationCode}
              <Copy
                className={`size-5 ${copied ? "text-green-500" : "text-muted-foreground"}`}
              />
            </button>
          </div>

          {/* Appointment Details */}
          {details && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {formatDateDisplay(details.date)}
                  </span>
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
                            {s.name} ( {s.duration} min)
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
        {/* Calendar Integration */}
        {details && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Calendar className="mr-2 size-4" />
                Add to Calendar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleGoogleCalendar}>
                Google Calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadICS}>
                <Download className="mr-2 size-4" />
                Apple / Outlook (.ics)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
