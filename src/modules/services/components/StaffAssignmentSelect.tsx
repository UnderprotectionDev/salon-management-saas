"use client";

import { useMutation, useQuery } from "convex/react";
import NiceAvatar, { genConfig } from "react-nice-avatar";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { StaffAssignmentSkeleton } from "./skeletons/StaffAssignmentSkeleton";

type StaffAssignmentSelectProps = {
  organizationId: Id<"organization">;
  serviceId: Id<"services">;
};

export function StaffAssignmentSelect({
  organizationId,
  serviceId,
}: StaffAssignmentSelectProps) {
  const allStaff = useQuery(api.staff.list, { organizationId });
  const avatarConfigs = useQuery(api.staff.getAvatarConfigs, {
    organizationId,
  });
  const assignStaff = useMutation(api.services.assignStaff);

  const avatarConfigMap = new Map(
    avatarConfigs?.map((a) => [a.staffId, a.avatarConfig]) ?? [],
  );

  if (allStaff === undefined) {
    return <StaffAssignmentSkeleton />;
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
        const config = avatarConfigMap.get(staff._id);
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
              <AvatarFallback>
                <NiceAvatar
                  style={{ width: "100%", height: "100%" }}
                  shape="circle"
                  {...(config ?? genConfig(staff._id))}
                />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{staff.name}</span>
          </label>
        );
      })}
    </div>
  );
}
