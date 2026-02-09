"use client";

import { CalendarView } from "@/modules/calendar";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-muted-foreground">View and manage appointments</p>
      </div>
      <CalendarView />
    </div>
  );
}
