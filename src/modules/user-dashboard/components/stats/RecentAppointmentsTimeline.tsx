"use client";

import { Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMinutesAsTime } from "@/modules/booking/lib/constants";
import { formatPrice } from "@/modules/services/lib/currency";

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RecentAppointmentsTimeline({
  appointments,
}: {
  appointments: Array<{
    appointmentId: string;
    salonName: string;
    salonSlug: string;
    date: string;
    startTime: number;
    endTime: number;
    status: string;
    services: string[];
    total: number;
  }>;
}) {
  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Visits</CardTitle>
          <CardDescription>Your appointment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            No appointments yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Visits</CardTitle>
        <CardDescription>Your recent appointments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div
              key={appt.appointmentId}
              className="flex gap-4 items-start pb-4 border-b last:border-b-0"
            >
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className="text-xs text-muted-foreground">
                  {formatDate(appt.date)}
                </div>
                <div className="text-xs font-medium">
                  {formatMinutesAsTime(appt.startTime)}
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Store className="size-3.5 text-muted-foreground" />
                  <span className="font-medium text-sm">{appt.salonName}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {appt.services.join(", ")}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">
                  {formatPrice(appt.total)}
                </div>
                <Badge variant="secondary" className="text-xs mt-1">
                  {appt.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
