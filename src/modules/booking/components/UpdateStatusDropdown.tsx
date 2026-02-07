"use client";

import { useMutation } from "convex/react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const TRANSITIONS: Record<string, { label: string; value: string }[]> = {
  pending: [{ label: "Confirm", value: "confirmed" }],
  confirmed: [{ label: "Check In", value: "checked_in" }],
  checked_in: [{ label: "Start Service", value: "in_progress" }],
  in_progress: [{ label: "Complete", value: "completed" }],
};

type UpdateStatusDropdownProps = {
  appointmentId: Id<"appointments">;
  organizationId: Id<"organization">;
  currentStatus: string;
};

export function UpdateStatusDropdown({
  appointmentId,
  organizationId,
  currentStatus,
}: UpdateStatusDropdownProps) {
  const updateStatus = useMutation(api.appointments.updateStatus);
  const actions = TRANSITIONS[currentStatus];

  if (!actions || actions.length === 0) return null;

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus({
        organizationId,
        appointmentId,
        status: status as any,
      });
      toast.success("Status updated");
    } catch (error: any) {
      toast.error(error?.data?.message ?? "Failed to update status");
    }
  };

  if (actions.length === 1) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleStatusChange(actions[0].value)}
      >
        {actions[0].label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          Update <ChevronDown className="ml-1 size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.value}
            onClick={() => handleStatusChange(action.value)}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
