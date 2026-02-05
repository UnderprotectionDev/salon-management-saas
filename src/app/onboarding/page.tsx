"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "../../../convex/_generated/api";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const nameSchema = z
  .string()
  .min(2, "Salon name must be at least 2 characters")
  .max(100, "Salon name cannot exceed 100 characters");

const slugSchema = z
  .string()
  .min(2, "URL slug must be at least 2 characters")
  .max(50, "URL slug cannot exceed 50 characters")
  .regex(
    /^[a-z0-9-]+$/,
    "URL slug can only contain lowercase letters, numbers, and hyphens",
  );

const emailSchema = z
  .string()
  .email("Please enter a valid email")
  .or(z.literal(""));

export default function OnboardingPage() {
  const router = useRouter();
  const createOrganization = useMutation(api.organizations.create);

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      email: "",
      phone: "",
    },
    onSubmit: async ({ value }) => {
      const result = await createOrganization({
        name: value.name,
        slug: value.slug,
        email: value.email || undefined,
        phone: value.phone || undefined,
      });
      router.push(`/${result.slug}/dashboard`);
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="size-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Your Salon</CardTitle>
          <CardDescription>
            Set up your salon to start managing appointments and staff
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                validators={{
                  onBlur: nameSchema,
                }}
              >
                {(field) => {
                  const hasError =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={hasError || undefined}>
                      <FieldLabel htmlFor={field.name}>Salon Name</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        placeholder="e.g., Elite Hair Studio"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.handleChange(value);
                          form.setFieldValue("slug", slugify(value));
                        }}
                        disabled={form.state.isSubmitting}
                        aria-invalid={hasError}
                      />
                      {hasError && (
                        <FieldError>
                          {field.state.meta.errors.join(", ")}
                        </FieldError>
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field
                name="slug"
                validators={{
                  onBlur: slugSchema,
                }}
              >
                {(field) => {
                  const hasError =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={hasError || undefined}>
                      <FieldLabel htmlFor={field.name}>URL Slug</FieldLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          yoursite.com/
                        </span>
                        <Input
                          id={field.name}
                          name={field.name}
                          placeholder="elite-hair-studio"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(slugify(e.target.value))
                          }
                          disabled={form.state.isSubmitting}
                          className="flex-1"
                          aria-invalid={hasError}
                        />
                      </div>
                      <FieldDescription>
                        This will be your salon&apos;s unique URL
                      </FieldDescription>
                      {hasError && (
                        <FieldError>
                          {field.state.meta.errors.join(", ")}
                        </FieldError>
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field
                name="email"
                validators={{
                  onBlur: emailSchema,
                }}
              >
                {(field) => {
                  const hasError =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={hasError || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        Business Email (optional)
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        placeholder="contact@yoursalon.com"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        disabled={form.state.isSubmitting}
                        aria-invalid={hasError}
                      />
                      {hasError && (
                        <FieldError>
                          {field.state.meta.errors.join(", ")}
                        </FieldError>
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="phone">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Business Phone (optional)
                    </FieldLabel>
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

              <form.Subscribe selector={(state) => state.errors}>
                {(errors) =>
                  errors.length > 0 && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {errors.join(", ")}
                    </div>
                  )
                }
              </form.Subscribe>

              <Button
                type="submit"
                className="w-full"
                disabled={form.state.isSubmitting}
              >
                {form.state.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating Salon...
                  </>
                ) : (
                  "Create Salon"
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
