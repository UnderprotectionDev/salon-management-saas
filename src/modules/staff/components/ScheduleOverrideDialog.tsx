"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { format, startOfDay } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useActiveOrganization } from "@/modules/organization";
import { TIME_OPTIONS } from "@/modules/staff/lib/constants";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type ScheduleOverrideDialogProps = {
  staffId: Id<"staff">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ScheduleOverrideDialog({
  staffId,
  open,
  onOpenChange,
}: ScheduleOverrideDialogProps) {
  const activeOrganization = useActiveOrganization();
  const createOverride = useMutation(api.scheduleOverrides.create);

  const form = useForm({
    defaultValues: {
      date: null as Date | null,
      type: "day_off" as "custom_hours" | "day_off" | "time_off",
      startTime: "09:00",
      endTime: "18:00",
      reason: "",
    },
    onSubmit: async ({ value }) => {
      if (!activeOrganization) {
        toast.error("No active organization selected");
        return;
      }
      if (!value.date) {
        toast.error("Please select a date");
        return;
      }
      if (
        value.type === "custom_hours" &&
        value.startTime &&
        value.endTime &&
        value.startTime >= value.endTime
      ) {
        toast.error("Start time must be before end time");
        return;
      }

      try {
        await createOverride({
          organizationId: activeOrganization._id,
          staffId,
          date: format(value.date, "yyyy-MM-dd"),
          type: value.type,
          startTime:
            value.type === "custom_hours" ? value.startTime : undefined,
          endTime: value.type === "custom_hours" ? value.endTime : undefined,
          reason: value.reason || undefined,
        });
        toast.success("Schedule override created");
        onOpenChange(false);
        form.reset();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create override. Please try again.";
        toast.error(message);
      }
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Schedule Override</DialogTitle>
          <DialogDescription>
            Create a one-time change to the regular schedule
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="space-y-4">
            {/* Date Picker */}
            <form.Field name="date">
              {(field) => (
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.state.value && "text-muted-foreground",
                        )}
                        disabled={form.state.isSubmitting}
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {field.state.value
                          ? format(field.state.value, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.state.value ?? undefined}
                        onSelect={(date) => field.handleChange(date ?? null)}
                        disabled={(date) => date < startOfDay(new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </form.Field>

            {/* Override Type */}
            <form.Field name="type">
              {(field) => (
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(
                      value: "custom_hours" | "day_off" | "time_off",
                    ) => field.handleChange(value)}
                    disabled={form.state.isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day_off">Day Off</SelectItem>
                      <SelectItem value="time_off">Time Off</SelectItem>
                      <SelectItem value="custom_hours">Custom Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Time Selects (only for custom_hours) */}
            <form.Subscribe selector={(state) => state.values.type}>
              {(type) =>
                type === "custom_hours" && (
                  <div className="grid grid-cols-2 gap-4">
                    <form.Field name="startTime">
                      {(field) => (
                        <div className="space-y-2">
                          <Label>Start Time</Label>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                            disabled={form.state.isSubmitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Start" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </form.Field>

                    <form.Field name="endTime">
                      {(field) => (
                        <div className="space-y-2">
                          <Label>End Time</Label>
                          <Select
                            value={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                            disabled={form.state.isSubmitting}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="End" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </form.Field>
                  </div>
                )
              }
            </form.Subscribe>

            {/* Reason */}
            <form.Field name="reason">
              {(field) => (
                <div className="space-y-2">
                  <Label>Reason (optional)</Label>
                  <Textarea
                    placeholder="e.g., Doctor appointment, holiday..."
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    disabled={form.state.isSubmitting}
                    rows={2}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={form.state.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Override"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
