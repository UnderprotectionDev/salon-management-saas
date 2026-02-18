"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import {
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  Heart,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import {
  AppointmentStatusBadge,
  DatePicker,
  TimeSlotGrid,
} from "@/modules/booking";
import { formatMinutesAsTime } from "@/modules/booking/lib/constants";
import { OnboardingBanner, OnboardingWizard } from "@/modules/onboarding";
import { InvitationBanner, useOrganizations } from "@/modules/organization";
import { formatPrice } from "@/modules/services/lib/currency";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// =============================================================================
// Helper functions
// =============================================================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "staff":
      return "Staff";
    default:
      return role;
  }
}

const ACTIVE_STATUSES = ["pending", "confirmed", "checked_in", "in_progress"];
const PAST_STATUSES = ["completed", "cancelled", "no_show"];

function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status);
}

function isPastStatus(status: string): boolean {
  return PAST_STATUSES.includes(status);
}

function canModifyAppointment(
  date: string,
  startTime: number,
  status: string,
  cancellationPolicyHours = 2,
): boolean {
  if (!isActiveStatus(status)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const hours = Math.floor(startTime / 60);
  const minutes = startTime % 60;
  const appointmentDate = new Date(year, month - 1, day, hours, minutes);
  const policyBefore =
    appointmentDate.getTime() - cancellationPolicyHours * 60 * 60 * 1000;
  return Date.now() < policyBefore;
}

// =============================================================================
// Skeleton
// =============================================================================

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto p-4 lg:p-6 space-y-6">
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

// =============================================================================
// UserCancelDialog
// =============================================================================

function UserCancelDialog({
  appointmentId,
}: {
  appointmentId: Id<"appointments">;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelByUser = useMutation(api.appointments.cancelByUser);

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      await cancelByUser({
        appointmentId,
        reason: reason.trim() || undefined,
      });
      toast.success("Appointment cancelled successfully");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string })?.message ??
              "An error occurred")
          : "Unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this appointment? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you cancelling?"
              rows={2}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Confirm Cancel"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// UserRescheduleDialog
// =============================================================================

const generateSessionId = () =>
  `reschedule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function UserRescheduleDialog({
  appointmentId,
  organizationId,
  staffId,
  serviceIds,
}: {
  appointmentId: Id<"appointments">;
  organizationId: Id<"organization">;
  staffId: Id<"staff">;
  serviceIds: Id<"services">[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<number | null>(
    null,
  );
  const [selectedEndTime, setSelectedEndTime] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId] = useState(generateSessionId);

  const rescheduleByUser = useMutation(api.appointments.rescheduleByUser);

  const handleSlotSelect = (
    startTime: number,
    endTime: number,
    _lockResult: Id<"slotLocks"> | null,
  ) => {
    setSelectedStartTime(startTime);
    setSelectedEndTime(endTime);
  };

  const handleReschedule = async () => {
    if (
      !selectedDate ||
      selectedStartTime === null ||
      selectedEndTime === null
    ) {
      toast.error("Please select a new date and time");
      return;
    }

    setIsSubmitting(true);
    try {
      await rescheduleByUser({
        appointmentId,
        newDate: selectedDate,
        newStartTime: selectedStartTime,
        newEndTime: selectedEndTime,
        sessionId,
      });
      toast.success("Appointment rescheduled successfully");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string })?.message ??
              "An error occurred")
          : "Unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setSelectedDate(null);
    setSelectedStartTime(null);
    setSelectedEndTime(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Select a new date and time for your appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <DatePicker
            selectedDate={selectedDate}
            onDateSelect={(d) => {
              setSelectedDate(d);
              setSelectedStartTime(null);
              setSelectedEndTime(null);
            }}
          />
          {selectedDate && (
            <TimeSlotGrid
              organizationId={organizationId}
              date={selectedDate}
              serviceIds={serviceIds}
              staffId={staffId}
              selectedStartTime={selectedStartTime}
              sessionId={sessionId}
              onSlotSelect={handleSlotSelect}
            />
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {selectedStartTime !== null && (
              <Button onClick={handleReschedule} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Confirm Reschedule"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// BookAgainButton
// =============================================================================

function BookAgainButton({
  organizationSlug,
  serviceIds,
  staffId,
}: {
  organizationSlug: string;
  serviceIds: Id<"services">[];
  staffId: Id<"staff"> | null;
}) {
  const params = new URLSearchParams();
  if (serviceIds.length > 0) {
    params.set("services", serviceIds.join(","));
  }
  if (staffId) {
    params.set("staff", staffId);
  }

  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/${organizationSlug}/book?${params.toString()}`}>
        <RotateCcw className="size-3.5 mr-1.5" />
        Book Again
      </Link>
    </Button>
  );
}

// =============================================================================
// AppointmentCard (enriched with actions)
// =============================================================================

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
  cancellationPolicyHours: number;
};

function AppointmentCard({ appointment }: { appointment: UserAppointment }) {
  const isActive = canModifyAppointment(
    appointment.date,
    appointment.startTime,
    appointment.status,
    appointment.cancellationPolicyHours,
  );
  const isPast = isPastStatus(appointment.status);

  // Fetch full details (with IDs) only if the appointment is actionable
  const detail = useQuery(
    api.appointments.getForUser,
    isActive || (isPast && appointment.status === "completed")
      ? { appointmentId: appointment._id as Id<"appointments"> }
      : "skip",
  );

  const formattedDate = new Date(
    `${appointment.date}T00:00:00`,
  ).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header: org name + status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm">
              {appointment.organizationName}
            </span>
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>
              {formatMinutesAsTime(appointment.startTime)} -{" "}
              {formatMinutesAsTime(appointment.endTime)}
            </span>
          </div>
        </div>

        {/* Staff */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <User className="size-3.5" />
          <span>{appointment.staffName}</span>
        </div>

        {/* Services */}
        <div className="space-y-1 mb-3">
          {appointment.services.map((s, i) => (
            <div
              key={`${s.serviceName}-${i}`}
              className="flex justify-between text-sm"
            >
              <span>
                {s.serviceName}{" "}
                <span className="text-muted-foreground">({s.duration}min)</span>
              </span>
              <span className="text-muted-foreground">
                {formatPrice(s.price)}
              </span>
            </div>
          ))}
        </div>

        {/* Total + Confirmation Code */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="text-xs text-muted-foreground">
            Code:{" "}
            <span className="font-mono">{appointment.confirmationCode}</span>
          </div>
          <div className="font-medium text-sm">
            {formatPrice(appointment.total)}
          </div>
        </div>

        {/* Actions */}
        {(isActive || (isPast && appointment.status === "completed")) &&
          detail && (
            <div className="flex gap-2 mt-3 pt-3 border-t">
              {isActive && (
                <>
                  {detail.staffId && (
                    <UserRescheduleDialog
                      appointmentId={appointment._id as Id<"appointments">}
                      organizationId={detail.organizationId}
                      staffId={detail.staffId}
                      serviceIds={detail.services.map((s) => s.serviceId)}
                    />
                  )}
                  <UserCancelDialog
                    appointmentId={appointment._id as Id<"appointments">}
                  />
                </>
              )}
              {isPast && appointment.status === "completed" && (
                <BookAgainButton
                  organizationSlug={appointment.organizationSlug}
                  serviceIds={detail.services.map((s) => s.serviceId)}
                  staffId={detail.staffId}
                />
              )}
            </div>
          )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MyAppointmentsList
// =============================================================================

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
    <div className="grid gap-4 sm:grid-cols-2">
      {filtered.map((appt) => (
        <AppointmentCard key={appt._id} appointment={appt} />
      ))}
    </div>
  );
}

// =============================================================================
// ProfileCard
// =============================================================================

type CustomerProfile = {
  _id: Id<"customers">;
  name: string;
  phone: string;
  email?: string;
  organizationId: Id<"organization">;
  organizationName: string;
  organizationSlug: string;
  totalVisits: number;
  totalSpent: number;
  createdAt: number;
};

function ProfileCard({ profile }: { profile: CustomerProfile }) {
  const updateMyProfile = useMutation(api.customers.updateMyProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateMyProfile({
        customerId: profile._id,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error: unknown) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string })?.message ??
              "An error occurred")
          : "Unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setName(profile.name);
    setPhone(profile.phone);
    setEmail(profile.email ?? "");
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">
              {profile.organizationName}
            </CardTitle>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
        <CardDescription>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="secondary">
              {profile.totalVisits} visit{profile.totalVisits !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="secondary">
              {formatPrice(profile.totalSpent)} spent
            </Badge>
            <span className="text-xs">
              Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : null}
                Save
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{profile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{profile.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{profile.email || "Not set"}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// ProfilesSection
// =============================================================================

function ProfilesSection() {
  const profiles = useQuery(api.customers.getMyProfiles);

  if (profiles === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (profiles.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Salon Profiles</CardTitle>
        <CardDescription>
          Manage your customer profiles across salons
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profiles.map((profile) => (
          <ProfileCard key={profile._id} profile={profile} />
        ))}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// FavoriteSalonsSection
// =============================================================================

function FavoriteSalonsSection() {
  const favorites = useQuery(api.favoriteSalons.list);
  const toggleFavorite = useMutation(api.favoriteSalons.toggle);

  if (favorites === undefined) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (favorites.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Favorite Salons</CardTitle>
          <CardDescription>Salons you&apos;ve saved</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty className="border rounded-lg">
            <EmptyMedia variant="icon">
              <Heart className="size-5" />
            </EmptyMedia>
            <EmptyTitle>No favorite salons yet</EmptyTitle>
            <EmptyDescription>
              Save salons to favorites for quick access when booking.
            </EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  const handleRemove = async (organizationId: Id<"organization">) => {
    try {
      await toggleFavorite({ organizationId });
      toast.success("Removed from favorites");
    } catch (error: unknown) {
      toast.error(
        error instanceof ConvexError
          ? ((error.data as { message?: string })?.message ??
              "An error occurred")
          : "Unexpected error occurred",
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Favorite Salons</CardTitle>
        <CardDescription>
          {favorites.length} salon{favorites.length > 1 ? "s" : ""} saved
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {favorites.map((fav) => (
          <div
            key={fav._id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <Link
              href={`/${fav.organizationSlug}/book`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <Avatar className="size-10">
                {fav.organizationLogo && (
                  <AvatarImage src={fav.organizationLogo} />
                )}
                <AvatarFallback>
                  <Store className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{fav.organizationName}</p>
                <p className="text-xs text-muted-foreground">Tap to book</p>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(fav.organizationId)}
              aria-label={`Remove ${fav.organizationName} from favorites`}
            >
              <Heart className="size-4 fill-current text-red-500" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Dashboard Page
// =============================================================================

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const organizations = useOrganizations();
  const myAppointments = useQuery(
    api.appointments.listForCurrentUser,
    user ? {} : "skip",
  );
  const isSuperAdmin = useQuery(
    api.admin.checkIsSuperAdmin,
    user ? {} : "skip",
  );
  const userProfile = useQuery(api.userProfile.get, user ? {} : "skip");
  const acceptConsent = useMutation(api.userProfile.acceptConsent);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Auto-create user profile with KVKK consent on first login
  // (user accepted by signing in — consent text shown on sign-in page)
  useEffect(() => {
    if (userProfile === null && user) {
      acceptConsent({}).catch(() => {
        // Silent fail — will retry on next render
      });
    }
  }, [userProfile, user, acceptConsent]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Dispatch event BEFORE sign out to skip queries immediately
      window.dispatchEvent(new Event("auth:signing-out"));

      // Small delay to allow React to process the state update
      await new Promise((resolve) => setTimeout(resolve, 50));

      await authClient.signOut();

      // Notify that sign out is complete
      window.dispatchEvent(new Event("auth:signed-out"));

      toast.success("Signed out successfully");
      router.push("/sign-in");
    } catch (_error) {
      toast.error("Failed to sign out");
      window.dispatchEvent(new Event("auth:signed-out"));
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    if (user === null) {
      router.replace("/sign-in");
    }
  }, [user, router]);

  if (user === undefined || organizations === undefined) {
    return <DashboardSkeleton />;
  }

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
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Button variant="destructive" size="sm" asChild>
                  <Link href="/admin">
                    <Shield className="mr-2 size-4" />
                    Admin Panel
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/stats">
                  <BarChart3 className="mr-2 size-4" />
                  My Stats
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/settings">
                  <Settings className="mr-2 size-4" />
                  Edit Profile
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 size-4" />
                )}
                Sign Out
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Onboarding Wizard */}
        {userProfile && (
          <OnboardingWizard
            open={showWizard}
            onOpenChange={setShowWizard}
            initialProfile={userProfile}
          />
        )}

        {/* Onboarding Banner */}
        {userProfile && (
          <OnboardingBanner
            profile={userProfile}
            onStartWizard={() => setShowWizard(true)}
          />
        )}

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
                  <TabsList aria-label="Appointment tabs">
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="upcoming"
                    className="mt-4"
                    aria-live="polite"
                  >
                    <MyAppointmentsList
                      appointments={myAppointments}
                      filter="upcoming"
                    />
                  </TabsContent>
                  <TabsContent value="past" className="mt-4" aria-live="polite">
                    <MyAppointmentsList
                      appointments={myAppointments}
                      filter="past"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* My Salon Profiles */}
            <ProfilesSection />

            {/* My Favorite Salons - feature implemented below */}
            <FavoriteSalonsSection />
          </div>

          {/* Right Column - Quick Links */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/dashboard/stats">
                    <BarChart3 className="mr-2 size-4" />
                    View My Stats
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/dashboard/ai">
                    <Sparkles className="mr-2 size-4" />
                    AI Features
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* My Salons (For salon owners/staff) */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>My Salon</CardTitle>
              <CardDescription>Salon you own or work at</CardDescription>
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
