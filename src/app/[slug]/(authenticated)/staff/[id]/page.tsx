"use client";

import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarClock,
  Mail,
  Package,
  Phone,
  Plus,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/modules/organization";
import {
  OvertimeManager,
  ScheduleEditor,
  ScheduleOverrideDialog,
  ScheduleOverrideList,
  StaffProfileForm,
  TimeOffApprovalPanel,
  TimeOffRequestForm,
  TimeOffRequestList,
} from "@/modules/staff";
import type { StaffSchedule } from "@/modules/staff/components/ScheduleEditor";
import { DAY_LABELS, DAYS } from "@/modules/staff/lib/constants";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function getInitials(name: string): string {
  if (!name.trim()) return "??";
  return name
    .split(" ")
    .filter(Boolean)
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

function StaffServiceList({
  organizationId,
  serviceIds,
}: {
  organizationId: Id<"organization">;
  serviceIds: Id<"services">[];
}) {
  const allServices = useQuery(api.services.list, { organizationId });

  if (serviceIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No services assigned yet</p>
    );
  }

  if (allServices === undefined) {
    return (
      <div className="flex flex-wrap gap-2">
        {serviceIds.map((id) => (
          <Skeleton key={id} className="h-6 w-24" />
        ))}
      </div>
    );
  }

  const serviceMap = new Map(allServices.map((s) => [s._id, s]));

  return (
    <div className="flex flex-wrap gap-2">
      {serviceIds.map((id) => {
        const service = serviceMap.get(id);
        if (!service) return null;
        return (
          <Badge key={id} variant="secondary">
            {service.name}
          </Badge>
        );
      })}
    </div>
  );
}

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
      <Skeleton className="h-10 w-full" />
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

  const { activeOrganization, currentStaff, currentRole } = useOrganization();
  const staff = useQuery(
    api.staff.get,
    activeOrganization
      ? { staffId, organizationId: activeOrganization._id }
      : "skip",
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editSchedule, setEditSchedule] = useState<StaffSchedule | null>(null);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);

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

  const canEdit = currentStaff?._id === staffId || currentRole === "owner";

  const isAdmin = currentRole === "owner";
  const isSelf = currentStaff?._id === staffId;

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

      {/* Profile Card (always visible) */}
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
                <h2 className="text-xl font-semibold truncate">{staff.name}</h2>
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

      {/* Warnings for incomplete configuration */}
      {staff.status === "active" && (
        <>
          {!staff.defaultSchedule && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Schedule Not Configured</AlertTitle>
              <AlertDescription>
                This staff member cannot be booked until a default schedule is
                set. Go to the "Overview" tab and click "Edit Profile" to
                configure their working hours.
              </AlertDescription>
            </Alert>
          )}
          {(!staff.serviceIds || staff.serviceIds.length === 0) && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>No Services Assigned</AlertTitle>
              <AlertDescription>
                This staff member cannot be booked until services are assigned.
                Go to the "Overview" tab and click "Edit Profile" to assign
                services.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="overrides">Schedule Overrides</TabsTrigger>
          <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isEditing ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Edit Profile</CardTitle>
                  <CardDescription>
                    Update staff member information
                  </CardDescription>
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

              {/* Service assignments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="size-5" />
                    Service Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StaffServiceList
                    organizationId={activeOrganization!._id}
                    serviceIds={staff.serviceIds ?? []}
                  />
                </CardContent>
              </Card>

              {canEdit && (
                <Button variant="outline" onClick={handleEditStart}>
                  Edit Profile
                </Button>
              )}
            </>
          )}
        </TabsContent>

        {/* Schedule Overrides Tab */}
        <TabsContent value="overrides" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={() => setShowOverrideDialog(true)}>
                <Plus className="mr-2 size-4" />
                Add Override
              </Button>
            </div>
          )}
          <ScheduleOverrideList staffId={staffId} canEdit={canEdit} />
          <ScheduleOverrideDialog
            staffId={staffId}
            open={showOverrideDialog}
            onOpenChange={setShowOverrideDialog}
          />
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="timeoff" className="space-y-6">
          {/* Admin approval panel */}
          {isAdmin && <TimeOffApprovalPanel />}

          {/* Self: request form + list */}
          {isSelf && (
            <>
              <TimeOffRequestForm />
              <TimeOffRequestList />
            </>
          )}

          {/* Admin viewing someone else: show that user's list only */}
          {isAdmin && !isSelf && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="size-5" />
                  Time Off
                </CardTitle>
                <CardDescription>
                  Manage time-off requests from the approval panel above.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Not admin, not self */}
          {!isAdmin && !isSelf && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CalendarClock className="mb-3 size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Time-off information is not available for this staff member.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Overtime Tab */}
        <TabsContent value="overtime" className="space-y-4">
          <OvertimeManager staffId={staffId} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
