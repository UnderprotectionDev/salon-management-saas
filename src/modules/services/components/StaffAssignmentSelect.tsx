"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type StaffAssignmentSelectProps = {
  organizationId: Id<"organization">;
  serviceId: Id<"services">;
};

export function StaffAssignmentSelect({
  organizationId,
  serviceId,
}: StaffAssignmentSelectProps) {
  const allStaff = useQuery(api.staff.list, { organizationId });
  const assignStaff = useMutation(api.services.assignStaff);

  if (allStaff === undefined) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const activeStaff = allStaff.filter((s) => s.status === "active");

  if (activeStaff.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No active staff members
      </p>
    );
  }

  const handleToggle = async (staffId: Id<"staff">, isAssigned: boolean) => {
    try {
      await assignStaff({
        organizationId,
        serviceId,
        staffId,
        assign: !isAssigned,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update assignment";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-1">
      {activeStaff.map((staff) => {
        const isAssigned = staff.serviceIds?.includes(serviceId) ?? false;
        return (
          <label
            key={staff._id}
            className="flex items-center gap-3 rounded-md p-2 hover:bg-accent cursor-pointer"
          >
            <Checkbox
              checked={isAssigned}
              onCheckedChange={() => handleToggle(staff._id, isAssigned)}
            />
            <Avatar className="size-7">
              <AvatarImage src={staff.imageUrl ?? undefined} />
              <AvatarFallback className="text-xs">
                {staff.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{staff.name}</span>
          </label>
        );
      })}
    </div>
  );
}
