"use client";

import { useQuery } from "convex/react";
import { Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APPOINTMENT_STATUS_BADGE_CLASSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/lib/status-colors";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}


export function TodaysAppointments() {
  const { activeOrganization } = useOrganization();
  const today = getToday();

  const appointments = useQuery(
    api.appointments.getByDate,
    activeOrganization
      ? { organizationId: activeOrganization._id, date: today }
      : "skip",
  );

  const loading = appointments === undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="size-5" />
          Today's Appointments
        </CardTitle>
        <CardDescription>
          {loading
            ? "Loading..."
            : `${appointments?.length ?? 0} appointments today`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : appointments && appointments.length > 0 ? (
          <div className="space-y-2">
            {appointments.map((appt) => (
              <div
                key={appt._id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium tabular-nums text-muted-foreground">
                    {formatTime(appt.startTime)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {appt.customerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {appt.services.map((s) => s.serviceName).join(", ")} —{" "}
                      {appt.staffName}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={APPOINTMENT_STATUS_BADGE_CLASSES[appt.status as AppointmentStatus] ?? ""}
                >
                  {APPOINTMENT_STATUS_LABELS[appt.status as AppointmentStatus] ?? appt.status.replaceAll("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No appointments scheduled for today
          </div>
        )}
      </CardContent>
    </Card>
  );
}
