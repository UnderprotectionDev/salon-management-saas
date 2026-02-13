"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";

type StaffProfileFormProps = {
  staff: Doc<"staff">;
  onSuccess?: () => void;
  onCancel?: () => void;
};

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

const bioSchema = z.string().max(500, "Bio cannot exceed 500 characters");

export function StaffProfileForm({
  staff,
  onSuccess,
  onCancel,
}: StaffProfileFormProps) {
  const updateProfile = useMutation(api.staff.updateProfile);

  const form = useForm({
    defaultValues: {
      name: staff.name,
      phone: staff.phone ?? "",
      bio: staff.bio ?? "",
      status: staff.status, // Schema enforces valid values
    },
    onSubmit: async ({ value }) => {
      try {
        await updateProfile({
          organizationId: staff.organizationId,
          staffId: staff._id,
          name: value.name,
          phone: value.phone || undefined,
          bio: value.bio || undefined,
          status: value.status,
          defaultSchedule: staff.defaultSchedule,
        });
        toast.success("Profile updated successfully");
        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update profile. Please try again.";
        toast.error(message);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          name="name"
          validators={{ onBlur: nameSchema, onSubmit: nameSchema }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={form.state.isSubmitting}
                  aria-invalid={hasError}
                />
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="phone">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Phone (optional)</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="tel"
                placeholder="+90 555 123 4567"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                disabled={form.state.isSubmitting}
              />
            </Field>
          )}
        </form.Field>

        <form.Field
          name="bio"
          validators={{ onBlur: bioSchema, onSubmit: bioSchema }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>Bio (optional)</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={form.state.isSubmitting}
                  aria-invalid={hasError}
                  rows={3}
                  placeholder="A short bio..."
                />
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="status">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Status</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value: "active" | "inactive" | "pending") =>
                  field.handleChange(value)
                }
                disabled={form.state.isSubmitting}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

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
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={form.state.isSubmitting}
            >
              Cancel
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  );
}
