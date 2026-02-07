"use client";

import { useQuery } from "convex/react";
import { Bell, Building2, Calendar, Heart, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppointmentStatusBadge } from "@/modules/booking";
import { formatMinutesAsTime } from "@/modules/booking/lib/constants";
import { InvitationBanner, useOrganizations } from "@/modules/organization";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../convex/_generated/api";

// Time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Role label
function getRoleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "member":
      return "Staff";
    default:
      return role;
  }
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        {/* Header Skeleton */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-9 w-28" />
          </CardHeader>
        </Card>

        {/* Grid Skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-48 mb-4" />
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

type UserAppointment = {
  _id: string;
  date: string;
  startTime: number;
  endTime: number;
  status: string;
  confirmationCode: string;
  staffName: string;
  total: number;
  organizationName: string;
  organizationSlug: string;
  organizationLogo?: string;
  services: Array<{ serviceName: string; duration: number; price: number }>;
};

function MyAppointmentsList({
  appointments,
  filter,
}: {
  appointments: UserAppointment[] | undefined;
  filter: "upcoming" | "past";
}) {
  if (appointments === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const terminalStatuses = ["completed", "cancelled", "no_show"];

  const filtered = appointments.filter((a) => {
    if (filter === "upcoming") {
      return a.date >= today && !terminalStatuses.includes(a.status);
    }
    return a.date < today || terminalStatuses.includes(a.status);
  });

  if (filtered.length === 0) {
    return (
      <Empty className="border rounded-lg">
        <EmptyMedia variant="icon">
          <Calendar className="size-5" />
        </EmptyMedia>
        <EmptyTitle>
          {filter === "upcoming"
            ? "No upcoming appointments"
            : "No past appointments"}
        </EmptyTitle>
        <EmptyDescription>
          {filter === "upcoming"
            ? "Appointments you book will appear here."
            : "Your completed appointments will be listed here."}
        </EmptyDescription>
        {filter === "upcoming" && (
          <Button asChild className="mt-2">
            <Link href="/">Find Salon</Link>
          </Button>
        )}
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((appt) => (
        <Link
          key={appt._id}
          href={`/${appt.organizationSlug}/appointment/${appt.confirmationCode}`}
          className="block"
        >
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 rounded-full bg-muted p-2">
                    <Calendar className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {appt.organizationName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appt.date} &middot; {formatMinutesAsTime(appt.startTime)}{" "}
                      – {formatMinutesAsTime(appt.endTime)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appt.staffName} &middot;{" "}
                      {appt.services.map((s) => s.serviceName).join(", ")}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <AppointmentStatusBadge status={appt.status} />
                  <span className="text-sm font-medium">
                    {formatPrice(appt.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  const organizations = useOrganizations();
  const myAppointments = useQuery(api.appointments.listForCurrentUser);

  // Handle redirects in useEffect to avoid side effects during render
  useEffect(() => {
    if (user === null) {
      router.replace("/sign-in");
    }
  }, [user, router]);

  // Loading state
  if (user === undefined || organizations === undefined) {
    return <DashboardSkeleton />;
  }

  // Not authenticated - show skeleton while redirecting
  if (user === null) {
    return <DashboardSkeleton />;
  }

  const greeting = getGreeting();
  const userInitial =
    user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
        {/* Welcome Header + Profile Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="size-12">
              <AvatarImage
                src={user.image ?? undefined}
                alt={user.name ?? "User"}
              />
              <AvatarFallback className="text-lg">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <CardTitle className="text-xl">
                {greeting}, {user.name || "User"}!
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                {user.email}
                {user.emailVerified && (
                  <Badge variant="secondary" className="text-xs">
                    Verified
                  </Badge>
                )}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">
                <Settings className="mr-2 size-4" />
                Edit Profile
              </Link>
            </Button>
          </CardHeader>
        </Card>

        {/* Pending Invitations */}
        <InvitationBanner />

        {/* Ana Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* My Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>My Appointments</CardTitle>
                <CardDescription>
                  Your upcoming and past appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upcoming">
                  <TabsList>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upcoming" className="mt-4">
                    <MyAppointmentsList
                      appointments={myAppointments}
                      filter="upcoming"
                    />
                  </TabsContent>
                  <TabsContent value="past" className="mt-4">
                    <MyAppointmentsList
                      appointments={myAppointments}
                      filter="past"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* My Favorite Salons */}
            <Card>
              <CardHeader>
                <CardTitle>My Favorite Salons</CardTitle>
                <CardDescription>Salons you've saved</CardDescription>
              </CardHeader>
              <CardContent>
                <Empty className="border rounded-lg">
                  <EmptyMedia variant="icon">
                    <Heart className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>No favorite salons yet</EmptyTitle>
                  <EmptyDescription>
                    Save salons to favorites for quick access.
                  </EmptyDescription>
                </Empty>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notifications */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Recent activity</CardDescription>
              </CardHeader>
              <CardContent>
                <Empty className="border rounded-lg">
                  <EmptyMedia variant="icon">
                    <Bell className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>No notifications</EmptyTitle>
                  <EmptyDescription>
                    New notifications will appear here.
                  </EmptyDescription>
                </Empty>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* My Salons (For salon owners/staff) */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>My Salons</CardTitle>
                <CardDescription>Salons you own or work at</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/onboarding">
                  <Plus className="mr-2 size-4" />
                  New Salon
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {organizations.length === 0 ? (
              <Empty className="border rounded-lg">
                <EmptyMedia variant="icon">
                  <Building2 className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No salons yet</EmptyTitle>
                <EmptyDescription>
                  Create your first salon to get started.
                </EmptyDescription>
                <Button asChild className="mt-2">
                  <Link href="/onboarding">
                    <Plus className="mr-2 size-4" />
                    Create Your First Salon
                  </Link>
                </Button>
              </Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {organizations.map((org) => (
                  <Link key={org._id} href={`/${org.slug}/dashboard`}>
                    <Card className="hover:border-primary transition-colors cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10">
                            {org.logo ? (
                              <AvatarImage src={org.logo} alt={org.name} />
                            ) : (
                              <AvatarFallback>
                                <Building2 className="size-4" />
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">
                              {org.name}
                            </CardTitle>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {getRoleLabel(org.role)}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
