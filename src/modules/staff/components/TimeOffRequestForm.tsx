"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { api } from "../../../../convex/_generated/api";

type TimeOffRequestFormProps = {
  onSuccess?: () => void;
};

const TIME_OFF_TYPES = [
  { value: "vacation", label: "Vacation" },
  { value: "sick", label: "Sick Leave" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
] as const;

type TimeOffType = "vacation" | "sick" | "personal" | "other";

export function TimeOffRequestForm({ onSuccess }: TimeOffRequestFormProps) {
  const activeOrganization = useActiveOrganization();
  const createRequest = useMutation(api.timeOffRequests.request);

  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      startDate: null as Date | null,
      endDate: null as Date | null,
      type: "vacation" as TimeOffType,
      reason: "",
    },
    onSubmit: async ({ value }) => {
      if (!activeOrganization) return;
      if (!value.startDate || !value.endDate) {
        toast.error("Please select both start and end dates");
        return;
      }

      if (value.startDate > value.endDate) {
        toast.error("Start date must be before or equal to end date");
        return;
      }

      try {
        await createRequest({
          organizationId: activeOrganization._id,
          startDate: format(value.startDate, "yyyy-MM-dd"),
          endDate: format(value.endDate, "yyyy-MM-dd"),
          type: value.type,
          reason: value.reason || undefined,
        });
        toast.success("Time-off request submitted successfully");
        form.reset();
        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to submit request. Please try again.";
        toast.error(message);
      }
    },
  });

  if (!activeOrganization) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Time Off</CardTitle>
        <CardDescription>
          Submit a time-off request for approval by your manager.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Start Date */}
            <form.Field name="startDate">
              {(field) => (
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
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
                          ? format(field.state.value, "MMM d, yyyy")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.state.value ?? undefined}
                        onSelect={(date) => {
                          field.handleChange(date ?? null);
                          setStartDateOpen(false);
                          // Reset end date if it's before the new start date
                          const currentEnd = form.getFieldValue("endDate");
                          if (date && currentEnd && currentEnd < date) {
                            form.setFieldValue("endDate", null);
                          }
                        }}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </form.Field>

            {/* End Date */}
            <form.Subscribe selector={(state) => state.values.startDate}>
              {(startDate) => (
                <form.Field name="endDate">
                  {(field) => {
                    const today = new Date(new Date().setHours(0, 0, 0, 0));
                    const minDate =
                      startDate && startDate > today ? startDate : today;

                    return (
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Popover
                          open={endDateOpen}
                          onOpenChange={setEndDateOpen}
                        >
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
                                ? format(field.state.value, "MMM d, yyyy")
                                : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.state.value ?? undefined}
                              onSelect={(date) => {
                                field.handleChange(date ?? null);
                                setEndDateOpen(false);
                              }}
                              disabled={(date) => date < minDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  }}
                </form.Field>
              )}
            </form.Subscribe>
          </div>

          {/* Type */}
          <form.Field name="type">
            {(field) => (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value: TimeOffType) =>
                    field.handleChange(value)
                  }
                  disabled={form.state.isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OFF_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          {/* Reason */}
          <form.Field name="reason">
            {(field) => (
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Provide additional details..."
                  rows={3}
                  disabled={form.state.isSubmitting}
                />
              </div>
            )}
          </form.Field>

          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
