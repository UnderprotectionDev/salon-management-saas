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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
  no_show: "bg-red-100 text-red-800",
};

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
                  className={statusColors[appt.status] ?? ""}
                >
                  {appt.status.replace("_", " ")}
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
