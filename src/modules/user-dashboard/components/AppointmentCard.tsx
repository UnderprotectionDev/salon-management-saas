"use client";

import { useQuery } from "convex/react";
import { CalendarDays, Clock, MapPin, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AppointmentStatusBadge } from "@/modules/booking";
import { formatMinutesAsTime } from "@/modules/booking/lib/constants";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { canModifyAppointment, isPastStatus } from "../lib/appointment-helpers";
import { BookAgainButton } from "./BookAgainButton";
import { UserCancelDialog } from "./UserCancelDialog";
import { UserRescheduleDialog } from "./UserRescheduleDialog";

export type UserAppointment = {
  _id: string;
  date: string;
  startTime: number;
  endTime: number;
  status: string;
  confirmationCode: string;
  staffName: string;
  total: number;
  organizationName: string;
  organizationSlug: string;
  organizationLogo?: string;
  services: Array<{ serviceName: string; duration: number; price: number }>;
  cancellationPolicyHours: number;
};

export function AppointmentCard({
  appointment,
}: {
  appointment: UserAppointment;
}) {
  const isActive = canModifyAppointment(
    appointment.date,
    appointment.startTime,
    appointment.status,
    appointment.cancellationPolicyHours,
  );
  const isPast = isPastStatus(appointment.status);

  // Fetch full details (with IDs) only if the appointment is actionable
  const detail = useQuery(
    api.appointmentUser.getForUser,
    isActive || (isPast && appointment.status === "completed")
      ? { appointmentId: appointment._id as Id<"appointments"> }
      : "skip",
  );

  const formattedDate = new Date(
    `${appointment.date}T00:00:00`,
  ).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header: org name + status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm">
              {appointment.organizationName}
            </span>
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>
              {formatMinutesAsTime(appointment.startTime)} -{" "}
              {formatMinutesAsTime(appointment.endTime)}
            </span>
          </div>
        </div>

        {/* Staff */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <User className="size-3.5" />
          <span>{appointment.staffName}</span>
        </div>

        {/* Services */}
        <div className="space-y-1 mb-3">
          {appointment.services.map((s, i) => (
            <div
              key={`${s.serviceName}-${i}`}
              className="flex justify-between text-sm"
            >
              <span>
                {s.serviceName}{" "}
                <span className="text-muted-foreground">({s.duration}min)</span>
              </span>
              <span className="text-muted-foreground">
                {formatPrice(s.price)}
              </span>
            </div>
          ))}
        </div>

        {/* Total + Confirmation Code */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="text-xs text-muted-foreground">
            Code:{" "}
            <span className="font-mono">{appointment.confirmationCode}</span>
          </div>
          <div className="font-medium text-sm">
            {formatPrice(appointment.total)}
          </div>
        </div>

        {/* Actions */}
        {(isActive || (isPast && appointment.status === "completed")) &&
          detail && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              {isActive && (
                <>
                  {detail.staffId && (
                    <UserRescheduleDialog
                      appointmentId={appointment._id as Id<"appointments">}
                      organizationId={detail.organizationId}
                      staffId={detail.staffId}
                      serviceIds={detail.services.map((s) => s.serviceId)}
                    />
                  )}
                  <UserCancelDialog
                    appointmentId={appointment._id as Id<"appointments">}
                  />
                </>
              )}
              {isPast && appointment.status === "completed" && (
                <BookAgainButton
                  organizationSlug={appointment.organizationSlug}
                  serviceIds={detail.services.map((s) => s.serviceId)}
                  staffId={detail.staffId}
                />
              )}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
