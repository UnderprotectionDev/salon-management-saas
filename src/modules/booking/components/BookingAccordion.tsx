"use client";

import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useBookingFlow } from "../hooks/useBookingFlow";
import type { BookingPanel } from "../lib/constants";
import { formatMinutesAsTime, PANEL_LABELS } from "../lib/constants";
import { AccordionPanel } from "./AccordionPanel";
import { BookingForm } from "./BookingForm";
import { DatePicker } from "./DatePicker";
import { ServiceSelector } from "./ServiceSelector";
import { SlotLockCountdown } from "./SlotLockCountdown";
import { StaffSelector } from "./StaffSelector";
import { StickyBottomBar } from "./StickyBottomBar";
import { TimeSlotGrid } from "./TimeSlotGrid";

type BookingAccordionProps = {
  organizationId: Id<"organization">;
  organizationName: string;
  slug: string;
  services: Array<{
    _id: Id<"services">;
    name: string;
    duration: number;
    bufferTime?: number;
    price: number;
    description?: string;
    categoryName?: string;
    isPopular?: boolean;
  }>;
  staffMembers: Array<{
    _id: Id<"staff">;
    name: string;
    imageUrl?: string;
    bio?: string;
    serviceIds?: Id<"services">[];
  }>;
  initialServiceIds?: Id<"services">[];
  initialStaffId?: Id<"staff"> | null;
  userSession?: { name?: string; email?: string } | null;
  userPhone?: string;
  onConfirm: (result: {
    appointmentId: string;
    confirmationCode: string;
    details: {
      date: string;
      startTime: number;
      endTime: number;
      staffName: string;
      services: Array<{ name: string; duration: number; price: number }>;
    };
  }) => void;
};

export function BookingAccordion({
  organizationId,
  organizationName,
  slug,
  services,
  staffMembers,
  initialServiceIds,
  initialStaffId,
  userSession,
  userPhone,
  onConfirm,
}: BookingAccordionProps) {
  const {
    state,
    setServiceIds,
    setStaffId,
    setDate,
    setSlot,
    setCustomerInfo,
    advancePanel,
    openPanel,
    getPanelState,
  } = useBookingFlow();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with provided values (e.g., "Book Again" flow)
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (prefillApplied.current) return;
    if (initialServiceIds?.length) {
      const eligible = staffMembers
        .filter((s) =>
          initialServiceIds.every((sid) => s.serviceIds?.includes(sid)),
        )
        .map((s) => s._id);
      setServiceIds(initialServiceIds, eligible);
    }
    if (initialStaffId !== undefined) {
      setStaffId(initialStaffId);
    }
    prefillApplied.current = true;
  }, [initialServiceIds, initialStaffId, staffMembers, setServiceIds, setStaffId]);

  const createAppointment = useMutation(api.appointments.create);
  const linkCustomer = useMutation(api.customers.linkToCurrentUser);
  const savePhoneToProfile = useMutation(api.userProfile.savePhoneFromBooking);

  // Derived data
  const selectedServices = services.filter((s) =>
    state.serviceIds.includes(s._id),
  );
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.duration,
    0,
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Filter staff who can perform ALL selected services
  const eligibleStaff = staffMembers.filter((s) => {
    if (state.serviceIds.length === 0) return true;
    return state.serviceIds.every((sid) => s.serviceIds?.includes(sid));
  });

  const selectedStaff = staffMembers.find((s) => s._id === state.staffId);

  // Summary text generators
  const getServicesSummary = () => {
    if (selectedServices.length === 0) return undefined;
    const names = selectedServices.map((s) => s.name).join(" + ");
    return `${names} · ${totalDuration} min ·${formatPrice(totalPrice)}`;
  };

  const getStaffSummary = () => {
    if (state.staffId === null && state.completedPanels.includes("staff")) {
      return "Uygun Personel";
    }
    return selectedStaff?.name;
  };

  const getDateTimeSummary = () => {
    if (!state.date || state.slotStartTime === null) return undefined;
    const d = new Date(`${state.date}T00:00:00`);
    const dateStr = d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      weekday: "short",
    });
    return `${dateStr} · ${formatMinutesAsTime(state.slotStartTime)}`;
  };

  // Panel toggle handler
  const handlePanelToggle = (panel: BookingPanel) => {
    const panelState = getPanelState(panel);
    if (panelState === "completed") {
      openPanel(panel);
    } else if (panelState === "active") {
      // Optionally collapse active panel (do nothing for now)
    }
  };

  // Services continue
  const handleServicesContinue = () => {
    if (state.serviceIds.length === 0) return;
    advancePanel("services");
  };

  // Staff selection (auto-advance)
  const handleStaffSelect = (id: Id<"staff"> | null) => {
    setStaffId(id);
    advancePanel("staff");
  };

  // DateTime continue
  const handleDateTimeContinue = () => {
    if (state.slotStartTime === null) return;
    advancePanel("datetime");
  };

  // Submit booking
  const handleConfirm = async () => {
    if (
      !state.customerName.trim() ||
      !state.customerPhone.trim() ||
      state.date === null ||
      state.slotStartTime === null ||
      state.slotEndTime === null
    ) {
      toast.error("Lutfen tum zorunlu alanlari doldurun");
      return;
    }

    // Validate phone format
    if (!/^\+90 5\d{2} \d{3} \d{2} \d{2}$/.test(state.customerPhone)) {
      toast.error("Telefon formati: +90 5XX XXX XX XX");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAppointment({
        organizationId,
        staffId: state.staffId as Id<"staff">,
        date: state.date,
        startTime: state.slotStartTime,
        endTime: state.slotEndTime,
        serviceIds: state.serviceIds,
        customer: {
          name: state.customerName,
          phone: state.customerPhone,
          email: state.customerEmail || undefined,
          notes: state.customerNotes || undefined,
        },
        sessionId: state.sessionId,
      });

      // Best-effort: link customer and save phone
      linkCustomer({ customerId: result.customerId }).catch(() => {});
      if (state.customerPhone) {
        savePhoneToProfile({ phone: state.customerPhone }).catch(() => {});
      }

      onConfirm({
        appointmentId: result.appointmentId as string,
        confirmationCode: result.confirmationCode,
        details: {
          date: state.date,
          startTime: state.slotStartTime,
          endTime: state.slotEndTime,
          staffName: selectedStaff?.name ?? "Uygun Personel",
          services: selectedServices.map((s) => ({
            name: s.name,
            duration: s.duration,
            price: s.price,
          })),
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : ((error as { data?: { message?: string } })?.data?.message ??
            "Randevu olusturulamadi");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Slot lock expired handler
  const handleLockExpired = () => {
    openPanel("datetime");
    toast.error("Slot suresi doldu, lutfen tekrar saat secin");
  };

  // Check if confirm panel can show the confirm button
  const allStepsReady =
    state.serviceIds.length > 0 &&
    state.completedPanels.includes("services") &&
    state.completedPanels.includes("staff") &&
    state.completedPanels.includes("datetime") &&
    state.date !== null &&
    state.slotStartTime !== null &&
    state.slotEndTime !== null &&
    (state.staffId !== null || state.completedPanels.includes("staff"));

  return (
    <div className="space-y-3 pb-20">
      {/* Panel 1: Services */}
      <AccordionPanel
        stepNumber={1}
        title={PANEL_LABELS.services}
        state={getPanelState("services")}
        summary={getServicesSummary()}
        onToggle={() => handlePanelToggle("services")}
      >
        <ServiceSelector
          services={services}
          selectedIds={state.serviceIds}
          onSelectionChange={(ids) =>
            setServiceIds(
              ids,
              staffMembers
                .filter((s) =>
                  ids.length === 0 ||
                  ids.every((sid) => s.serviceIds?.includes(sid)),
                )
                .map((s) => s._id),
            )
          }
        />
        <div className="mt-4">
          <Button
            onClick={handleServicesContinue}
            disabled={state.serviceIds.length === 0}
            className="w-full"
          >
            Devam Et
          </Button>
        </div>
      </AccordionPanel>

      {/* Panel 2: Staff */}
      <AccordionPanel
        stepNumber={2}
        title={PANEL_LABELS.staff}
        state={getPanelState("staff")}
        summary={getStaffSummary()}
        onToggle={() => handlePanelToggle("staff")}
      >
        <StaffSelector
          staffMembers={eligibleStaff}
          selectedId={state.staffId}
          onSelect={handleStaffSelect}
          showAnyOption={eligibleStaff.length > 1}
        />
      </AccordionPanel>

      {/* Panel 3: Date & Time */}
      <AccordionPanel
        stepNumber={3}
        title={PANEL_LABELS.datetime}
        state={getPanelState("datetime")}
        summary={getDateTimeSummary()}
        onToggle={() => handlePanelToggle("datetime")}
      >
        <div className="space-y-6">
          <DatePicker
            selectedDate={state.date}
            onDateSelect={setDate}
            organizationId={organizationId}
            serviceIds={state.serviceIds}
            staffId={state.staffId}
          />
          {state.date && (
            <TimeSlotGrid
              organizationId={organizationId}
              date={state.date}
              serviceIds={state.serviceIds}
              staffId={state.staffId}
              selectedStartTime={state.slotStartTime}
              sessionId={state.sessionId}
              onSlotSelect={(
                start,
                end,
                lockId,
                lockExpiresAt,
                slotStaffId,
              ) => {
                setSlot(start, end, lockId, lockExpiresAt, slotStaffId);
              }}
            />
          )}
          <Button
            onClick={handleDateTimeContinue}
            disabled={state.slotStartTime === null}
            className="w-full"
          >
            Devam Et
          </Button>
        </div>
      </AccordionPanel>

      {/* Panel 4: Customer Info & Confirm */}
      <AccordionPanel
        stepNumber={4}
        title={PANEL_LABELS.confirm}
        state={getPanelState("confirm")}
        onToggle={() => handlePanelToggle("confirm")}
      >
        <div className="space-y-6">
          {/* Slot lock countdown */}
          {state.lockExpiresAt && (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">Slot suresi:</p>
              <SlotLockCountdown
                expiresAt={state.lockExpiresAt}
                onExpired={handleLockExpired}
              />
            </div>
          )}

          {/* Customer info form */}
          <div>
            <h3 className="text-sm font-medium mb-3">Musteri Bilgileri</h3>
            <BookingForm
              initialValues={{
                name: state.customerName || userSession?.name || "",
                phone: state.customerPhone || userPhone || "",
                email: state.customerEmail || userSession?.email || "",
                notes: state.customerNotes,
              }}
              onSubmit={() => {}}
              inline
              onChange={setCustomerInfo}
            />
          </div>

          <Separator />

          {/* Appointment summary */}
          <div>
            <h3 className="text-sm font-medium mb-3">Randevu Ozeti</h3>
            <div className="space-y-2 text-sm">
              {selectedServices.map((s) => (
                <div key={s._id} className="flex justify-between">
                  <span>
                    {s.name}{" "}
                    <span className="text-muted-foreground">
                      ({s.duration} min
                      {s.bufferTime ? ` + ${s.bufferTime} min buffer` : ""})
                    </span>
                  </span>
                  <span className="font-medium">{formatPrice(s.price)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Personel</span>
                <span>{selectedStaff?.name ?? "Uygun Personel"}</span>
              </div>
              {state.date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarih</span>
                  <span>
                    {new Date(`${state.date}T00:00:00`).toLocaleDateString(
                      "tr-TR",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </span>
                </div>
              )}
              {state.slotStartTime !== null && state.slotEndTime !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saat</span>
                  <span>
                    {formatMinutesAsTime(state.slotStartTime)} -{" "}
                    {formatMinutesAsTime(state.slotEndTime)}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Toplam</span>
                <span>
                  {totalDuration} min ·{formatPrice(totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !allStepsReady}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Randevu olusturuluyor...
              </>
            ) : (
              "Randevuyu Onayla"
            )}
          </Button>
        </div>
      </AccordionPanel>

      {/* Sticky bottom bar */}
      <StickyBottomBar
        serviceCount={state.serviceIds.length}
        totalDuration={totalDuration}
        totalPrice={totalPrice}
        canConfirm={allStepsReady && getPanelState("confirm") !== "active"}
        onConfirmClick={() => openPanel("confirm")}
      />
    </div>
  );
}
