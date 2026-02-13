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

const TRANSITIONS: Record<
  string,
  { label: string; value: string; variant?: "destructive" }[]
> = {
  pending: [
    { label: "Confirm", value: "confirmed" },
    { label: "No Show", value: "no_show", variant: "destructive" },
  ],
  confirmed: [
    { label: "Check In", value: "checked_in" },
    { label: "No Show", value: "no_show", variant: "destructive" },
  ],
  checked_in: [
    { label: "Start Service", value: "in_progress" },
    { label: "No Show", value: "no_show", variant: "destructive" },
  ],
  in_progress: [
    { label: "Complete", value: "completed" },
    { label: "No Show", value: "no_show", variant: "destructive" },
  ],
};

type UpdateStatusDropdownProps = {
  appointmentId: Id<"appointments">;
  organizationId: Id<"organization">;
  currentStatus: string;
  appointmentDate: string;
  appointmentStartTime: number;
};

export function UpdateStatusDropdown({
  appointmentId,
  organizationId,
  currentStatus,
  appointmentDate,
  appointmentStartTime,
}: UpdateStatusDropdownProps) {
  const updateStatus = useMutation(api.appointments.updateStatus);
  let actions = TRANSITIONS[currentStatus];

  // Check if appointment is in the past
  const appointmentDateTime = new Date(`${appointmentDate}T00:00:00`);
  appointmentDateTime.setHours(
    Math.floor(appointmentStartTime / 60),
    appointmentStartTime % 60,
    0,
    0,
  );
  const isPastAppointment = appointmentDateTime.getTime() < Date.now();

  // Filter out "No Show" option if appointment hasn't started yet
  if (!isPastAppointment && actions) {
    actions = actions.filter((a) => a.value !== "no_show");
  }

  if (!actions || actions.length === 0) return null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus({
        organizationId,
        appointmentId,
        status: newStatus as
          | "confirmed"
          | "checked_in"
          | "in_progress"
          | "completed"
          | "no_show",
      });
      toast.success("Status updated");
    } catch (error: unknown) {
      const msg =
        (error as { data?: { message?: string } })?.data?.message ??
        "Failed to update status";
      toast.error(msg);
    }
  };

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
            className={
              action.variant === "destructive" ? "text-destructive" : undefined
            }
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
