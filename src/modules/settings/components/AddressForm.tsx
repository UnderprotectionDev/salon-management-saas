"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CITY_NAMES, getDistricts } from "@/lib/data/turkey-cities";
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
            {[address?.city, address?.state, address?.postalCode].filter(
              Boolean,
            ).length > 0 && (
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
                  <FieldLabel>City</FieldLabel>
                  <SearchableSelect
                    items={CITY_NAMES}
                    value={field.state.value}
                    onValueChange={(val) => {
                      field.handleChange(val);
                      form.setFieldValue("state", "");
                    }}
                    placeholder="Select province"
                    searchPlaceholder="Search province..."
                    emptyMessage="No province found."
                    disabled={form.state.isSubmitting}
                    onBlur={field.handleBlur}
                  />
                  {hasError && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Subscribe selector={(s) => s.values.city}>
            {(city) => (
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
                      <FieldLabel>District</FieldLabel>
                      <SearchableSelect
                        items={getDistricts(city)}
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        placeholder={
                          city ? "Select district" : "Select province first"
                        }
                        searchPlaceholder="Search district..."
                        emptyMessage="No district found."
                        disabled={!city || form.state.isSubmitting}
                        onBlur={field.handleBlur}
                      />
                      {hasError && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            )}
          </form.Subscribe>
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

          <form.Field name="country">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Country</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </Field>
            )}
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
