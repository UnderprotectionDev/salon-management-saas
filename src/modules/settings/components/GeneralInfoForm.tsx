"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { LogoUpload } from "@/components/logo-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// =============================================================================
// Types
// =============================================================================

type OrgSalonType =
  | "hair_women"
  | "hair_men"
  | "children"
  | "braiding"
  | "blowout_bar"
  | "hair_extensions"
  | "nail"
  | "makeup"
  | "skincare"
  | "lash_brow"
  | "permanent_makeup"
  | "threading"
  | "head_spa"
  | "spa"
  | "massage"
  | "hammam"
  | "sauna"
  | "ayurveda"
  | "float_therapy"
  | "waxing"
  | "tanning"
  | "laser"
  | "electrolysis"
  | "medspa"
  | "aesthetic_clinic"
  | "cryotherapy"
  | "iv_therapy"
  | "body_contouring"
  | "hair_loss"
  | "tattoo"
  | "piercing"
  | "henna"
  | "pet_grooming"
  | "beauty_center";

// Minimal organization fields required by this component
type OrganizationData = {
  _id: Id<"organization">;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  salonType?: OrgSalonType[] | null;
};

interface GeneralInfoFormProps {
  organization: OrganizationData;
  onSuccess?: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const SALON_TYPE_OPTIONS: { value: OrgSalonType; label: string }[] = [
  { value: "hair_women", label: "Women's Salon" },
  { value: "nail", label: "Nail Salon" },
  { value: "makeup", label: "Makeup Studio" },
  { value: "hair_men", label: "Men's Salon" },
  { value: "spa", label: "Spa" },
  { value: "children", label: "Children's Salon" },
  { value: "skincare", label: "Skincare" },
  { value: "lash_brow", label: "Lash & Brow" },
  { value: "medspa", label: "Med Spa" },
  { value: "massage", label: "Massage" },
  { value: "waxing", label: "Waxing" },
  { value: "tanning", label: "Tanning" },
  { value: "tattoo", label: "Tattoo" },
  { value: "piercing", label: "Piercing" },
  { value: "pet_grooming", label: "Pet Grooming" },
  { value: "laser", label: "Laser / IPL" },
  { value: "permanent_makeup", label: "Permanent Makeup" },
  { value: "beauty_center", label: "Beauty Center" },
  { value: "hammam", label: "Hammam" },
  { value: "braiding", label: "Braiding / Protective Styles" },
  { value: "blowout_bar", label: "Blow Dry Bar" },
  { value: "hair_extensions", label: "Extensions / Wig Studio" },
  { value: "threading", label: "Threading / Brow Bar" },
  { value: "head_spa", label: "Head Spa" },
  { value: "sauna", label: "Sauna / Bath House" },
  { value: "ayurveda", label: "Ayurvedic Center" },
  { value: "float_therapy", label: "Float Therapy" },
  { value: "electrolysis", label: "Electrolysis" },
  { value: "aesthetic_clinic", label: "Aesthetic Clinic" },
  { value: "cryotherapy", label: "Cryotherapy" },
  { value: "iv_therapy", label: "IV Therapy" },
  { value: "body_contouring", label: "Body Contouring" },
  { value: "hair_loss", label: "Hair Loss / Trichology" },
  { value: "henna", label: "Henna / Mehndi" },
];

// =============================================================================
// Validators
// =============================================================================

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

// Note: Form fields are always strings (even if empty), so don't use .optional()
const descriptionSchema = z
  .string()
  .max(500, "Description cannot exceed 500 characters");

// =============================================================================
// Component
// =============================================================================

export function GeneralInfoForm({
  organization,
  onSuccess,
}: GeneralInfoFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const updateOrganization = useMutation(api.organizations.update);
  const updateSalonType = useMutation(api.organizations.updateSalonType);

  const form = useForm({
    defaultValues: {
      name: organization.name,
      description: organization.description ?? "",
      salonType: organization.salonType ?? ([] as OrgSalonType[]),
    },
    onSubmit: async ({ value }) => {
      try {
        await updateOrganization({
          organizationId: organization._id,
          name: value.name,
          description: value.description || undefined,
        });

        if (value.salonType.length > 0) {
          await updateSalonType({
            organizationId: organization._id,
            salonType: value.salonType,
          });
        }

        toast.success("Settings saved");
        setIsEditing(false);
        onSuccess?.();
      } catch {
        toast.error("Failed to save settings");
      }
    },
  });

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const currentLabels =
    organization.salonType
      ?.map((t) => SALON_TYPE_OPTIONS.find((o) => o.value === t)?.label)
      .filter(Boolean) ?? [];

  if (!isEditing) {
    return (
      <div className="space-y-6">
        {/* Logo */}
        <div>
          <div className="text-sm font-medium text-muted-foreground">Logo</div>
          <div className="mt-2">
            <LogoUpload
              organizationId={organization._id}
              currentLogo={organization.logo}
            />
          </div>
        </div>

        {/* Name */}
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Salon Name
          </div>
          <p className="mt-1 text-sm font-medium">{organization.name}</p>
        </div>

        {/* Description */}
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Description
          </div>
          <p className="mt-1 text-sm">
            {organization.description || (
              <span className="text-muted-foreground italic">
                No description
              </span>
            )}
          </p>
        </div>

        {/* Salon Type */}
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Salon Type
          </div>
          <div className="mt-1">
            {currentLabels.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {currentLabels.map((label) => (
                  <Badge key={label} variant="secondary">
                    {label}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground italic">
                Not set — required for AI features
              </span>
            )}
          </div>
        </div>

        {/* URL Slug (read-only) */}
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            URL Slug
          </div>
          <p className="mt-1 text-sm font-mono">/{organization.slug}</p>
        </div>

        <Button variant="outline" onClick={() => setIsEditing(true)}>
          Edit Information
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
        {/* Logo */}
        <div>
          <div className="text-sm font-medium">Logo</div>
          <div className="mt-2">
            <LogoUpload
              organizationId={organization._id}
              currentLogo={organization.logo}
            />
          </div>
        </div>

        {/* Name */}
        <form.Field
          name="name"
          validators={{
            onBlur: nameSchema,
            onSubmit: nameSchema,
          }}
        >
          {(field) => {
            const hasError =
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
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
                  aria-invalid={hasError}
                />
                {hasError && <FieldError errors={field.state.meta.errors} />}
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
              field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <Field data-invalid={hasError || undefined}>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={form.state.isSubmitting}
                  aria-invalid={hasError}
                  rows={3}
                  placeholder="Describe your salon..."
                />
                {hasError && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        {/* Salon Type — multi-select */}
        <form.Field name="salonType">
          {(field) => (
            <Field>
              <FieldLabel>Salon Type</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {SALON_TYPE_OPTIONS.map((opt) => (
                  <Toggle
                    key={opt.value}
                    variant="outline"
                    pressed={field.state.value.includes(opt.value)}
                    onPressedChange={(pressed) => {
                      if (pressed) {
                        field.handleChange([...field.state.value, opt.value]);
                      } else {
                        field.handleChange(
                          field.state.value.filter((t) => t !== opt.value),
                        );
                      }
                    }}
                    disabled={form.state.isSubmitting}
                    className="px-4"
                  >
                    {opt.label}
                  </Toggle>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select all types that apply. Required for AI features.
              </p>
            </Field>
          )}
        </form.Field>

        {/* URL Slug (read-only) */}
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            URL Slug
          </div>
          <p className="mt-1 text-sm font-mono text-muted-foreground">
            /{organization.slug}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            URL slug cannot be changed
          </p>
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
