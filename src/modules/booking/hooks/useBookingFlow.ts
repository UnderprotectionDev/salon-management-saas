"use client";

import { useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { BookingStep } from "../lib/constants";

export type BookingState = {
  step: BookingStep;
  serviceIds: Id<"services">[];
  staffId: Id<"staff"> | null;
  date: string | null;
  slotStartTime: number | null;
  slotEndTime: number | null;
  lockId: Id<"slotLocks"> | null;
  lockExpiresAt: number | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNotes: string;
  sessionId: string;
};

const generateSessionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function useBookingFlow() {
  const [state, setState] = useState<BookingState>({
    step: "services",
    serviceIds: [],
    staffId: null,
    date: null,
    slotStartTime: null,
    slotEndTime: null,
    lockId: null,
    lockExpiresAt: null,
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerNotes: "",
    sessionId: generateSessionId(),
  });

  const setStep = (step: BookingStep) => setState((s) => ({ ...s, step }));

  const setServiceIds = (serviceIds: Id<"services">[]) =>
    setState((s) => ({ ...s, serviceIds }));

  const setStaffId = (staffId: Id<"staff"> | null) =>
    setState((s) => ({ ...s, staffId }));

  const setDate = (date: string | null) =>
    setState((s) => ({
      ...s,
      date,
      slotStartTime: null,
      slotEndTime: null,
      lockId: null,
      lockExpiresAt: null,
    }));

  const setSlot = (
    startTime: number,
    endTime: number,
    lockId: Id<"slotLocks"> | null,
    lockExpiresAt?: number | null,
  ) =>
    setState((s) => ({
      ...s,
      slotStartTime: startTime,
      slotEndTime: endTime,
      lockId,
      lockExpiresAt: lockExpiresAt ?? null,
    }));

  const setCustomerInfo = (info: {
    name: string;
    phone: string;
    email: string;
    notes: string;
  }) =>
    setState((s) => ({
      ...s,
      customerName: info.name,
      customerPhone: info.phone,
      customerEmail: info.email,
      customerNotes: info.notes,
    }));

  const reset = () =>
    setState({
      step: "services",
      serviceIds: [],
      staffId: null,
      date: null,
      slotStartTime: null,
      slotEndTime: null,
      lockId: null,
      lockExpiresAt: null,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerNotes: "",
      sessionId: generateSessionId(),
    });

  return {
    state,
    setStep,
    setServiceIds,
    setStaffId,
    setDate,
    setSlot,
    setCustomerInfo,
    reset,
  };
}
