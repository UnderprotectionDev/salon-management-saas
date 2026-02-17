"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

interface BookingSettingsFormProps {
  organizationId: Id<"organization">;
  settings: Doc<"organizationSettings"> | null;
  onSuccess?: () => void;
}

// =============================================================================
// Validators
// =============================================================================

const positiveIntSchema = z
  .number()
  .int("Must be a whole number")
  .min(0, "Must be 0 or greater");

const minAdvanceSchema = positiveIntSchema.max(
  1440,
  "Maximum 1440 minutes (24 hours)",
);
const maxAdvanceDaysSchema = z
  .number()
  .int()
  .min(1, "Must be at least 1 day")
  .max(365, "Maximum 365 days");
const slotDurationSchema = z
  .number()
  .int()
  .min(5, "Minimum 5 minutes")
  .max(480, "Maximum 480 minutes (8 hours)");
const bufferSchema = positiveIntSchema.max(120, "Maximum 120 minutes");
const cancellationHoursSchema = z
  .number()
  .int()
  .min(0, "Must be 0 or greater")
  .max(168, "Maximum 168 hours (7 days)");

// =============================================================================
// Helpers
// =============================================================================

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// =============================================================================
// Component
// =============================================================================

export function BookingSettingsForm({
  organizationId,
  settings,
  onSuccess,
}: BookingSettingsFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateSettings = useMutation(api.organizations.updateSettings);

  const booking = settings?.bookingSettings;

  const form = useForm({
    defaultValues: {
      minAdvanceBookingMinutes: booking?.minAdvanceBookingMinutes ?? 60,
      maxAdvanceBookingDays: booking?.maxAdvanceBookingDays ?? 30,
      slotDurationMinutes: booking?.slotDurationMinutes ?? 30,
      bufferBetweenBookingsMinutes: booking?.bufferBetweenBookingsMinutes ?? 0,
      allowOnlineBooking: booking?.allowOnlineBooking ?? true,
      cancellationPolicyHours: booking?.cancellationPolicyHours ?? 24,
    },
    onSubmit: async ({ value }) => {
      try {
        await updateSettings({
          organizationId,
          bookingSettings: {
            minAdvanceBookingMinutes: value.minAdvanceBookingMinutes,
            maxAdvanceBookingDays: value.maxAdvanceBookingDays,
            slotDurationMinutes: value.slotDurationMinutes,
            bufferBetweenBookingsMinutes: value.bufferBetweenBookingsMinutes,
            allowOnlineBooking: value.allowOnlineBooking,
            cancellationPolicyHours: value.cancellationPolicyHours,
          },
        });
        setIsEditing(false);
        onSuccess?.();
        toast.success("Booking settings saved");
      } catch (error) {
        const message =
          error instanceof ConvexError
            ? (error.data?.message ?? "Failed to save booking settings.")
            : "Failed to save booking settings. Please try again.";
        toast.error(message);
      }
    },
  });

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Online Booking
            </p>
            <p className="mt-1 text-sm">
              {(booking?.allowOnlineBooking ?? true) ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Cancellation Policy
            </p>
            <p className="mt-1 text-sm">
              {booking?.cancellationPolicyHours ?? 24} hours before appointment
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Minimum Advance Booking
            </p>
            <p className="mt-1 text-sm">
              {formatMinutes(booking?.minAdvanceBookingMinutes ?? 60)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Maximum Advance Booking
            </p>
            <p className="mt-1 text-sm">
              {booking?.maxAdvanceBookingDays ?? 30} days
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Slot Duration
            </p>
            <p className="mt-1 text-sm">
              {formatMinutes(booking?.slotDurationMinutes ?? 30)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Buffer Between Bookings
            </p>
            <p className="mt-1 text-sm">
              {booking?.bufferBetweenBookingsMinutes
                ? formatMinutes(booking.bufferBetweenBookingsMinutes)
                : "None"}
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={() => setIsEditing(true)}>
          Edit Booking Settings
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        {/* Online Booking Toggle */}
        <form.Field name="allowOnlineBooking">
          {(field) => (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="allowOnlineBooking" className="font-medium">
                  Online Booking
                </Label>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Allow customers to book appointments online
                </p>
              </div>
              <Switch
                id="allowOnlineBooking"
                checked={field.state.value}
                onCheckedChange={field.handleChange}
                disabled={form.state.isSubmitting}
              />
            </div>
          )}
        </form.Field>

        {/* Cancellation Policy Hours */}
        <form.Field
          name="cancellationPolicyHours"
          validators={{
            onBlur: cancellationHoursSchema,
            onSubmit: cancellationHoursSchema,
          }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>
                  Cancellation Policy (hours)
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={0}
                  max={168}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  disabled={form.state.isSubmitting}
                />
                <FieldDescription>
                  Customers cannot cancel or reschedule within this many hours
                  of their appointment. Set to 0 to disable the policy.
                </FieldDescription>
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {/* Minimum Advance Booking */}
        <form.Field
          name="minAdvanceBookingMinutes"
          validators={{
            onBlur: minAdvanceSchema,
            onSubmit: minAdvanceSchema,
          }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>
                  Minimum Advance Booking (minutes)
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={0}
                  max={1440}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  disabled={form.state.isSubmitting}
                />
                <FieldDescription>
                  How far in advance a booking must be made. E.g. 60 = at least
                  1 hour before.
                </FieldDescription>
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {/* Maximum Advance Booking */}
        <form.Field
          name="maxAdvanceBookingDays"
          validators={{
            onBlur: maxAdvanceDaysSchema,
            onSubmit: maxAdvanceDaysSchema,
          }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>
                  Maximum Advance Booking (days)
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={1}
                  max={365}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  disabled={form.state.isSubmitting}
                />
                <FieldDescription>
                  How many days ahead customers can book. E.g. 30 = up to 1
                  month ahead.
                </FieldDescription>
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {/* Slot Duration */}
        <form.Field
          name="slotDurationMinutes"
          validators={{
            onBlur: slotDurationSchema,
            onSubmit: slotDurationSchema,
          }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>
                  Slot Duration (minutes)
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={5}
                  max={480}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  disabled={form.state.isSubmitting}
                />
                <FieldDescription>
                  Time slot granularity shown in the booking calendar. E.g. 30 =
                  slots every 30 minutes.
                </FieldDescription>
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {/* Buffer Between Bookings */}
        <form.Field
          name="bufferBetweenBookingsMinutes"
          validators={{
            onBlur: bufferSchema,
            onSubmit: bufferSchema,
          }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>
                  Buffer Between Bookings (minutes)
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={0}
                  max={120}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  disabled={form.state.isSubmitting}
                />
                <FieldDescription>
                  Break time added after each appointment before the next slot
                  becomes available. Set to 0 for no buffer.
                </FieldDescription>
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={form.state.isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
