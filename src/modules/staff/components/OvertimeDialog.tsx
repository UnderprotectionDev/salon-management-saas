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

type OvertimeDialogProps = {
  staffId: Id<"staff">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OvertimeDialog({
  staffId,
  open,
  onOpenChange,
}: OvertimeDialogProps) {
  const activeOrganization = useActiveOrganization();
  const createOvertime = useMutation(api.staffOvertime.create);

  const form = useForm({
    defaultValues: {
      date: null as Date | null,
      startTime: "18:00",
      endTime: "21:00",
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
      if (value.startTime >= value.endTime) {
        toast.error("End time must be after start time");
        return;
      }

      try {
        await createOvertime({
          organizationId: activeOrganization._id,
          staffId,
          date: format(value.date, "yyyy-MM-dd"),
          startTime: value.startTime,
          endTime: value.endTime,
          reason: value.reason || undefined,
        });
        toast.success("Overtime entry created");
        onOpenChange(false);
        form.reset();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to create overtime entry. Please try again.";
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
          <DialogTitle>Add Overtime</DialogTitle>
          <DialogDescription>
            Add extra work hours beyond the regular schedule
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

            {/* Time Selects */}
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

            {/* Reason */}
            <form.Field name="reason">
              {(field) => (
                <div className="space-y-2">
                  <Label>Reason (optional)</Label>
                  <Textarea
                    placeholder="e.g., Extra client appointments, event coverage..."
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
                "Add Overtime"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
