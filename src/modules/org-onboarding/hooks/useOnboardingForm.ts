"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { BusinessHours } from "@/components/business-hours/BusinessHoursEditor";
import { getDefaultBusinessHours } from "@/components/business-hours/BusinessHoursEditor";
import { useOrganizations } from "@/modules/organization";
import type { OrgSalonType } from "../lib/constants";
import { computeHoursSummary, slugify } from "../lib/utils";
import {
  emailSchema,
  nameSchema,
  salonTypeSchema,
  slugSchema,
} from "../lib/validators";
import { useLogoUpload } from "./useLogoUpload";
import { useSalonCreation } from "./useSalonCreation";
import { useSlugAvailability } from "./useSlugAvailability";

export type WizardFormData = {
  name: string;
  slug: string;
  salonType: OrgSalonType[];
  description: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  neighbourhood: string;
  street: string;
  postalCode: string;
  businessHours: BusinessHours;
};

export type StepDirection = "forward" | "back";

const initialFormData: WizardFormData = {
  name: "",
  slug: "",
  salonType: [],
  description: "",
  email: "",
  phone: "",
  city: "",
  district: "",
  neighbourhood: "",
  street: "",
  postalCode: "",
  businessHours: getDefaultBusinessHours(),
};

export function useOnboardingForm() {
  const router = useRouter();
  const organizations = useOrganizations();

  useEffect(() => {
    if (organizations && organizations.length > 0) {
      router.replace(`/${organizations[0].slug}/dashboard`);
    }
  }, [organizations, router]);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<StepDirection>("forward");
  const [formData, setFormData] = useState<WizardFormData>(initialFormData);
  const [slugEdited, setSlugEdited] = useState(false);

  const slugAvailability = useSlugAvailability();
  const logoUpload = useLogoUpload();
  const salonCreation = useSalonCreation();

  const updateFormData = (patch: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const isStep1Valid = () =>
    nameSchema.safeParse(formData.name).success &&
    slugSchema.safeParse(formData.slug).success &&
    salonTypeSchema.safeParse(formData.salonType).success &&
    (slugAvailability.slugAvailability === undefined ||
      slugAvailability.slugAvailability.available);

  const isStep2Valid = () =>
    !formData.email || emailSchema.safeParse(formData.email).success;

  const handleNext = () => {
    if (step === 0 && !isStep1Valid()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (step === 1 && !isStep2Valid()) {
      toast.error("Please enter a valid email address");
      return;
    }
    setDirection("forward");
    setStep((s) => Math.min(s + 1, 2));
  };

  const handleBack = () => {
    setDirection("back");
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep < step) {
      setDirection("back");
      setStep(targetStep);
    }
  };

  const prefillEmail = (email: string) => {
    if (!formData.email) {
      setFormData((prev) => ({ ...prev, email }));
    }
  };

  const contactFieldsCount = [
    formData.email,
    formData.phone,
    formData.city,
    formData.district,
    formData.neighbourhood,
    formData.street,
    formData.postalCode,
  ].filter(Boolean).length;

  return {
    // Step navigation
    step,
    direction,
    handleNext,
    handleBack,
    handleStepClick,
    isStep1Valid,
    isStep2Valid,
    // Form data
    formData,
    updateFormData,
    prefillEmail,
    slugEdited,
    setSlugEdited,
    contactFieldsCount,
    hoursSummary: computeHoursSummary(formData.businessHours),
    slugify,
    // Slug availability
    debouncedSlug: slugAvailability.debouncedSlug,
    slugAvailability: slugAvailability.slugAvailability,
    updateDebouncedSlug: slugAvailability.updateDebouncedSlug,
    // Logo upload
    logoFile: logoUpload.logoFile,
    logoPreview: logoUpload.logoPreview,
    handleLogoSelect: logoUpload.handleLogoSelect,
    handleLogoRemove: logoUpload.handleLogoRemove,
    // Salon creation
    isCreating: salonCreation.isCreating,
    isComplete: salonCreation.isComplete,
    createdSlug: salonCreation.createdSlug,
    handleCreateSalon: () =>
      salonCreation.handleCreateSalon(formData, logoUpload.logoFile),
  };
}
