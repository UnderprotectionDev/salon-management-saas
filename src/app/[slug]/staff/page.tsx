"use client";

import { useQuery } from "convex/react";
import { Mail, Phone, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/modules/organization";
import { AddStaffDialog } from "@/modules/staff";
import { api } from "../../../../convex/_generated/api";

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
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "pending":
      return "secondary";
    case "inactive":
      return "destructive";
    default:
      return "outline";
  }
}

export default function StaffPage() {
  const { activeOrganization } = useOrganization();

  const staffList = useQuery(
    api.staff.list,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  if (!activeOrganization) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-muted-foreground">
            Manage your salon team members
          </p>
        </div>
        <AddStaffDialog organizationId={activeOrganization._id} />
      </div>

      {staffList === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Users className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">No staff members yet</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Add your first team member to get started
            </p>
            <AddStaffDialog organizationId={activeOrganization._id} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staffList.map((staff) => (
            <Card key={staff._id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="size-12">
                    <AvatarImage src={staff.imageUrl ?? undefined} />
                    <AvatarFallback>{getInitials(staff.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{staff.name}</h3>
                      <Badge variant={getStatusColor(staff.status)}>
                        {staff.status}
                      </Badge>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="size-3.5" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                      {staff.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="size-3.5" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
