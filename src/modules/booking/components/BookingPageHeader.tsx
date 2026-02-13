"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type BusinessHoursDay = {
  open: string;
  close: string;
  closed: boolean;
};

type BookingPageHeaderProps = {
  salonName: string;
  address?: { city?: string; state?: string } | null;
  businessHours?: Record<string, BusinessHoursDay | undefined> | null;
};

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function getTodayStatus(
  businessHours?: Record<string, BusinessHoursDay | undefined> | null,
): { isOpen: boolean; hours?: string } {
  if (!businessHours) return { isOpen: false };

  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const today = businessHours[dayKey];

  if (!today || today.closed) return { isOpen: false };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = today.open.split(":").map(Number);
  const [closeH, closeM] = today.close.split(":").map(Number);

  if (Number.isNaN(openH) || Number.isNaN(openM) || Number.isNaN(closeH) || Number.isNaN(closeM)) {
    return { isOpen: false };
  }

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  // Handle overnight hours (e.g., open: "22:00", close: "02:00")
  const isOpen =
    closeMinutes > openMinutes
      ? currentMinutes >= openMinutes && currentMinutes < closeMinutes
      : currentMinutes >= openMinutes || currentMinutes < closeMinutes;

  return {
    isOpen,
    hours: `${today.open} - ${today.close}`,
  };
}

export function BookingPageHeader({
  salonName,
  address,
  businessHours,
}: BookingPageHeaderProps) {
  // Compute date and open/closed status client-side only to avoid hydration mismatch
  const [dateStr, setDateStr] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const now = new Date();
    setDateStr(
      now.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }),
    );
    setIsOpen(getTodayStatus(businessHours).isOpen);
  }, [businessHours]);

  const location = [address?.city, address?.state].filter(Boolean).join(" / ");

  return (
    <header className="border-b">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight uppercase">
          {salonName}
        </h1>
        <div className="hidden sm:flex items-center gap-6 text-xs uppercase tracking-widest">
          {dateStr && (
            <div>
              <span className="text-muted-foreground">Date</span>
              <div className="font-semibold">{dateStr}</div>
            </div>
          )}
          {location && (
            <div>
              <span className="text-muted-foreground">Location</span>
              <div className="font-semibold">{location}</div>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Status</span>
            <div>
              <Badge
                variant={isOpen ? "default" : "secondary"}
                className="text-[10px] uppercase tracking-widest"
              >
                {isOpen ? "Open" : "Closed"}
              </Badge>
            </div>
          </div>
        </div>
        {/* Mobile: only status */}
        <div className="sm:hidden">
          <Badge
            variant={isOpen ? "default" : "secondary"}
            className="text-[10px] uppercase tracking-widest"
          >
            {isOpen ? "Open" : "Closed"}
          </Badge>
        </div>
      </div>
    </header>
  );
}
