"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Clock,
  Loader2,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  type BusinessHours,
  BusinessHoursEditor,
  getDefaultBusinessHours,
} from "@/components/business-hours/BusinessHoursEditor";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { useOrganizations } from "@/modules/organization";
import { api } from "../../../convex/_generated/api";

// =============================================================================
// Constants
// =============================================================================

type OrgSalonType = "hair" | "nail" | "makeup" | "barber" | "spa";

const SALON_TYPE_OPTIONS: { value: OrgSalonType; label: string }[] = [
  { value: "hair", label: "Hair Salon" },
  { value: "nail", label: "Nail Salon" },
  { value: "makeup", label: "Makeup Studio" },
  { value: "barber", label: "Barber Shop" },
  { value: "spa", label: "Spa" },
];

const STEPS = [
  { id: 1, name: "Basic Info", icon: Building2 },
  { id: 2, name: "Location", icon: MapPin },
  { id: 3, name: "Hours", icon: Clock },
] as const;

// =============================================================================
// Validators
// =============================================================================

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

// =============================================================================
// Types
// =============================================================================

interface OnboardingFormData {
  // Step 1: Basic Info
  name: string;
  slug: string;
  description: string;
  salonType: OrgSalonType[];
  // Step 2: Location
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  // Step 3: Business Hours (handled separately)
}

// =============================================================================
// Component
// =============================================================================

export default function OnboardingPage() {
  const router = useRouter();
  const organizations = useOrganizations();

  // Redirect to salon if user already belongs to one
  useEffect(() => {
    if (organizations && organizations.length > 0) {
      router.replace(`/${organizations[0].slug}/dashboard`);
    }
  }, [organizations, router]);

  const [currentStep, setCurrentStep] = useState(1);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    getDefaultBusinessHours,
  );
  const [isCreating, setIsCreating] = useState(false);

  const createOrganization = useMutation(api.organizations.create);
  const updateSettings = useMutation(api.organizations.updateSettings);
  const updateSalonType = useMutation(api.organizations.updateSalonType);

  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      salonType: [] as OrgSalonType[],
      email: "",
      phone: "",
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Turkey",
    } satisfies OnboardingFormData,
  });

  const progress = (currentStep / STEPS.length) * 100;

  const canProceed = (values: OnboardingFormData) => {
    if (currentStep === 1) {
      const nameValid = nameSchema.safeParse(values.name).success;
      const slugValid = slugSchema.safeParse(values.slug).success;
      return nameValid && slugValid;
    }

    if (currentStep === 2) {
      if (values.email) {
        return emailSchema.safeParse(values.email).success;
      }
      return true;
    }

    if (currentStep === 3) {
      return true;
    }

    return true;
  };

  const handleCreateOrganization = async () => {
    const value = form.state.values;
    setIsCreating(true);
    try {
      const result = await createOrganization({
        name: value.name,
        slug: value.slug,
        email: value.email || undefined,
        phone: value.phone || undefined,
      });

      await updateSettings({
        organizationId: result.organizationId,
        address: {
          street: value.street || undefined,
          city: value.city || undefined,
          state: value.state || undefined,
          postalCode: value.postalCode || undefined,
          country: value.country || undefined,
        },
        businessHours,
      });

      if (value.salonType.length > 0) {
        await updateSalonType({
          organizationId: result.organizationId,
          salonType: value.salonType,
        });
      }

      router.push(`/${result.slug}/dashboard`);
    } catch (error) {
      console.error("Failed to create organization:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create salon";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const values = form.state.values;

      const nameResult = nameSchema.safeParse(values.name);
      if (!nameResult.success) {
        toast.error(
          nameResult.error.issues[0]?.message || "Invalid salon name",
        );
        return;
      }

      const slugResult = slugSchema.safeParse(values.slug);
      if (!slugResult.success) {
        toast.error(slugResult.error.issues[0]?.message || "Invalid URL slug");
        return;
      }
    }

    if (currentStep === 3) {
      await handleCreateOrganization();
      return;
    }

    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Create Your Salon
          </h1>
          <p className="text-muted-foreground mt-2">
            Set up your salon in just a few steps
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-1 ${
                    isActive
                      ? "text-primary"
                      : isCompleted
                        ? "text-primary/60"
                        : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isActive
                        ? "border-primary bg-primary/10"
                        : isCompleted
                          ? "border-primary/60 bg-primary/5"
                          : "border-muted-foreground/30"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="size-5" />
                    ) : (
                      <Icon className="size-5" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "Basic Information"}
              {currentStep === 2 && "Location & Contact"}
              {currentStep === 3 && "Business Hours"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 &&
                "Enter your salon's name and create a unique URL"}
              {currentStep === 2 &&
                "Add your salon's address and contact information"}
              {currentStep === 3 &&
                "Set your operating hours for each day of the week"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
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
                          aria-invalid={hasError}
                        />
                        {hasError && (
                          <FieldError errors={field.state.meta.errors} />
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
                            className="flex-1"
                            aria-invalid={hasError}
                          />
                        </div>
                        <FieldDescription>
                          This will be your salon's unique URL
                        </FieldDescription>
                        {hasError && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field name="description">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Description (optional)
                      </FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        placeholder="Tell customers about your salon..."
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        rows={3}
                      />
                    </Field>
                  )}
                </form.Field>

                <form.Field name="salonType">
                  {(field) => (
                    <Field>
                      <FieldLabel>Salon Type (optional)</FieldLabel>
                      <div className="flex flex-wrap gap-2">
                        {SALON_TYPE_OPTIONS.map((opt) => (
                          <Toggle
                            key={opt.value}
                            variant="outline"
                            pressed={field.state.value.includes(opt.value)}
                            onPressedChange={(pressed) => {
                              if (pressed) {
                                field.handleChange([
                                  ...field.state.value,
                                  opt.value,
                                ]);
                              } else {
                                field.handleChange(
                                  field.state.value.filter(
                                    (t) => t !== opt.value,
                                  ),
                                );
                              }
                            }}
                            className="px-4"
                          >
                            {opt.label}
                          </Toggle>
                        ))}
                      </div>
                      <FieldDescription>
                        Select all types that apply. Enables AI-powered features
                        like photo analysis and virtual try-on.
                      </FieldDescription>
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
            )}

            {/* Step 2: Location & Contact */}
            {currentStep === 2 && (
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
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
                            Business Email
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            type="email"
                            placeholder="contact@yoursalon.com"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={hasError}
                          />
                          {hasError && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="phone">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          Business Phone
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="tel"
                          placeholder="+90 555 123 4567"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>

                <form.Field name="street">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Street Address
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        placeholder="123 Main Street, Suite 100"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </Field>
                  )}
                </form.Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <form.Field name="city">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>City</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          placeholder="Istanbul"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="state">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>District</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          placeholder="Kadikoy"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <form.Field name="postalCode">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>
                          Postal Code
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          placeholder="34000"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="country">
                    {(field) => (
                      <Field>
                        <FieldLabel htmlFor={field.name}>Country</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          placeholder="Turkey"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>
              </FieldGroup>
            )}

            {/* Step 3: Business Hours */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <BusinessHoursEditor
                  value={businessHours}
                  onChange={setBusinessHours}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <form.Subscribe
          selector={(state) => ({
            values: state.values,
            canSubmit: state.canSubmit,
          })}
        >
          {(state) => {
            const isValid = canProceed(state.values);
            return (
              <div>
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1 || isCreating}
                  >
                    <ArrowLeft className="size-4 mr-2" />
                    Back
                  </Button>

                  {currentStep === 3 ? (
                    <Button
                      onClick={handleNext}
                      disabled={isCreating || !isValid}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Salon
                          <ArrowRight className="size-4 ml-2" />
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={handleNext} disabled={!isValid}>
                      Next
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            );
          }}
        </form.Subscribe>
      </div>
    </div>
  );
}
