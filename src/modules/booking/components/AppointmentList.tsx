"use client";

import { useQuery } from "convex/react";
import { Calendar, Clock, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMinutesAsTime } from "../lib/constants";
import { AppointmentStatusBadge } from "./AppointmentStatusBadge";
import { CancelAppointmentDialog } from "./CancelAppointmentDialog";
import { RescheduleDialog } from "./RescheduleDialog";
import { UpdateStatusDropdown } from "./UpdateStatusDropdown";

type AppointmentListProps = {
  organizationId: Id<"organization">;
  searchCode?: string;
};

function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

async function copyCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    toast.success("Code copied");
  } catch {
    toast.error("Failed to copy code");
  }
}

export function AppointmentList({
  organizationId,
  searchCode,
}: AppointmentListProps) {
  const appointments = useQuery(api.appointments.list, { organizationId });

  if (appointments === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Filter by confirmation code if searching
  const filtered = searchCode
    ? appointments.filter((a) =>
        a.confirmationCode.toLowerCase().includes(searchCode.toLowerCase()),
      )
    : appointments;

  if (filtered.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Calendar className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-medium">
            {searchCode ? "No matching appointments" : "No appointments"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {searchCode
              ? `No appointments found with code "${searchCode}"`
              : "No appointments found"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group appointments by date
  const groupedByDate = filtered.reduce<Record<string, typeof filtered>>(
    (groups, appt) => {
      const key = appt.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(appt);
      return groups;
    },
    {},
  );

  const dateKeys = Object.keys(groupedByDate);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Services</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dateKeys.map((dateKey) => {
            const dateAppts = groupedByDate[dateKey];
            return dateAppts.map((appt, idx) => (
              <TableRow key={appt._id}>
                {idx === 0 ? (
                  <TableCell
                    rowSpan={dateAppts.length}
                    className="align-top font-medium whitespace-nowrap"
                  >
                    {formatDateLabel(dateKey)}
                  </TableCell>
                ) : null}
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <span>
                      {formatMinutesAsTime(appt.startTime)} -{" "}
                      {formatMinutesAsTime(appt.endTime)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-1.5 py-0.5 font-mono text-xs tracking-wider"
                        onClick={() => copyCode(appt.confirmationCode)}
                      >
                        {appt.confirmationCode}
                        <Copy className="ml-1 size-3 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Click to copy</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{appt.customerName}</div>
                  <div className="text-xs text-muted-foreground">
                    {appt.customerPhone}
                  </div>
                </TableCell>
                <TableCell>{appt.staffName}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {appt.services.map((s) => s.serviceName).join(", ")}
                  </div>
                </TableCell>
                <TableCell>{formatPrice(appt.total)}</TableCell>
                <TableCell>
                  <AppointmentStatusBadge status={appt.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {appt.status !== "cancelled" &&
                      appt.status !== "completed" &&
                      appt.status !== "no_show" && (
                        <>
                          <UpdateStatusDropdown
                            appointmentId={appt._id}
                            organizationId={organizationId}
                            currentStatus={appt.status}
                            appointmentDate={appt.date}
                            appointmentStartTime={appt.startTime}
                          />
                          {(appt.status === "pending" ||
                            appt.status === "confirmed") && (
                            <RescheduleDialog
                              appointmentId={appt._id}
                              organizationId={organizationId}
                              currentDate={appt.date}
                              currentStartTime={appt.startTime}
                              currentEndTime={appt.endTime}
                              staffId={appt.staffId}
                              serviceIds={appt.services.map(
                                (s) => s.serviceId,
                              )}
                            />
                          )}
                          <CancelAppointmentDialog
                            appointmentId={appt._id}
                            organizationId={organizationId}
                          />
                        </>
                      )}
                  </div>
                </TableCell>
              </TableRow>
            ));
          })}
        </TableBody>
      </Table>
    </div>
  );
}
