"use client";

import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Check,
  Flower2,
  ImagePlus,
  Loader2,
  LogOut,
  Paintbrush,
  Palette,
  Scissors,
  ScissorsLineDashed,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  type BusinessHours,
  BusinessHoursEditor,
  getDefaultBusinessHours,
} from "@/components/business-hours/BusinessHoursEditor";
import { PhoneInput } from "@/components/reui/phone-input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { CITY_NAMES, getDistricts } from "@/lib/data/turkey-cities";
import { authClient } from "@/lib/auth-client";
import { useOrganizations } from "@/modules/organization";
import { api } from "../../../convex/_generated/api";

// =============================================================================
// Types & Constants
// =============================================================================

type OrgSalonType = "hair" | "nail" | "makeup" | "barber" | "spa";

const SALON_TYPE_OPTIONS: {
  value: OrgSalonType;
  label: string;
  icon: typeof Scissors;
}[] = [
  { value: "hair", label: "Hair Salon", icon: Scissors },
  { value: "nail", label: "Nail Salon", icon: Paintbrush },
  { value: "makeup", label: "Makeup", icon: Palette },
  { value: "barber", label: "Barber", icon: ScissorsLineDashed },
  { value: "spa", label: "Spa", icon: Flower2 },
];

const STEPS = [
  {
    number: "01",
    label: "SALON DETAILS",
    title: "DEFINE\nYOUR\nSALON",
    description:
      "Create your salon workspace. This sets up your brand identity, booking URL, and service categories.",
    required: true,
  },
  {
    number: "02",
    label: "LOCATION",
    title: "WHERE\nTO FIND\nYOU",
    description:
      "Add your contact details and address so customers can reach and find you. All fields are optional.",
    required: false,
  },
  {
    number: "03",
    label: "SCHEDULE",
    title: "SET\nYOUR\nHOURS",
    description:
      "Configure your weekly business hours. This determines when customers can book appointments.",
    required: false,
  },
] as const;

const ONBOARDING_INPUT =
  "border-0 border-b border-border rounded-none bg-transparent shadow-none px-0 h-12 text-base focus-visible:ring-0 focus-visible:border-blue-600";

type WizardFormData = {
  name: string;
  slug: string;
  salonType: OrgSalonType[];
  description: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  postalCode: string;
  businessHours: BusinessHours;
};

const initialFormData: WizardFormData = {
  name: "",
  slug: "",
  salonType: [],
  description: "",
  email: "",
  phone: "",
  city: "",
  district: "",
  street: "",
  postalCode: "",
  businessHours: getDefaultBusinessHours(),
};

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

const salonTypeSchema = z
  .array(z.enum(["hair", "nail", "makeup", "barber", "spa"]))
  .min(1, "Please select at least one salon type");

const emailSchema = z.string().email("Please enter a valid email address");

// =============================================================================
// Left Panel — Navigation (Luaka Typography Scale)
// =============================================================================

function LeftPanel({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="hidden lg:flex w-[380px] xl:w-[420px] shrink-0 bg-foreground text-background flex-col select-none">
      {/* Brand Block */}
      <div className="px-8 py-8 border-b border-background/10">
        <div className="text-2xl font-black tracking-tight leading-tight">
          SALON
          <br />
          SETUP
        </div>
      </div>

      {/* Step Navigation */}
      <nav>
        {STEPS.map((s, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          const isFuture = i > currentStep;

          return (
            <button
              key={s.number}
              type="button"
              onClick={() => onStepClick(i)}
              disabled={isFuture}
              className={`flex items-center w-full px-8 py-5 border-b border-background/10 transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white"
                  : isCompleted
                    ? "text-background/60 hover:text-background/80 hover:bg-background/5 cursor-pointer"
                    : "cursor-not-allowed"
              }`}
            >
              <span className="flex items-center gap-3 flex-1">
                {isCompleted && <Check className="size-4 text-blue-400" />}
                <span
                  className={`text-xl font-bold uppercase tracking-wide ${
                    isCompleted ? "line-through" : ""
                  } ${isFuture ? "onboarding-stroke-text" : ""}`}
                >
                  {s.label}
                </span>
              </span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  isActive
                    ? "text-white/60"
                    : isCompleted
                      ? "text-background/30"
                      : isFuture
                        ? "onboarding-stroke-text-dim"
                        : ""
                }`}
              >
                {s.number}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer */}
      <div className="px-8 py-6 border-t border-background/10">
        <div className="text-xs font-bold uppercase tracking-wide text-background/25">
          NEED HELP? SUPPORT@SALON.APP
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Top Nav Bar (right panel)
// =============================================================================

function TopNav() {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  return (
    <div className="border-b border-border flex justify-end">
      <button
        type="button"
        onClick={handleLogout}
        className="px-6 py-3 border-l border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-foreground hover:text-background transition-colors flex items-center gap-2"
      >
        LOGOUT
        <LogOut className="size-3" />
      </button>
    </div>
  );
}

// =============================================================================
// Inline Step Heading (right panel)
// =============================================================================

function StepHeading({ currentStep }: { currentStep: number }) {
  const meta = STEPS[currentStep];
  return (
    <div className="mb-10">
      <div className="text-xs font-bold tracking-[0.15em] text-muted-foreground mb-3">
        STEP {meta.number} OF 03
      </div>
      <h1 className="text-5xl sm:text-6xl font-black uppercase tracking-tight leading-[0.9]">
        {meta.title.replace(/\n/g, " ")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-[460px]">
        {meta.description}
      </p>
      {/* Progress bar */}
      <div className="flex gap-1 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-0.5 flex-1 transition-colors duration-300 ${
              i <= currentStep ? "bg-blue-600" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Section Divider (right panel)
// =============================================================================

function SectionDivider({
  title,
  badge,
}: {
  title: string;
  badge?: "REQUIRED" | "OPTIONAL";
}) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <h2 className="text-[11px] font-bold tracking-[0.2em] text-foreground/80 uppercase shrink-0">
        {title}
      </h2>
      <div className="flex-1 h-px bg-border" />
      {badge && (
        <span
          className={`text-[9px] font-bold tracking-[0.15em] uppercase shrink-0 px-2 py-0.5 ${
            badge === "REQUIRED"
              ? "bg-blue-600 text-white"
              : "text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Step 1: Salon Basics
// =============================================================================

function StepBasics({
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

  const nameError =
    nameTouched && !nameSchema.safeParse(data.name).success
      ? nameSchema.safeParse(data.name).error?.issues[0]?.message
      : null;

  const slugError =
    slugTouched && !slugSchema.safeParse(data.slug).success
      ? slugSchema.safeParse(data.slug).error?.issues[0]?.message
      : null;

  const typeError =
    typeTouched && data.salonType.length === 0
      ? "Please select at least one salon type"
      : null;

  const showAvailability = data.slug.length >= 2 && !slugError;

  return (
    <div className="space-y-8">
      <SectionDivider title="Identity" badge="REQUIRED" />

      {/* Salon Name — full width, underline input */}
      <Field data-invalid={nameError ? true : undefined}>
        <FieldLabel htmlFor="name">Salon Name</FieldLabel>
        <Input
          id="name"
          placeholder="e.g., Elite Hair Studio"
          value={data.name}
          autoFocus
          onBlur={() => setNameTouched(true)}
          onChange={(e) => {
            const value = e.target.value;
            onChange({ name: value });
            if (!slugEdited) {
              const newSlug = slugify(value);
              onChange({ name: value, slug: newSlug });
              updateDebouncedSlug(newSlug);
            }
          }}
          className={ONBOARDING_INPUT}
        />
        {nameError && <FieldError errors={[nameError]} />}
      </Field>

      {/* URL Slug — underline style */}
      <Field data-invalid={slugError ? true : undefined}>
        <FieldLabel htmlFor="slug">Booking URL</FieldLabel>
        <div className="flex items-center border-0 border-b border-border h-12 focus-within:border-blue-600 transition-colors">
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
          <div className="flex items-center gap-1.5 text-xs mt-1.5">
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
        {slugError && <FieldError errors={[slugError]} />}
      </Field>

      {/* Salon Type — full-width rows */}
      <Field data-invalid={typeError ? true : undefined}>
        <FieldLabel>Salon Type</FieldLabel>
        <div className="mt-1">
          {SALON_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = data.salonType.includes(opt.value);
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  setTypeTouched(true);
                  if (isSelected) {
                    onChange({
                      salonType: data.salonType.filter((t) => t !== opt.value),
                    });
                  } else {
                    onChange({
                      salonType: [...data.salonType, opt.value],
                    });
                  }
                }}
                className={`flex items-center gap-4 w-full py-4 border-b transition-all cursor-pointer ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 px-4 -mx-4"
                    : "border-border text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="size-5" />
                <span className="text-sm font-semibold tracking-[0.05em] uppercase flex-1 text-left">
                  {opt.label}
                </span>
                {isSelected && <Check className="size-4" />}
              </button>
            );
          })}
        </div>
        <FieldDescription>Select all that apply</FieldDescription>
        {typeError && <FieldError errors={[typeError]} />}
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
          <label className="size-[128px] shrink-0 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-600 hover:bg-muted/30 transition-colors">
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
          onChange={(e) => onChange({ description: e.target.value.slice(0, 500) })}
          rows={3}
          className="border-0 border-b border-border rounded-none bg-transparent shadow-none px-0 text-base focus-visible:ring-0 focus-visible:border-blue-600 resize-none"
        />
        <div className="text-[11px] text-muted-foreground text-right tabular-nums mt-1">
          {data.description.length}/500
        </div>
      </Field>
    </div>
  );
}

// =============================================================================
// Step 2: Contact & Location
// =============================================================================

function StepContact({
  data,
  onChange,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
}) {
  const districts = data.city ? getDistricts(data.city) : [];

  return (
    <div className="space-y-8">
      <SectionDivider title="Contact" badge="OPTIONAL" />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="hello@yoursalon.com"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className={ONBOARDING_INPUT}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="phone">Phone</FieldLabel>
          <PhoneInput
            defaultCountry="TR"
            value={data.phone as never}
            onChange={(value) => onChange({ phone: (value as string) || "" })}
            maxInputLength={10}
            placeholder="506 123 12 12"
          />
        </Field>
      </div>

      <SectionDivider title="Address" badge="OPTIONAL" />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field>
          <FieldLabel>City</FieldLabel>
          <SearchableSelect
            items={CITY_NAMES}
            value={data.city}
            onValueChange={(value) => onChange({ city: value, district: "" })}
            placeholder="Select city"
            searchPlaceholder="Search city..."
          />
        </Field>

        <Field>
          <FieldLabel>District</FieldLabel>
          <SearchableSelect
            items={districts}
            value={data.district}
            onValueChange={(value) => onChange({ district: value })}
            placeholder="Select district"
            searchPlaceholder="Search district..."
            disabled={!data.city}
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-[1fr_160px]">
        <Field>
          <FieldLabel htmlFor="street">Street Address</FieldLabel>
          <Input
            id="street"
            placeholder="123 Main Street, Floor 2"
            value={data.street}
            onChange={(e) => onChange({ street: e.target.value })}
            className={ONBOARDING_INPUT}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="postalCode">Postal Code</FieldLabel>
          <Input
            id="postalCode"
            placeholder="34000"
            value={data.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
            className={ONBOARDING_INPUT}
          />
        </Field>
      </div>
    </div>
  );
}

// =============================================================================
// Step 3: Business Hours
// =============================================================================

function StepHours({
  data,
  onChange,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
}) {
  return (
    <div>
      <SectionDivider title="Weekly Schedule" badge="OPTIONAL" />
      <BusinessHoursEditor
        value={data.businessHours}
        onChange={(hours) => onChange({ businessHours: hours })}
      />
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function OnboardingPage() {
  const router = useRouter();
  const organizations = useOrganizations();

  useEffect(() => {
    if (organizations && organizations.length > 0) {
      router.replace(`/${organizations[0].slug}/dashboard`);
    }
  }, [organizations, router]);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<WizardFormData>(initialFormData);
  const [isCreating, setIsCreating] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [debouncedSlug, setDebouncedSlug] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const createOrganization = useMutation(api.organizations.create);
  const updateSettings = useMutation(api.organizations.updateSettings);
  const updateSalonType = useMutation(api.organizations.updateSalonType);
  const updateOrg = useMutation(api.organizations.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveOrganizationLogo = useMutation(api.files.saveOrganizationLogo);

  const handleLogoSelect = (file: File) => {
    setLogoFile(file);
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  };

  const handleLogoRemove = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const slugAvailability = useQuery(
    api.organizations.checkSlugAvailability,
    debouncedSlug.length >= 2 ? { slug: debouncedSlug } : "skip",
  );

  const updateDebouncedSlug = (slug: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSlug(slug);
    }, 500);
  };

  const updateFormData = (patch: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const isStep1Valid = () => {
    return (
      nameSchema.safeParse(formData.name).success &&
      slugSchema.safeParse(formData.slug).success &&
      salonTypeSchema.safeParse(formData.salonType).success &&
      (slugAvailability === undefined || slugAvailability.available)
    );
  };

  const isStep2Valid = () => {
    if (formData.email && !emailSchema.safeParse(formData.email).success) {
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 0 && !isStep1Valid()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (step === 1 && !isStep2Valid()) {
      toast.error("Please enter a valid email address");
      return;
    }
    setStep((s) => Math.min(s + 1, 2));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep < step) setStep(targetStep);
  };

  const handleCreateSalon = async () => {
    setIsCreating(true);
    try {
      const result = await createOrganization({
        name: formData.name,
        slug: formData.slug,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      });

      const promises: Promise<unknown>[] = [];
      const hasAddress =
        formData.street ||
        formData.city ||
        formData.district ||
        formData.postalCode;

      promises.push(
        updateSettings({
          organizationId: result.organizationId,
          businessHours: formData.businessHours,
          ...(hasAddress
            ? {
                address: {
                  street: formData.street || undefined,
                  city: formData.city || undefined,
                  state: formData.district || undefined,
                  postalCode: formData.postalCode || undefined,
                  country: "Turkey",
                },
              }
            : {}),
        }),
      );

      if (formData.salonType.length > 0) {
        promises.push(
          updateSalonType({
            organizationId: result.organizationId,
            salonType: formData.salonType,
          }),
        );
      }

      if (formData.description) {
        promises.push(
          updateOrg({
            organizationId: result.organizationId,
            description: formData.description,
          }),
        );
      }

      if (logoFile) {
        promises.push(
          (async () => {
            const uploadUrl = await generateUploadUrl({});
            const res = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": logoFile.type },
              body: logoFile,
            });
            const { storageId } = await res.json();
            await saveOrganizationLogo({
              organizationId: result.organizationId,
              storageId,
              fileName: logoFile.name,
              fileType: logoFile.type,
              fileSize: logoFile.size,
            });
          })(),
        );
      }

      await Promise.all(promises);
      router.push(`/${result.slug}/dashboard?welcome=true`);
    } catch (error) {
      console.error("Failed to create salon:", error);
      const message =
        error instanceof Error ? error.message : "Failed to create salon";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel */}
      <LeftPanel currentStep={step} onStepClick={handleStepClick} />

      {/* Right Panel */}
      <div className="flex-1 min-h-screen flex flex-col overflow-y-auto">
        <TopNav />
        {/* Form Content */}
        <div className="flex-1 px-6 sm:px-10 lg:px-14 xl:px-20 py-10 flex justify-center">
          <div className="w-full max-w-[600px]">
            {/* Inline Step Heading */}
            <StepHeading currentStep={step} />
            {step === 0 && (
              <StepBasics
                data={formData}
                onChange={updateFormData}
                slugAvailability={slugAvailability}
                debouncedSlug={debouncedSlug}
                updateDebouncedSlug={updateDebouncedSlug}
                slugEdited={slugEdited}
                setSlugEdited={setSlugEdited}
                logoPreview={logoPreview}
                onLogoSelect={handleLogoSelect}
                onLogoRemove={handleLogoRemove}
              />
            )}
            {step === 1 && (
              <StepContact data={formData} onChange={updateFormData} />
            )}
            {step === 2 && (
              <StepHours data={formData} onChange={updateFormData} />
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-border px-6 sm:px-10 lg:px-14 xl:px-20 py-5 flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isCreating}
              className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              BACK
            </button>
          ) : (
            <span />
          )}

          {step < 2 ? (
            <Button
              onClick={handleNext}
              disabled={step === 0 && !isStep1Valid()}
              size="lg"
              className="px-8 text-[11px] font-bold tracking-[0.15em] uppercase gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              CONTINUE
              <ArrowRight className="size-3.5" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateSalon}
              disabled={isCreating}
              size="lg"
              className="px-8 text-[11px] font-bold tracking-[0.15em] uppercase gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  CREATING...
                </>
              ) : (
                <>
                  CREATE SALON
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
