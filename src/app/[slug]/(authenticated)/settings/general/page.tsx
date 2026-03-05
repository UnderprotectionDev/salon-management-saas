"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { LogoUpload } from "@/components/logo-upload";
import { RichEditor } from "@/components/rich-editor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";
import {
  type OrgSalonType,
  SALON_TYPE_CATEGORIES,
} from "@/modules/org-onboarding/lib/constants";
import { useOrganization } from "@/modules/organization";
import { api } from "../../../../../../convex/_generated/api";

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

function stripHtmlLength(html: string): number {
  if (typeof document !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent || "").trim().length;
  }
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim().length;
}

const descriptionSchema = z
  .string()
  .refine(
    (val) => stripHtmlLength(val) <= 2000,
    "Description cannot exceed 2000 characters",
  );

export default function GeneralSettingsPage() {
  const { activeOrganization } = useOrganization();
  const updateOrganization = useMutation(api.organizations.update);
  const updateSalonType = useMutation(api.organizations.updateSalonType);

  const form = useForm({
    defaultValues: {
      name: activeOrganization?.name ?? "",
      description: activeOrganization?.description ?? "",
      salonType: [
        ...(activeOrganization?.salonType ?? []),
      ].sort() as OrgSalonType[],
    },
    onSubmit: async ({ value }) => {
      if (!activeOrganization) return;
      try {
        await updateOrganization({
          organizationId: activeOrganization._id,
          name: value.name,
          description: value.description || undefined,
        });

        await updateSalonType({
          organizationId: activeOrganization._id,
          salonType: value.salonType,
        });

        toast.success("Settings saved");
      } catch {
        toast.error("Failed to save settings");
      }
    },
  });

  // Sync form when activeOrganization updates (e.g. after save)
  useEffect(() => {
    if (!activeOrganization) return;
    form.reset({
      name: activeOrganization.name,
      description: activeOrganization.description ?? "",
      salonType: [
        ...(activeOrganization.salonType ?? []),
      ].sort() as OrgSalonType[],
    });
  }, [activeOrganization, form]);

  const isDefaultValue = useStore(form.store, (s) => s.isDefaultValue);
  const { dialog } = useUnsavedChanges(!isDefaultValue);

  if (!activeOrganization) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
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
        {/* Logo + Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Salon Information</CardTitle>
            <CardDescription>
              Your salon's basic information and branding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {/* Logo */}
              <div>
                <div className="text-sm font-medium">Logo</div>
                <div className="mt-2">
                  <LogoUpload
                    organizationId={activeOrganization._id}
                    currentLogo={activeOrganization.logo}
                  />
                </div>
              </div>

              {/* Name */}
              <form.Field
                name="name"
                validators={{ onBlur: nameSchema, onSubmit: nameSchema }}
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
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        disabled={form.state.isSubmitting}
                      />
                      {hasError && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              {/* Description */}
              <form.Field
                name="description"
                validators={{
                  onBlur: descriptionSchema,
                  onSubmit: descriptionSchema,
                }}
              >
                {(field) => {
                  const hasError =
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={hasError || undefined}>
                      <FieldLabel htmlFor="description-editor">
                        Description
                      </FieldLabel>
                      <RichEditor
                        value={field.state.value}
                        onChange={(html) => field.handleChange(html)}
                        onBlur={field.handleBlur}
                        disabled={form.state.isSubmitting}
                        placeholder="Describe your salon..."
                      />
                      {hasError && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              {/* URL Slug (read-only) */}
              <div>
                <div className="text-sm font-medium text-muted-foreground">
                  URL Slug
                </div>
                <p className="mt-1 text-sm font-mono text-muted-foreground">
                  /{activeOrganization.slug}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  URL slug cannot be changed
                </p>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Salon Types - Categorized */}
        <Card>
          <CardHeader>
            <CardTitle>Salon Type</CardTitle>
            <CardDescription>
              Select all types that apply. Required for AI features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.Field name="salonType">
              {(field) => (
                <div className="space-y-2">
                  {SALON_TYPE_CATEGORIES.map((category) => {
                    const selectedInCategory = category.types.filter((t) =>
                      field.state.value.includes(t.value),
                    );
                    return (
                      <Collapsible
                        key={category.key}
                        defaultOpen={selectedInCategory.length > 0}
                      >
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-accent/50 transition-colors [&[data-state=open]>svg]:rotate-90">
                          <span className="flex items-center gap-2">
                            {category.label}
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {selectedInCategory.length}/
                              {category.types.length}
                            </span>
                          </span>
                          <svg
                            aria-hidden="true"
                            className="size-4 text-muted-foreground transition-transform"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m9 5 7 7-7 7"
                            />
                          </svg>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="grid grid-cols-2 gap-2 px-1 pt-2 pb-1 sm:grid-cols-3">
                            {category.types.map((type) => {
                              const Icon = type.icon;
                              const isSelected = field.state.value.includes(
                                type.value,
                              );
                              return (
                                <button
                                  key={type.value}
                                  type="button"
                                  onClick={() => {
                                    const next = isSelected
                                      ? field.state.value.filter(
                                          (v) => v !== type.value,
                                        )
                                      : [...field.state.value, type.value];
                                    field.handleChange(
                                      [...next].sort() as OrgSalonType[],
                                    );
                                  }}
                                  disabled={form.state.isSubmitting}
                                  className={cn(
                                    "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                                    isSelected
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
                                  )}
                                >
                                  <Icon className="size-4 shrink-0" />
                                  {type.label}
                                </button>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </form.Field>
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
