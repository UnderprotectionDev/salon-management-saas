"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateAppointmentDialog } from "@/modules/booking";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import { useCalendarState } from "../hooks/useCalendarState";
import type { AppointmentWithDetails } from "../lib/types";
import { AppointmentDetailModal } from "./AppointmentDetailModal";
import { CalendarHeader } from "./CalendarHeader";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";

export function CalendarView() {
  const { activeOrganization, currentRole, currentStaff } = useOrganization();
  const calendar = useCalendarState();
  const [selectedAppt, setSelectedAppt] =
    useState<AppointmentWithDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const orgId = activeOrganization?._id;
  const isStaffOnly = currentRole === "staff";

  // Staff list — staff only sees themselves
  const allStaffList = useQuery(
    api.staff.listActive,
    orgId ? { organizationId: orgId } : "skip",
  );
  const staffList = isStaffOnly && currentStaff && allStaffList
    ? allStaffList.filter((s) => s._id === currentStaff._id)
    : allStaffList;

  // Day view data
  const dayAppointments = useQuery(
    api.appointments.getByDate,
    orgId && calendar.viewMode === "day"
      ? { organizationId: orgId, date: calendar.dateStr }
      : "skip",
  );

  // Week view data
  const weekAppointments = useQuery(
    api.appointments.getByDateRange,
    orgId && calendar.viewMode === "week"
      ? {
          organizationId: orgId,
          startDate: calendar.weekRange.startDate,
          endDate: calendar.weekRange.endDate,
        }
      : "skip",
  );

  const appointments =
    calendar.viewMode === "day" ? dayAppointments : weekAppointments;

  const loading = staffList === undefined || appointments === undefined;

  function handleAppointmentClick(appt: AppointmentWithDetails) {
    setSelectedAppt(appt);
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <CalendarHeader
        selectedDate={calendar.selectedDate}
        viewMode={calendar.viewMode}
        onViewModeChange={calendar.setViewMode}
        onToday={calendar.goToToday}
        onPrev={calendar.goToPrev}
        onNext={calendar.goToNext}
        organizationId={orgId}
        calendarDateStr={calendar.dateStr}
      />

      {loading ? (
        <Skeleton className="h-[600px] w-full rounded-lg" />
      ) : calendar.viewMode === "day" ? (
        <DayView
          staffList={staffList ?? []}
          appointments={(appointments ?? []) as AppointmentWithDetails[]}
          date={calendar.dateStr}
          onAppointmentClick={handleAppointmentClick}
        />
      ) : (
        <WeekView
          appointments={(appointments ?? []) as AppointmentWithDetails[]}
          startDate={calendar.weekRange.startDate}
          onAppointmentClick={handleAppointmentClick}
        />
      )}

      <AppointmentDetailModal
        appointment={selectedAppt}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
