"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { PhoneInput } from "@/components/reui/phone-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { CITY_NAMES, getDistricts } from "@/lib/data/turkey-cities";
import { loadNeighbourhoods } from "@/lib/data/neighbourhood-loader";
import { formatPhoneInput } from "@/modules/customers/lib/phone";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../../../convex/_generated/api";

const emailSchema = z
  .string()
  .email("Please enter a valid email")
  .or(z.literal(""));

const websiteSchema = z
  .string()
  .url("Please enter a valid URL")
  .or(z.literal(""));

const urlSchema = z.string().url("Please enter a valid URL").or(z.literal(""));

const stringSchema = z.string().max(200, "Maximum 200 characters");

export default function ContactSettingsPage() {
  const { activeOrganization } = useOrganization();
  const [neighbourhoods, setNeighbourhoods] = useState<string[]>([]);
  const updateSettings = useMutation(api.organizations.updateSettings);

  const settings = useQuery(
    api.organizations.getSettings,
    activeOrganization ? { organizationId: activeOrganization._id } : "skip",
  );

  const address = settings?.address;

  const form = useForm({
    defaultValues: {
      // Contact
      email: settings?.email ?? "",
      phone: settings?.phone ?? "",
      website: settings?.website ?? "",
      // Social media
      instagram: settings?.socialMedia?.instagram ?? "",
      facebook: settings?.socialMedia?.facebook ?? "",
      tiktok: settings?.socialMedia?.tiktok ?? "",
      googleMapsUrl: settings?.socialMedia?.googleMapsUrl ?? "",
      // Address
      street: address?.street ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "",
      neighbourhood: address?.neighbourhood ?? "",
      postalCode: address?.postalCode ?? "",
      country: address?.country ?? "Turkey",
    },
    onSubmit: async ({ value }) => {
      if (!activeOrganization) return;
      try {
        await updateSettings({
          organizationId: activeOrganization._id,
          email: value.email || undefined,
          phone: value.phone ? formatPhoneInput(value.phone) : undefined,
          website: value.website || undefined,
          socialMedia: {
            instagram: value.instagram || undefined,
            facebook: value.facebook || undefined,
            tiktok: value.tiktok || undefined,
            googleMapsUrl: value.googleMapsUrl || undefined,
          },
          address: {
            street: value.street || undefined,
            city: value.city || undefined,
            state: value.state || undefined,
            neighbourhood: value.neighbourhood || undefined,
            postalCode: value.postalCode || undefined,
            country: value.country || undefined,
          },
        });
        form.reset();
        toast.success("Contact & location saved");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save. Please try again.";
        toast.error(message);
      }
    },
  });

  // Load neighbourhoods when settings load with existing city+district
  useEffect(() => {
    if (address?.city && address?.state) {
      loadNeighbourhoods(address.city, address.state)
        .then(setNeighbourhoods)
        .catch(() => setNeighbourhoods([]));
    }
  }, [address?.city, address?.state]);

  const isDefaultValue = useStore(form.store, (s) => s.isDefaultValue);
  const { dialog } = useUnsavedChanges(!isDefaultValue);

  if (!activeOrganization || !settings) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {dialog}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              How customers can reach your salon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Email */}
                <form.Field
                  name="email"
                  validators={{ onBlur: emailSchema, onSubmit: emailSchema }}
                >
                  {(field) => {
                    const hasError =
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={hasError || undefined}>
                        <FieldLabel htmlFor={field.name}>
                          Business Email
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="email"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          disabled={form.state.isSubmitting}
                          placeholder="contact@yoursalon.com"
                        />
                        {hasError && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>

                {/* Phone */}
                <form.Field name="phone">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Business Phone
                      </FieldLabel>
                      <PhoneInput
                        id={field.name}
                        defaultCountry="TR"
                        maxInputLength={10}
                        placeholder="506 123 12 12"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(value) => field.handleChange(value ?? "")}
                        disabled={form.state.isSubmitting}
                      />
                    </Field>
                  )}
                </form.Field>
              </div>

              {/* Website */}
              <form.Field
                name="website"
                validators={{ onBlur: websiteSchema, onSubmit: websiteSchema }}
              >
                {(field) => {
                  const hasError =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
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
                      />
                      {hasError && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Social Media */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
            <CardDescription>
              Connect your social media profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field
                  name="instagram"
                  validators={{ onBlur: urlSchema, onSubmit: urlSchema }}
                >
                  {(field) => {
                    const hasError =
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={hasError || undefined}>
                        <FieldLabel htmlFor={field.name}>Instagram</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          disabled={form.state.isSubmitting}
                          placeholder="https://instagram.com/yoursalon"
                        />
                        {hasError && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field
                  name="facebook"
                  validators={{ onBlur: urlSchema, onSubmit: urlSchema }}
                >
                  {(field) => {
                    const hasError =
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={hasError || undefined}>
                        <FieldLabel htmlFor={field.name}>Facebook</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          disabled={form.state.isSubmitting}
                          placeholder="https://facebook.com/yoursalon"
                        />
                        {hasError && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field
                  name="tiktok"
                  validators={{ onBlur: urlSchema, onSubmit: urlSchema }}
                >
                  {(field) => {
                    const hasError =
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={hasError || undefined}>
                        <FieldLabel htmlFor={field.name}>TikTok</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          disabled={form.state.isSubmitting}
                          placeholder="https://tiktok.com/@yoursalon"
                        />
                        {hasError && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field
                  name="googleMapsUrl"
                  validators={{ onBlur: urlSchema, onSubmit: urlSchema }}
                >
                  {(field) => {
                    const hasError =
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={hasError || undefined}>
                        <FieldLabel htmlFor={field.name}>
                          Google Maps Link
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          disabled={form.state.isSubmitting}
                          placeholder="https://maps.google.com/..."
                        />
                        {hasError && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
            <CardDescription>Your salon's physical location</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {/* Street */}
              <form.Field
                name="street"
                validators={{ onBlur: stringSchema, onSubmit: stringSchema }}
              >
                {(field) => {
                  const hasError =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={hasError || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        Street Address
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        disabled={form.state.isSubmitting}
                        placeholder="123 Main Street, Suite 100"
                      />
                      {hasError && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              {/* City & District */}
              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field name="city" validators={{ onBlur: stringSchema }}>
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
                            form.setFieldValue("neighbourhood", "");
                            setNeighbourhoods([]);
                          }}
                          placeholder="Select province"
                          searchPlaceholder="Search province..."
                          emptyMessage="No province found."
                          disabled={form.state.isSubmitting}
                          onBlur={field.handleBlur}
                        />
                        {hasError && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Subscribe selector={(s) => s.values.city}>
                  {(city) => (
                    <form.Field
                      name="state"
                      validators={{ onBlur: stringSchema }}
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
                              onValueChange={(val) => {
                                field.handleChange(val);
                                form.setFieldValue("neighbourhood", "");
                                if (city && val) {
                                  loadNeighbourhoods(city, val)
                                    .then(setNeighbourhoods)
                                    .catch(() => setNeighbourhoods([]));
                                } else {
                                  setNeighbourhoods([]);
                                }
                              }}
                              placeholder={
                                city
                                  ? "Select district"
                                  : "Select province first"
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

              {/* Neighbourhood */}
              <form.Subscribe selector={(s) => s.values.state}>
                {(district) => (
                  <form.Field
                    name="neighbourhood"
                    validators={{ onBlur: stringSchema }}
                  >
                    {(field) => {
                      const hasError =
                        field.state.meta.isTouched &&
                        field.state.meta.errors.length > 0;
                      return (
                        <Field data-invalid={hasError || undefined}>
                          <FieldLabel>Neighbourhood</FieldLabel>
                          <SearchableSelect
                            items={neighbourhoods}
                            value={field.state.value}
                            onValueChange={field.handleChange}
                            placeholder={
                              district
                                ? "Select neighbourhood"
                                : "Select district first"
                            }
                            searchPlaceholder="Search neighbourhood..."
                            emptyMessage="No neighbourhood found."
                            disabled={!district || form.state.isSubmitting}
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

              {/* Postal Code & Country */}
              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field
                  name="postalCode"
                  validators={{ onBlur: stringSchema }}
                >
                  {(field) => {
                    const hasError =
                      field.state.meta.isTouched &&
                      field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={hasError || undefined}>
                        <FieldLabel htmlFor={field.name}>
                          Postal Code
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          disabled={form.state.isSubmitting}
                          placeholder="34000"
                        />
                        {hasError && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
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
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Save / Discard */}
        <form.Subscribe selector={(s) => [s.isDefaultValue, s.isSubmitting]}>
          {([isDefaultValue, isSubmitting]) =>
            !isDefaultValue ? (
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={isSubmitting as boolean}
                >
                  Discard
                </Button>
                <Button type="submit" disabled={isSubmitting as boolean}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            ) : null
          }
        </form.Subscribe>
      </form>
    </>
  );
}
