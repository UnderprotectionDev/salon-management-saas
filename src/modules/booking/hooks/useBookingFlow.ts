"use client";

import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";

export type BookingState = {
  // Selections
  serviceIds: Id<"services">[];
  staffId: Id<"staff"> | null;
  date: string | null;
  slotStartTime: number | null;
  slotEndTime: number | null;
  lockId: Id<"slotLocks"> | null;
  lockExpiresAt: number | null;
  sessionId: string;
};

const generateSessionId = () => crypto.randomUUID();

export function useBookingFlow() {
  const [state, setState] = useState<BookingState>({
    serviceIds: [],
    staffId: null,
    date: null,
    slotStartTime: null,
    slotEndTime: null,
    lockId: null,
    lockExpiresAt: null,
    sessionId: generateSessionId(),
  });

  // Set services with smart reset
  const setServiceIds = (
    serviceIds: Id<"services">[],
    eligibleStaffIds?: Id<"staff">[],
  ) =>
    setState((s) => {
      // Check if current staff is still eligible
      const staffStillEligible =
        s.staffId === null ||
        !eligibleStaffIds ||
        eligibleStaffIds.includes(s.staffId);

      if (staffStillEligible) {
        // Staff is fine, but datetime needs reset (service duration changed)
        return {
          ...s,
          serviceIds,
          date: null,
          slotStartTime: null,
          slotEndTime: null,
          lockId: null,
          lockExpiresAt: null,
        };
      }

      // Staff is no longer eligible - reset staff + datetime
      return {
        ...s,
        serviceIds,
        staffId: null,
        date: null,
        slotStartTime: null,
        slotEndTime: null,
        lockId: null,
        lockExpiresAt: null,
      };
    });

  // Set staff with smart reset
  const setStaffId = (staffId: Id<"staff"> | null) =>
    setState((s) => ({
      ...s,
      staffId,
      // Reset datetime when staff changes (availability differs)
      date: null,
      slotStartTime: null,
      slotEndTime: null,
      lockId: null,
      lockExpiresAt: null,
    }));

  // Set date with smart reset (only time resets)
  const setDate = (date: string | null) =>
    setState((s) => ({
      ...s,
      date,
      slotStartTime: null,
      slotEndTime: null,
      lockId: null,
      lockExpiresAt: null,
    }));

  // Set time slot (optionally resolve staff from "any available" slot)
  const setSlot = (
    startTime: number,
    endTime: number,
    lockId: Id<"slotLocks"> | null,
    lockExpiresAt?: number | null,
    resolvedStaffId?: Id<"staff">,
  ) =>
    setState((s) => ({
      ...s,
      slotStartTime: startTime,
      slotEndTime: endTime,
      lockId,
      lockExpiresAt: lockExpiresAt ?? null,
      // When "any staff" was selected, capture the resolved staff from the slot
      staffId:
        resolvedStaffId && s.staffId === null ? resolvedStaffId : s.staffId,
    }));

  // Full reset
  const reset = () =>
    setState({
      serviceIds: [],
      staffId: null,
      date: null,
      slotStartTime: null,
      slotEndTime: null,
      lockId: null,
      lockExpiresAt: null,
      sessionId: generateSessionId(),
    });

  // Derived: check if all selections are complete for confirmation
  const canConfirm =
    state.serviceIds.length > 0 &&
    state.date !== null &&
    state.slotStartTime !== null &&
    state.slotEndTime !== null;

  // Derived: which steps are enabled
  const hasServices = state.serviceIds.length > 0;
  const hasStaff = true; // Staff step is always enabled (user can skip to "any available")
  const hasDatetime = state.date !== null && state.slotStartTime !== null;

  return {
    state,
    setServiceIds,
    setStaffId,
    setDate,
    setSlot,
    reset,
    canConfirm,
    hasServices,
    hasStaff,
    hasDatetime,
  };
}
