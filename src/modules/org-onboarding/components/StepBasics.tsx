"use client";

import { Check, ImagePlus, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WizardFormData } from "../hooks/useOnboardingForm";
import {
  ONBOARDING_INPUT,
  SALON_TYPE_OPTIONS,
  type OrgSalonType,
} from "../lib/constants";
import { slugify } from "../lib/utils";
import { nameSchema, slugSchema } from "../lib/validators";
import { SectionDivider } from "./SectionDivider";

export function StepBasics({
  data,
  onChange,
  slugAvailability,
  debouncedSlug,
  updateDebouncedSlug,
  slugEdited,
  setSlugEdited,
  logoPreview,
  onLogoSelect,
  onLogoRemove,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  slugAvailability: { available: boolean } | undefined;
  debouncedSlug: string;
  updateDebouncedSlug: (slug: string) => void;
  slugEdited: boolean;
  setSlugEdited: (v: boolean) => void;
  logoPreview: string | null;
  onLogoSelect: (file: File) => void;
  onLogoRemove: () => void;
}) {
  const [nameTouched, setNameTouched] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [typeTouched, setTypeTouched] = useState(false);

  const nameResult = nameSchema.safeParse(data.name);
  const nameError =
    nameTouched && !nameResult.success
      ? nameResult.error.issues[0]?.message
      : null;
  const nameValid = nameResult.success && data.name.length > 0;

  const slugResult = slugSchema.safeParse(data.slug);
  const slugError =
    slugTouched && !slugResult.success
      ? slugResult.error.issues[0]?.message
      : null;

  const typeError =
    typeTouched && data.salonType.length === 0
      ? "Please select at least one salon type"
      : null;

  const showAvailability = data.slug.length >= 2 && !slugError;

  // Section completion checks
  const identityComplete =
    nameResult.success &&
    slugResult.success &&
    data.salonType.length > 0 &&
    (slugAvailability === undefined || slugAvailability.available);

  return (
    <div className="space-y-8">
      <SectionDivider
        title="Identity"
        badge="REQUIRED"
        complete={identityComplete}
      />

      {/* Salon Name */}
      <Field data-invalid={nameError ? true : undefined}>
        <FieldLabel htmlFor="name">Salon Name</FieldLabel>
        <div className="relative">
          <Input
            id="name"
            placeholder="e.g., Elite Hair Studio"
            value={data.name}
            autoFocus
            onBlur={() => setNameTouched(true)}
            onChange={(e) => {
              const value = e.target.value;
              if (!slugEdited) {
                const newSlug = slugify(value);
                onChange({ name: value, slug: newSlug });
                updateDebouncedSlug(newSlug);
              } else {
                onChange({ name: value });
              }
            }}
            className={ONBOARDING_INPUT}
          />
          {nameValid && (
            <Check className="absolute right-0 top-1/2 -translate-y-1/2 size-4 text-green-600 animate-[scale-in_0.2s_ease-out]" />
          )}
        </div>
        {nameError && <FieldError errors={[{ message: nameError }]} />}
      </Field>

      {/* URL Slug */}
      <Field data-invalid={slugError ? true : undefined}>
        <FieldLabel htmlFor="slug">Booking URL</FieldLabel>
        <div className="flex items-center border-0 border-b border-border h-12 focus-within:border-brand transition-colors">
          <span className="text-sm text-muted-foreground whitespace-nowrap select-none">
            yoursite.com/
          </span>
          <Input
            id="slug"
            placeholder="elite-hair-studio"
            value={data.slug}
            onBlur={() => setSlugTouched(true)}
            onChange={(e) => {
              const newSlug = slugify(e.target.value);
              onChange({ slug: newSlug });
              setSlugEdited(true);
              updateDebouncedSlug(newSlug);
            }}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 rounded-none px-0 h-full"
          />
        </div>
        {showAvailability && (
          <div
            className="flex items-center gap-1.5 text-xs mt-1.5"
            aria-live="polite"
          >
            {debouncedSlug !== data.slug || slugAvailability === undefined ? (
              <Loader2 className="size-3 animate-spin text-muted-foreground" />
            ) : slugAvailability.available ? (
              <>
                <Check className="size-3 text-green-600" />
                <span className="text-green-600">Available</span>
              </>
            ) : (
              <>
                <X className="size-3 text-destructive" />
                <span className="text-destructive">Already taken</span>
              </>
            )}
          </div>
        )}
        {slugError && <FieldError errors={[{ message: slugError }]} />}
        {/* Slug URL preview */}
        {data.slug.length > 0 && !slugError && (
          <div className="mt-2 px-3 py-2 bg-muted/30 rounded text-xs text-muted-foreground">
            Customers will book at:{" "}
            <span className="font-mono font-medium text-foreground/70">
              yoursite.com/{data.slug}
            </span>
          </div>
        )}
      </Field>

      {/* Salon Type — 2x3 grid */}
      <Field data-invalid={typeError ? true : undefined}>
        <FieldLabel>Salon Type</FieldLabel>
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2"
          role="group"
          aria-label="Salon type selection"
        >
          {SALON_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = data.salonType.includes(opt.value);
            return (
              <button
                type="button"
                key={opt.value}
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => {
                  setTypeTouched(true);
                  if (isSelected) {
                    onChange({
                      salonType: data.salonType.filter(
                        (t: OrgSalonType) => t !== opt.value,
                      ),
                    });
                  } else {
                    onChange({
                      salonType: [...data.salonType, opt.value],
                    });
                  }
                }}
                className={`flex flex-col items-center gap-2 py-4 px-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-border hover:border-brand/40 hover:bg-muted/30"
                }`}
              >
                <Icon
                  className={`size-5 ${isSelected ? "text-brand" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-xs font-semibold tracking-wide uppercase ${
                    isSelected ? "text-brand" : "text-foreground"
                  }`}
                >
                  {opt.label}
                </span>
                {isSelected && (
                  <Check className="size-3 text-brand animate-[scale-in_0.2s_ease-out]" />
                )}
              </button>
            );
          })}
        </div>
        <FieldDescription>Select all that apply</FieldDescription>
        {typeError && <FieldError errors={[{ message: typeError }]} />}
      </Field>

      {/* Logo Upload */}
      <SectionDivider title="Logo" badge="OPTIONAL" />

      <div className="flex items-start gap-5">
        {logoPreview ? (
          <div className="relative size-[128px] shrink-0">
            <img
              src={logoPreview}
              alt="Logo preview"
              className="size-full object-cover rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={onLogoRemove}
              className="absolute -top-2 -right-2 size-6 bg-foreground text-background rounded-full flex items-center justify-center hover:bg-foreground/80 transition-colors"
            >
              <X className="size-3" />
            </button>
          </div>
        ) : (
          <label className="size-[128px] shrink-0 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand hover:bg-muted/30 transition-colors">
            <ImagePlus className="size-6 text-muted-foreground" />
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Upload
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 2 * 1024 * 1024) {
                    toast.error("Logo must be under 2 MB");
                    return;
                  }
                  onLogoSelect(file);
                }
                e.target.value = "";
              }}
            />
          </label>
        )}
        <div className="text-xs text-muted-foreground pt-2 space-y-1">
          <p>Square image recommended</p>
          <p>JPG, PNG, or WebP, max 2 MB</p>
        </div>
      </div>

      {/* Description */}
      <SectionDivider title="About" badge="OPTIONAL" />

      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          placeholder="Tell customers about your salon..."
          value={data.description}
          onChange={(e) =>
            onChange({ description: e.target.value.slice(0, 500) })
          }
          rows={3}
          className="border-0 border-b border-border rounded-none bg-transparent shadow-none px-0 text-base focus-visible:ring-0 focus-visible:border-brand resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-muted-foreground/60">
            Mention your specialties, experience, or what makes your salon
            unique.
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 ml-4">
            {data.description.length}/500
          </span>
        </div>
      </Field>
    </div>
  );
}
