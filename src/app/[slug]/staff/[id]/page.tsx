"use client";

import { useQuery } from "convex/react";
import { ArrowLeft, Calendar, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { ScheduleEditor, StaffProfileForm } from "@/modules/staff";
import type { StaffSchedule } from "@/modules/staff/components/ScheduleEditor";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusColor(
  status: "active" | "inactive" | "pending",
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "active":
      return "default";
    case "pending":
      return "secondary";
    case "inactive":
      return "destructive";
  }
}

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function StaffDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8" />
        <Skeleton className="h-6 w-32" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="size-20 rounded-full" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StaffDetailPage() {
  const params = useParams();
  const staffId = params.id as Id<"staff">;
  const slug = params.slug as string;

  const { currentStaff, currentRole } = useOrganization();
  const staff = useQuery(api.staff.get, { staffId });
  const [isEditing, setIsEditing] = useState(false);
  const [editSchedule, setEditSchedule] = useState<StaffSchedule | null>(null);

  if (staff === undefined) {
    return <StaffDetailSkeleton />;
  }

  if (staff === null) {
    return (
      <div className="space-y-6">
        <Link
          href={`/${slug}/staff`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Staff
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="mb-4 size-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Staff member not found</h3>
            <p className="text-sm text-muted-foreground">
              This staff profile may have been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit =
    currentStaff?._id === staffId ||
    currentRole === "owner" ||
    currentRole === "admin";

  const schedule = (editSchedule ??
    staff.defaultSchedule ??
    {}) as StaffSchedule;

  const handleEditStart = () => {
    setEditSchedule((staff.defaultSchedule ?? {}) as StaffSchedule);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setEditSchedule(null);
    setIsEditing(false);
  };

  const handleEditSuccess = () => {
    setEditSchedule(null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${slug}/staff`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Staff
      </Link>

      {isEditing ? (
        <>
          {/* Edit Profile Form */}
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update staff member information</CardDescription>
            </CardHeader>
            <CardContent>
              <StaffProfileForm
                staff={{
                  ...staff,
                  defaultSchedule: editSchedule ?? staff.defaultSchedule,
                }}
                onSuccess={handleEditSuccess}
                onCancel={handleEditCancel}
              />
            </CardContent>
          </Card>

          {/* Schedule Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5" />
                Work Schedule
              </CardTitle>
              <CardDescription>
                Set the default weekly working hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScheduleEditor value={schedule} onChange={setEditSchedule} />
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Profile Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="size-20">
                  <AvatarImage src={staff.imageUrl ?? undefined} />
                  <AvatarFallback className="text-xl">
                    {getInitials(staff.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold truncate">
                      {staff.name}
                    </h2>
                    <Badge variant={getStatusColor(staff.status)}>
                      {staff.status}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="size-4" />
                      <span>{staff.email}</span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="size-4" />
                        <span>{staff.phone}</span>
                      </div>
                    )}
                  </div>
                  {staff.bio && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {staff.bio}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Schedule Card (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5" />
                Work Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DAYS.map((day) => {
                  const daySchedule = schedule[day];
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                    >
                      <span className="text-sm font-medium w-28">
                        {DAY_LABELS[day]}
                      </span>
                      {daySchedule?.available ? (
                        <span className="text-sm">
                          {daySchedule.start} - {daySchedule.end}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Unavailable
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Service assignments placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Service Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Service assignments coming in Sprint 2
              </p>
            </CardContent>
          </Card>

          {/* Edit Button */}
          {canEdit && (
            <Button variant="outline" onClick={handleEditStart}>
              Edit Profile
            </Button>
          )}
        </>
      )}
    </div>
  );
}
