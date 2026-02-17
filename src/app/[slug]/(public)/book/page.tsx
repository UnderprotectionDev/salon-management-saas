"use client";

import { useQuery } from "convex/react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import {
  BookingConfirmation,
  BookingPageHeader,
  ConfirmBookingDialog,
  SalonSidebar,
  ServiceSelector,
  StaffSelector,
  StickyBottomBar,
  TimeSlotGrid,
  useBookingFlow,
  WeeklyDatePicker,
} from "@/modules/booking";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const session = authClient.useSession();

  // User profile for pre-filling customer info
  const userProfile = useQuery(
    api.userProfile.get,
    session.data?.user ? {} : "skip",
  );

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
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

  // Booking flow state
  const {
    state,
    setServiceIds,
    setStaffId,
    setDate,
    setSlot,
    reset,
    canConfirm,
    hasServices,
  } = useBookingFlow();

  // Get organization by slug
  const organization = useQuery(api.organizations.getBySlug, { slug });

  // Get organization settings (public — address, phone, email, businessHours)
  const settings = useQuery(
    api.organizations.getPublicSettings,
    organization ? { organizationId: organization._id } : "skip",
  );

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

  // Pre-fill from URL params (Book Again flow)
  const prefillServiceIds = (() => {
    const servicesParam = searchParams.get("services");
    if (!servicesParam || !services) return undefined;
    const ids = servicesParam.split(",").filter(Boolean);
    const validIds = ids.filter((id) =>
      services.some((s) => s._id === id),
    ) as Id<"services">[];
    return validIds.length > 0 ? validIds : undefined;
  })();

  const prefillStaffId = (() => {
    const staffParam = searchParams.get("staff");
    if (!staffParam || !staffMembers) return undefined;
    return staffMembers.some((s) => s._id === staffParam)
      ? (staffParam as Id<"staff">)
      : undefined;
  })();

  // Apply prefill once when services/staff data loads
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (prefillApplied.current) return;
    if (!services || !staffMembers) return;

    if (prefillServiceIds && state.serviceIds.length === 0) {
      setServiceIds(prefillServiceIds);
      if (prefillStaffId) {
        setStaffId(prefillStaffId);
      }
      prefillApplied.current = true;
    }
  }, [
    services,
    staffMembers,
    prefillServiceIds,
    prefillStaffId,
    state.serviceIds.length,
    setServiceIds,
    setStaffId,
  ]);

  // --- Derived data ---

  // Filter staff to those who can do ALL selected services
  const eligibleStaff = (staffMembers ?? []).filter((staff) => {
    if (state.serviceIds.length === 0) return true;
    return state.serviceIds.every((sid) => staff.serviceIds?.includes(sid));
  });

  // Get selected service objects
  const selectedServices = (services ?? []).filter((s) =>
    state.serviceIds.includes(s._id),
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Resolve staff name for the confirm dialog
  const resolvedStaffName = (() => {
    // staffId might be set by slot selection (resolved from "any available")
    const sid = state.staffId;
    if (!sid) return "";
    return staffMembers?.find((s) => s._id === sid)?.name ?? "";
  })();

  // --- Loading / error states ---

  if (organization === undefined) {
    return (
      <div className="space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[60vh] w-full" />
      </div>
    );
  }

  if (organization === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Salon Not Found</h1>
          <p className="text-muted-foreground mt-2">
            The salon you are looking for could not be found.
          </p>
        </div>
      </div>
    );
  }

  // --- Confirmation screen ---

  if (confirmation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <BookingConfirmation
          confirmationCode={confirmation.confirmationCode}
          slug={slug}
          details={confirmation.details}
          organizationName={organization.name}
          onNewBooking={() => {
            setConfirmation(null);
            reset();
          }}
        />
      </div>
    );
  }

  // --- Loading services/staff ---

  if (services === undefined || staffMembers === undefined) {
    return (
      <div className="space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header: salon name + date + location + open/closed */}
      <BookingPageHeader
        salonName={organization.name}
        address={settings?.address}
        businessHours={settings?.businessHours}
        organizationId={organization._id}
      />

      {/* 2-column layout */}
      <div className="flex min-h-[calc(100vh-65px-64px)]">
        {/* Left sidebar — hidden on mobile */}
        <SalonSidebar
          logo={organization.logo}
          address={settings?.address}
          phone={settings?.phone}
          email={settings?.email}
        />

        {/* Main content */}
        <main className="flex-1 px-4 lg:px-8 py-8 pb-24">
          {/* STEP 01 — SERVICES */}
          <section className="mb-10">
            <StepHeader number="01" title="Select Services" />
            <ServiceSelector
              services={services}
              selectedIds={state.serviceIds}
              onSelectionChange={(ids) => {
                const eligible = (staffMembers ?? [])
                  .filter((staff) =>
                    ids.every((sid) => staff.serviceIds?.includes(sid)),
                  )
                  .map((s) => s._id);
                setServiceIds(ids, eligible);
              }}
            />
          </section>

          {/* STEP 02 — STAFF */}
          <section className="mb-10">
            <StepHeader number="02" title="Choose Staff" />
            <StaffSelector
              staffMembers={eligibleStaff}
              selectedId={state.staffId}
              onSelect={setStaffId}
              showAnyOption={eligibleStaff.length > 1}
              disabled={!hasServices}
            />
          </section>

          {/* STEP 03 — DATE & TIME */}
          <section className="mb-10">
            <StepHeader number="03" title="Date & Time" />
            <div className="space-y-6">
              <WeeklyDatePicker
                selectedDate={state.date}
                onDateSelect={setDate}
                organizationId={organization._id}
                serviceIds={state.serviceIds}
                staffId={state.staffId}
                disabled={!hasServices}
              />
              {state.date && (
                <TimeSlotGrid
                  organizationId={organization._id}
                  date={state.date}
                  serviceIds={state.serviceIds}
                  staffId={state.staffId}
                  selectedStartTime={state.slotStartTime}
                  sessionId={state.sessionId}
                  onSlotSelect={setSlot}
                />
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Sticky bottom bar */}
      <StickyBottomBar
        selectedServiceNames={selectedServices.map((s) => s.name)}
        totalPrice={totalPrice}
        selectedDate={state.date}
        canConfirm={canConfirm}
        onConfirmClick={() => setConfirmDialogOpen(true)}
      />

      {/* Confirmation dialog */}
      {canConfirm &&
        state.date &&
        state.slotStartTime !== null &&
        state.slotEndTime !== null && (
          <ConfirmBookingDialog
            key={`${state.date}-${state.slotStartTime}-${state.staffId}`}
            open={confirmDialogOpen}
            onOpenChange={setConfirmDialogOpen}
            organizationId={organization._id}
            services={selectedServices.map((s) => ({
              _id: s._id,
              name: s.name,
              duration: s.duration,
              price: s.price,
            }))}
            staffId={state.staffId as Id<"staff">}
            staffName={resolvedStaffName}
            date={state.date}
            startTime={state.slotStartTime}
            endTime={state.slotEndTime}
            sessionId={state.sessionId}
            initialCustomer={{
              name: session.data?.user?.name ?? "",
              phone: userProfile?.phone ?? "",
              email: session.data?.user?.email ?? "",
            }}
            onConfirm={(result: {
              appointmentId: string;
              confirmationCode: string;
              details: {
                date: string;
                startTime: number;
                endTime: number;
                staffName: string;
                services: Array<{
                  name: string;
                  duration: number;
                  price: number;
                }>;
              };
            }) => {
              setConfirmDialogOpen(false);
              setConfirmation({
                appointmentId: result.appointmentId,
                confirmationCode: result.confirmationCode,
                details: result.details,
              });
            }}
          />
        )}
    </>
  );
}

// --- Step header sub-component ---

function StepHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4 border-b pb-3">
      <span className="text-2xl font-bold tabular-nums text-muted-foreground">
        {number}
      </span>
      <span className="text-[10px] text-muted-foreground">/</span>
      <h2 className="text-sm font-semibold uppercase tracking-widest">
        {title}
      </h2>
    </div>
  );
}
