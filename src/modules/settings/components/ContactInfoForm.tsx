"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
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
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

interface ContactInfoFormProps {
  organizationId: Id<"organization">;
  settings: Doc<"organizationSettings"> | null;
  onSuccess?: () => void;
}

// =============================================================================
// Validators
// =============================================================================

const emailSchema = z
  .string()
  .email("Please enter a valid email")
  .or(z.literal(""));

const phoneSchema = z
  .string()
  .regex(/^(\+90|0)?[0-9\s-]{10,15}$/, "Please enter a valid phone number")
  .or(z.literal(""));

const websiteSchema = z
  .string()
  .url("Please enter a valid URL")
  .or(z.literal(""));

// =============================================================================
// Component
// =============================================================================

export function ContactInfoForm({
  organizationId,
  settings,
  onSuccess,
}: ContactInfoFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateSettings = useMutation(api.organizations.updateSettings);

  const form = useForm({
    defaultValues: {
      email: settings?.email ?? "",
      phone: settings?.phone ?? "",
      website: settings?.website ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        await updateSettings({
          organizationId,
          email: value.email || undefined,
          phone: value.phone || undefined,
          website: value.website || undefined,
        });
        setIsEditing(false);
        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update contact info. Please try again.";
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
            <div className="text-sm font-medium text-muted-foreground">
              Email
            </div>
            <p className="mt-1 text-sm">
              {settings?.email || (
                <span className="text-muted-foreground italic">Not set</span>
              )}
            </p>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              Phone
            </div>
            <p className="mt-1 text-sm">
              {settings?.phone || (
                <span className="text-muted-foreground italic">Not set</span>
              )}
            </p>
          </div>
          <div className="sm:col-span-2">
            <div className="text-sm font-medium text-muted-foreground">
              Website
            </div>
            <p className="mt-1 text-sm">
              {settings?.website ? (
                <a
                  href={settings.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {settings.website}
                </a>
              ) : (
                <span className="text-muted-foreground italic">Not set</span>
              )}
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={() => setIsEditing(true)}>
          Edit Contact Info
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
        {/* Email */}
        <form.Field
          name="email"
          validators={{
            onBlur: emailSchema,
            onSubmit: emailSchema,
          }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>Business Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={form.state.isSubmitting}
                  placeholder="contact@yoursalon.com"
                  aria-invalid={hasError}
                />
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {/* Phone */}
        <form.Field
          name="phone"
          validators={{
            onBlur: phoneSchema,
            onSubmit: phoneSchema,
          }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>Business Phone</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="tel"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={form.state.isSubmitting}
                  placeholder="+90 555 123 4567"
                  aria-invalid={hasError}
                />
                <FieldDescription>Turkish phone number format</FieldDescription>
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {/* Website */}
        <form.Field
          name="website"
          validators={{
            onBlur: websiteSchema,
            onSubmit: websiteSchema,
          }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>Website</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="url"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={form.state.isSubmitting}
                  placeholder="https://www.yoursalon.com"
                  aria-invalid={hasError}
                />
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
