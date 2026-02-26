"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentCard, type UserAppointment } from "./AppointmentCard";

export function MyAppointmentsList({
  appointments,
  filter,
}: {
  appointments: UserAppointment[] | undefined;
  filter: "upcoming" | "past";
}) {
  if (appointments === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const terminalStatuses = ["completed", "cancelled", "no_show"];

  const filtered = appointments.filter((a) => {
    if (filter === "upcoming") {
      return a.date >= today && !terminalStatuses.includes(a.status);
    }
    return a.date < today || terminalStatuses.includes(a.status);
  });

  if (filtered.length === 0) {
    return (
      <Empty className="border rounded-lg">
        <EmptyMedia variant="icon">
          <Calendar className="size-5" />
        </EmptyMedia>
        <EmptyTitle>
          {filter === "upcoming"
            ? "No upcoming appointments"
            : "No past appointments"}
        </EmptyTitle>
        <EmptyDescription>
          {filter === "upcoming"
            ? "Appointments you book will appear here."
            : "Your completed appointments will be listed here."}
        </EmptyDescription>
        {filter === "upcoming" && (
          <Button asChild className="mt-2">
            <Link href="/">Find Salon</Link>
          </Button>
        )}
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {filtered.map((appt) => (
        <AppointmentCard key={appt._id} appointment={appt} />
      ))}
    </div>
  );
}
