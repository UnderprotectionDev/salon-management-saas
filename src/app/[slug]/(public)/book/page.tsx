"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ServiceSelector,
  StaffSelector,
  DatePicker,
  TimeSlotGrid,
  BookingForm,
  BookingSummary,
  BookingConfirmation,
  SlotLockCountdown,
  useBookingFlow,
  BOOKING_STEPS,
  STEP_LABELS,
} from "@/modules/booking";
import { api } from "../../../../../convex/_generated/api";

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const {
    state,
    setStep,
    setServiceIds,
    setStaffId,
    setDate,
    setSlot,
    setCustomerInfo,
    reset,
  } = useBookingFlow();

  const session = authClient.useSession();

  const [confirmation, setConfirmation] = useState<{
    appointmentId: string;
    confirmationCode: string;
    details?: {
      date: string;
      startTime: number;
      endTime: number;
      staffName: string;
      services: Array<{ name: string; duration: number; price: number }>;
    };
  } | null>(null);

  // Get organization by slug
  const organization = useQuery(api.organizations.getBySlug, { slug });

  // Get services (public)
  const services = useQuery(
    api.services.listPublic,
    organization ? { organizationId: organization._id } : "skip",
  );

  // Get staff (public)
  const staffMembers = useQuery(
    api.staff.listPublicActive,
    organization ? { organizationId: organization._id } : "skip",
  );

  if (organization === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (organization === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Salon Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The salon you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <h1 className="text-2xl font-semibold text-center mb-8">
            {organization.name}
          </h1>
          <BookingConfirmation
            confirmationCode={confirmation.confirmationCode}
            slug={slug}
            details={confirmation.details}
            onNewBooking={() => {
              setConfirmation(null);
              reset();
            }}
          />
        </div>
      </div>
    );
  }

  const currentStepIndex = BOOKING_STEPS.indexOf(state.step);

  // Filter staff who can perform selected services
  const eligibleStaff = (staffMembers ?? []).filter((s) => {
    if (state.serviceIds.length === 0) return true;
    return state.serviceIds.every((sid) =>
      (s as any).serviceIds?.includes(sid),
    );
  });

  // Get selected services' details for summary
  const selectedServices = (services ?? []).filter((s) =>
    state.serviceIds.includes(s._id),
  );

  // Get selected staff name
  const selectedStaff = staffMembers?.find((s) => s._id === state.staffId);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <h1 className="text-2xl font-semibold text-center mb-2">
          {organization.name}
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Book an appointment
        </p>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {BOOKING_STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              <div
                className={`flex items-center justify-center size-8 rounded-full text-xs font-medium ${
                  i === currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : i < currentStepIndex
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < BOOKING_STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    i < currentStepIndex ? "bg-primary/20" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEP_LABELS[state.step]}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: Services */}
            {state.step === "services" && (
              <div>
                {services === undefined ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <ServiceSelector
                      services={services}
                      selectedIds={state.serviceIds}
                      onSelectionChange={setServiceIds}
                    />
                    <div className="mt-6">
                      <Button
                        onClick={() => setStep("staff")}
                        disabled={state.serviceIds.length === 0}
                        className="w-full"
                      >
                        Continue
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Staff */}
            {state.step === "staff" && (
              <div>
                <StaffSelector
                  staffMembers={eligibleStaff}
                  selectedId={state.staffId}
                  onSelect={(id) => {
                    setStaffId(id);
                    setStep("datetime");
                  }}
                />
                <div className="mt-4">
                  <Button variant="outline" onClick={() => setStep("services")}>
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Date & Time */}
            {state.step === "datetime" && organization && (
              <div className="space-y-6">
                <DatePicker selectedDate={state.date} onDateSelect={setDate} />
                {state.date && (
                  <TimeSlotGrid
                    organizationId={organization._id}
                    date={state.date}
                    serviceIds={state.serviceIds}
                    staffId={state.staffId}
                    selectedStartTime={state.slotStartTime}
                    sessionId={state.sessionId}
                    onSlotSelect={(start, end, lockId, lockExpiresAt) => {
                      setSlot(start, end, lockId, lockExpiresAt);
                    }}
                  />
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("staff")}>
                    Back
                  </Button>
                  {state.slotStartTime !== null && (
                    <Button onClick={() => setStep("info")}>Continue</Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Customer Info */}
            {state.step === "info" && (
              <div className="space-y-4">
                {state.lockExpiresAt && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Time slot reserved for:
                    </p>
                    <SlotLockCountdown
                      expiresAt={state.lockExpiresAt}
                      onExpired={() => setStep("datetime")}
                    />
                  </div>
                )}
                <BookingForm
                  initialValues={{
                    name: state.customerName || session.data?.user?.name || "",
                    phone: state.customerPhone,
                    email:
                      state.customerEmail || session.data?.user?.email || "",
                    notes: state.customerNotes,
                  }}
                  onSubmit={(values) => {
                    setCustomerInfo(values);
                    setStep("confirm");
                  }}
                  onBack={() => setStep("datetime")}
                />
              </div>
            )}

            {/* Step 5: Summary & Confirm */}
            {state.step === "confirm" &&
              organization &&
              state.staffId !== null &&
              state.date !== null &&
              state.slotStartTime !== null &&
              state.slotEndTime !== null && (
                <div className="space-y-4">
                  {state.lockExpiresAt && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Time slot reserved for:
                      </p>
                      <SlotLockCountdown
                        expiresAt={state.lockExpiresAt}
                        onExpired={() => setStep("datetime")}
                      />
                    </div>
                  )}
                  <BookingSummary
                    organizationId={organization._id}
                    services={selectedServices}
                    staffName={selectedStaff?.name ?? ""}
                    staffId={state.staffId}
                    date={state.date}
                    startTime={state.slotStartTime}
                    endTime={state.slotEndTime}
                    customer={{
                      name: state.customerName,
                      phone: state.customerPhone,
                      email: state.customerEmail,
                      notes: state.customerNotes,
                    }}
                    sessionId={state.sessionId}
                    onBack={() => setStep("info")}
                    onConfirm={(result) =>
                      setConfirmation({
                        appointmentId: result.appointmentId as string,
                        confirmationCode: result.confirmationCode,
                        details: {
                          date: state.date!,
                          startTime: state.slotStartTime!,
                          endTime: state.slotEndTime!,
                          staffName: selectedStaff?.name ?? "",
                          services: selectedServices.map((s) => ({
                            name: s.name,
                            duration: s.duration,
                            price: s.price,
                          })),
                        },
                      })
                    }
                  />
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
