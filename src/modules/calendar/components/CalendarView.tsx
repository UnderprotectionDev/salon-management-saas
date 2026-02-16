"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateAppointmentDialog } from "@/modules/booking";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useCalendarState } from "../hooks/useCalendarState";
import type { AppointmentWithDetails } from "../lib/types";
import { AppointmentDetailModal } from "./AppointmentDetailModal";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarRescheduleDialog } from "./CalendarRescheduleDialog";
import { DayView, type DragRescheduleData } from "./DayView";
import { DragConfirmDialog } from "./DragConfirmDialog";
import { WeekView } from "./WeekView";

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

  const rawAppointments =
    calendar.viewMode === "day" ? dayAppointments : weekAppointments;

  // Apply staff filter to appointments (for both day and week views)
  const appointments =
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
      />

      {loading ? (
        <Skeleton className="h-[600px] w-full rounded-lg" />
      ) : calendar.viewMode === "day" ? (
        <DayView
          staffList={filteredStaffList ?? []}
          appointments={(appointments ?? []) as AppointmentWithDetails[]}
          date={calendar.dateStr}
          onAppointmentClick={handleAppointmentClick}
          onDragReschedule={handleDragReschedule}
          onSlotClick={handleSlotClick}
        />
      ) : (
        <WeekView
          appointments={(appointments ?? []) as AppointmentWithDetails[]}
          startDate={calendar.weekRange.startDate}
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
          appointments={(appointments ?? []) as AppointmentWithDetails[]}
          onClose={() => setDragData(null)}
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
