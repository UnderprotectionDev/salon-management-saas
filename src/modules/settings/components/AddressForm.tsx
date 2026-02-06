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

interface AddressFormProps {
  organizationId: Id<"organization">;
  settings: Doc<"organizationSettings"> | null;
  onSuccess?: () => void;
}

// =============================================================================
// Validators
// =============================================================================

// Note: Form fields are always strings (even if empty), so don't use .optional()
const stringSchema = z.string().max(200, "Maximum 200 characters");

// =============================================================================
// Component
// =============================================================================

export function AddressForm({
  organizationId,
  settings,
  onSuccess,
}: AddressFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateSettings = useMutation(api.organizations.updateSettings);

  const address = settings?.address;

  const form = useForm({
    defaultValues: {
      street: address?.street ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "",
      postalCode: address?.postalCode ?? "",
      country: address?.country ?? "Turkey",
    },
    onSubmit: async ({ value }) => {
      try {
        await updateSettings({
          organizationId,
          address: {
            street: value.street || undefined,
            city: value.city || undefined,
            state: value.state || undefined,
            postalCode: value.postalCode || undefined,
            country: value.country || undefined,
          },
        });
        setIsEditing(false);
        onSuccess?.();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to update address. Please try again.";
        toast.error(message);
      }
    },
  });

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const hasAddress =
    address?.street ||
    address?.city ||
    address?.state ||
    address?.postalCode ||
    address?.country;

  if (!isEditing) {
    return (
      <div className="space-y-4">
        {hasAddress ? (
          <div className="text-sm">
            {address?.street && <p>{address.street}</p>}
            {[address?.city, address?.state, address?.postalCode].filter(Boolean)
              .length > 0 && (
              <p>
                {[address?.city, address?.state, address?.postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {address?.country && <p>{address.country}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No address configured
          </p>
        )}

        <Button variant="outline" onClick={() => setIsEditing(true)}>
          {hasAddress ? "Edit Address" : "Add Address"}
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
        {/* Street */}
        <form.Field
          name="street"
          validators={{
            onBlur: stringSchema,
            onSubmit: stringSchema,
          }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>Street Address</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={form.state.isSubmitting}
                  placeholder="123 Main Street, Suite 100"
                  aria-invalid={hasError}
                />
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {/* City & State */}
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field
            name="city"
            validators={{
              onBlur: stringSchema,
            }}
          >
            {(field) => {
              const hasError =
                field.state.meta.isTouched &&
                field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={hasError || undefined}>
                  <FieldLabel htmlFor={field.name}>City</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    placeholder="Istanbul"
                    aria-invalid={hasError}
                  />
                  {hasError && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field
            name="state"
            validators={{
              onBlur: stringSchema,
            }}
          >
            {(field) => {
              const hasError =
                field.state.meta.isTouched &&
                field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={hasError || undefined}>
                  <FieldLabel htmlFor={field.name}>
                    State / Province / District
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    placeholder="Kadikoy"
                    aria-invalid={hasError}
                  />
                  {hasError && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </div>

        {/* Postal Code & Country */}
        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field
            name="postalCode"
            validators={{
              onBlur: stringSchema,
            }}
          >
            {(field) => {
              const hasError =
                field.state.meta.isTouched &&
                field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={hasError || undefined}>
                  <FieldLabel htmlFor={field.name}>Postal Code</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    placeholder="34000"
                    aria-invalid={hasError}
                  />
                  {hasError && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field
            name="country"
            validators={{
              onBlur: stringSchema,
            }}
          >
            {(field) => {
              const hasError =
                field.state.meta.isTouched &&
                field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={hasError || undefined}>
                  <FieldLabel htmlFor={field.name}>Country</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    placeholder="Turkey"
                    aria-invalid={hasError}
                  />
                  {hasError && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={form.state.isSubmitting}>
            {form.state.isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Address"
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
