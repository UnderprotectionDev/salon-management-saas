"use client";

import { useQuery } from "convex/react";
import { Building2, Calendar, Clock, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AppointmentStatusBadge,
  PublicCancelDialog,
  PublicRescheduleDialog,
} from "@/modules/booking";
import { formatMinutesAsTime } from "@/modules/booking/lib/constants";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../../../../convex/_generated/api";

export default function AppointmentStatusPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const code = (params.code as string).toUpperCase();

  const organization = useQuery(api.organizations.getBySlug, { slug });

  const appointment = useQuery(
    api.appointments.getByConfirmationCode,
    organization
      ? { organizationId: organization._id, confirmationCode: code }
      : "skip",
  );

  // Loading
  if (
    organization === undefined ||
    (organization !== null && appointment === undefined)
  ) {
    return (
      <div className="min-h-screen bg-background">
        <Header slug={slug} />
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md">
            <Skeleton className="h-8 w-48 mx-auto mb-6" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Org not found
  if (organization === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-medium">Salon not found</h2>
          <p className="text-muted-foreground mt-1">
            The salon you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  // Appointment still loading
  if (appointment === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          slug={slug}
          orgName={organization.name}
          logo={organization.logo}
        />
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md">
            <Skeleton className="h-8 w-48 mx-auto mb-6" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Appointment not found
  if (appointment === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header
          slug={slug}
          orgName={organization.name}
          logo={organization.logo}
        />
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md text-center py-12">
            <h2 className="text-xl font-semibold mb-2">
              Appointment Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              No appointment found with code{" "}
              <span className="font-mono font-bold">{code}</span>. Please check
              your confirmation code and try again.
            </p>
            <Link
              href={`/${slug}/book`}
              className="text-primary hover:underline"
            >
              Book a new appointment
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        slug={slug}
        orgName={organization.name}
        logo={organization.logo}
      />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-md">
          <h2 className="text-xl font-semibold text-center mb-6">
            Appointment Details
          </h2>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  <span className="font-mono tracking-wider">{code}</span>
                </CardTitle>
                <AppointmentStatusBadge status={appointment.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <Calendar className="size-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium">{appointment.date}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatMinutesAsTime(appointment.startTime)} –{" "}
                    {formatMinutesAsTime(appointment.endTime)}
                  </div>
                </div>
              </div>

              {/* Staff */}
              <div className="flex items-center gap-3">
                <User className="size-4 text-muted-foreground" />
                <div className="font-medium">{appointment.staffName}</div>
              </div>

              <Separator />

              {/* Services */}
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  Services
                </div>
                <ul className="space-y-2">
                  {appointment.services.map((service, index) => (
                    <li
                      key={`${service.serviceName}-${index}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {service.serviceName}
                        <span className="text-muted-foreground ml-1">
                          ({service.duration} min)
                        </span>
                      </span>
                      <span className="font-medium">
                        {formatPrice(service.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between font-medium">
                <span>Total</span>
                <span>{formatPrice(appointment.total)}</span>
              </div>

              {/* Customer Notes */}
              {appointment.customerNotes && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Your Notes
                    </div>
                    <p className="text-sm">{appointment.customerNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Cancel / Reschedule Actions */}
          {(appointment.status === "pending" ||
            appointment.status === "confirmed") &&
            (() => {
              // Client-side 2-hour window check for visibility
              const apptMs =
                new Date(`${appointment.date}T00:00:00Z`).getTime() +
                appointment.startTime * 60 * 1000;
              const canModify = Date.now() < apptMs - 2 * 60 * 60 * 1000;

              if (!canModify) return null;

              return (
                <div className="flex items-center justify-center gap-3 mt-4">
                  <PublicRescheduleDialog
                    organizationId={organization._id}
                    confirmationCode={code}
                    staffId={appointment.staffId}
                    serviceIds={appointment.services.map((s) => s.serviceId)}
                    customerPhone={appointment.customerPhone}
                  />
                  <PublicCancelDialog
                    organizationId={organization._id}
                    confirmationCode={code}
                    appointmentDate={appointment.date}
                    appointmentStartTime={appointment.startTime}
                  />
                </div>
              );
            })()}

          <div className="text-center mt-6">
            <Link
              href={`/${slug}/book`}
              className="text-sm text-primary hover:underline"
            >
              Book another appointment
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Header({
  slug,
  orgName,
  logo,
}: {
  slug: string;
  orgName?: string;
  logo?: string;
}) {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <Link
          href={`/${slug}/book`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Avatar className="size-10 border">
            {logo ? (
              <AvatarImage src={logo} alt={orgName ?? "Organization logo"} />
            ) : (
              <AvatarFallback>
                <Building2 className="size-5" />
              </AvatarFallback>
            )}
          </Avatar>
          {orgName && (
            <div>
              <h1 className="font-semibold text-lg">{orgName}</h1>
              <p className="text-xs text-muted-foreground">
                Appointment Status
              </p>
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
      <p>
        Powered by{" "}
        <Link href="/" className="text-primary hover:underline">
          Salon Management
        </Link>
      </p>
    </footer>
  );
}
