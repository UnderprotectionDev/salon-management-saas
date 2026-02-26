"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateAppointmentDialog } from "@/modules/booking";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useCalendarState } from "../hooks/useCalendarState";
import { getStaffColor } from "../lib/constants";
import type { AppointmentWithDetails, DragRescheduleData } from "../lib/types";
import { computeCalendarHourRange } from "../lib/utils";
import { AgendaView } from "./agenda-view/AgendaView";
import { DayView } from "./day-view/DayView";
import { AppointmentDetailModal } from "./dialogs/AppointmentDetailModal";
import { CalendarRescheduleDialog } from "./dialogs/CalendarRescheduleDialog";
import { DragConfirmDialog } from "./dnd/DragConfirmDialog";
import { CalendarHeader } from "./header/CalendarHeader";
import { MonthView } from "./month-view/MonthView";
import { WeekView } from "./week-view/WeekView";
import { YearView } from "./year-view/YearView";

export function CalendarView() {
  const { activeOrganization, currentRole, currentStaff } = useOrganization();
  const calendar = useCalendarState();

  // Detail modal state
  const [selectedAppt, setSelectedAppt] =
    useState<AppointmentWithDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Reschedule dialog state (triggered from detail modal)
  const [rescheduleAppt, setRescheduleAppt] =
    useState<AppointmentWithDetails | null>(null);

  // DnD reschedule confirmation state
  const [dragData, setDragData] = useState<DragRescheduleData | null>(null);

  // Slot click -> create appointment state
  const [slotCreate, setSlotCreate] = useState<{
    staffId: Id<"staff">;
    time: number;
  } | null>(null);

  // Staff filter state (for owners)
  const [staffFilter, setStaffFilter] = useState<Id<"staff"> | "all">("all");

  const orgId = activeOrganization?._id;
  const isOwner = currentRole === "owner";
  const isStaffOnly = currentRole === "staff";

  // Staff list
  const allStaffList = useQuery(
    api.staff.listActive,
    orgId ? { organizationId: orgId } : "skip",
  );
  const staffList =
    isStaffOnly && currentStaff && allStaffList
      ? allStaffList.filter((s) => s._id === currentStaff._id)
      : allStaffList;

  // Apply staff filter for owners
  const filteredStaffList =
    isOwner && staffFilter !== "all" && staffList
      ? staffList.filter((s) => s._id === staffFilter)
      : staffList;

  // Fetch org settings for dynamic business hours
  const orgSettings = useQuery(
    api.organizations.getSettings,
    orgId ? { organizationId: orgId } : "skip",
  );
  const { startHour, endHour } = computeCalendarHourRange(
    orgSettings?.businessHours ?? undefined,
  );

  // Build staff → color map from the full (unfiltered) staff list so colors
  // remain stable regardless of the active filter.
  const staffColorMap = new Map<string, string>();
  if (staffList) {
    for (let i = 0; i < staffList.length; i++) {
      staffColorMap.set(staffList[i]._id, getStaffColor(i));
    }
  }

  // --- Data queries per view mode ---

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

  // Month view data (covers full grid range, 35-42 days)
  const monthAppointments = useQuery(
    api.appointments.getByDateRange,
    orgId && calendar.viewMode === "month"
      ? {
          organizationId: orgId,
          startDate: calendar.monthRange.startDate,
          endDate: calendar.monthRange.endDate,
        }
      : "skip",
  );

  // Year view data (Jan 1 - Dec 31)
  const yearAppointments = useQuery(
    api.appointments.getByDateRange,
    orgId && calendar.viewMode === "year"
      ? {
          organizationId: orgId,
          startDate: `${calendar.yearValue}-01-01`,
          endDate: `${calendar.yearValue}-12-31`,
        }
      : "skip",
  );

  // Agenda view data (same range as month)
  const agendaAppointments = useQuery(
    api.appointments.getByDateRange,
    orgId && calendar.viewMode === "agenda"
      ? {
          organizationId: orgId,
          startDate: calendar.monthRange.startDate,
          endDate: calendar.monthRange.endDate,
        }
      : "skip",
  );

  // Select raw appointments based on current view
  function getRawAppointments() {
    switch (calendar.viewMode) {
      case "day":
        return dayAppointments;
      case "week":
        return weekAppointments;
      case "month":
        return monthAppointments;
      case "year":
        return yearAppointments;
      case "agenda":
        return agendaAppointments;
    }
  }

  const rawAppointments = getRawAppointments();

  // Apply staff filter to appointments
  const appointments: AppointmentWithDetails[] | undefined =
    isOwner && staffFilter !== "all" && rawAppointments
      ? rawAppointments.filter((a) => a.staffId === staffFilter)
      : rawAppointments;

  const loading = staffList === undefined || appointments === undefined;

  function handleAppointmentClick(appt: AppointmentWithDetails) {
    setSelectedAppt(appt);
    setModalOpen(true);
  }

  function handleRescheduleRequest(appt: AppointmentWithDetails) {
    setRescheduleAppt(appt);
  }

  function handleDragReschedule(data: DragRescheduleData) {
    setDragData(data);
  }

  function handleSlotClick(staffId: string, minutes: number) {
    setSlotCreate({ staffId: staffId as Id<"staff">, time: minutes });
  }

  /** Navigate from month/year to day view for a specific date. */
  function handleDayClick(date: Date) {
    calendar.goToDate(date, "day");
  }

  /** Navigate from year view to month view for a specific month. */
  function handleMonthClick(date: Date) {
    calendar.goToDate(date, "month");
  }

  // Count visible (non-cancelled/no-show) appointments for the badge
  const appointmentCount = appointments
    ? appointments.filter(
        (a) => a.status !== "cancelled" && a.status !== "no_show",
      ).length
    : undefined;

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
        staffList={isOwner ? (allStaffList ?? []) : undefined}
        staffFilter={staffFilter}
        onStaffFilterChange={isOwner ? setStaffFilter : undefined}
        appointmentCount={appointmentCount}
      />

      {loading ? (
        <Skeleton className="h-[600px] w-full rounded-lg" />
      ) : calendar.viewMode === "day" ? (
        <DayView
          staffList={filteredStaffList ?? []}
          appointments={appointments ?? []}
          staffColorMap={staffColorMap}
          date={calendar.dateStr}
          selectedDate={calendar.selectedDate}
          onDateSelect={(d) => calendar.goToDate(d, "day")}
          onAppointmentClick={handleAppointmentClick}
          onDragReschedule={handleDragReschedule}
          onSlotClick={handleSlotClick}
          startHour={startHour}
          endHour={endHour}
        />
      ) : calendar.viewMode === "week" ? (
        <WeekView
          appointments={appointments ?? []}
          staffColorMap={staffColorMap}
          startDate={calendar.weekRange.startDate}
          onAppointmentClick={handleAppointmentClick}
          startHour={startHour}
          endHour={endHour}
        />
      ) : calendar.viewMode === "month" ? (
        <MonthView
          selectedDate={calendar.selectedDate}
          appointments={appointments ?? []}
          staffColorMap={staffColorMap}
          onDayClick={handleDayClick}
          onAppointmentClick={handleAppointmentClick}
        />
      ) : calendar.viewMode === "year" ? (
        <YearView
          year={calendar.yearValue}
          appointments={appointments ?? []}
          onMonthClick={handleMonthClick}
          onDayClick={handleDayClick}
        />
      ) : (
        <AgendaView
          appointments={appointments ?? []}
          staffColorMap={staffColorMap}
          onAppointmentClick={handleAppointmentClick}
        />
      )}

      {/* Appointment detail modal with status actions */}
      <AppointmentDetailModal
        appointment={selectedAppt}
        open={modalOpen}
        onOpenChange={setModalOpen}
        organizationId={orgId}
        onRescheduleRequest={handleRescheduleRequest}
      />

      {/* Reschedule dialog (from detail modal) */}
      {rescheduleAppt && orgId && (
        <CalendarRescheduleDialog
          key={rescheduleAppt._id}
          appointment={rescheduleAppt}
          organizationId={orgId}
          open={!!rescheduleAppt}
          onOpenChange={(v) => {
            if (!v) setRescheduleAppt(null);
          }}
        />
      )}

      {/* DnD reschedule confirmation */}
      {dragData && orgId && (
        <DragConfirmDialog
          data={dragData}
          organizationId={orgId}
          date={calendar.dateStr}
          appointments={appointments ?? []}
          onClose={() => setDragData(null)}
          startHour={startHour}
          endHour={endHour}
        />
      )}

      {/* Slot click -> create appointment dialog */}
      {slotCreate && orgId && (
        <CreateAppointmentDialog
          key={`slot-${slotCreate.staffId}-${slotCreate.time}`}
          organizationId={orgId}
          date={calendar.dateStr}
          initialStaffId={slotCreate.staffId}
          initialTime={slotCreate.time}
          externalOpen={true}
          onExternalOpenChange={(v) => {
            if (!v) setSlotCreate(null);
          }}
        />
      )}
    </div>
  );
}
