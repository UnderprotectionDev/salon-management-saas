"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getConvexErrorMessage } from "@/lib/convex-error";
import { api } from "../../../../convex/_generated/api";
import type { AvatarConfig } from "../lib/avatar";

export type WizardFormData = {
  gender: string | null;
  avatarConfig: AvatarConfig | null;
  dateOfBirth: string | null;
  phone: string;
  allergies: string[];
  allergyNotes: string;
  emailReminders: boolean;
  marketingEmails: boolean;
  marketingConsent: boolean;
};

export type StepDirection = "forward" | "back";

const TOTAL_STEPS = 3;

const DEFAULT_FORM_DATA: WizardFormData = {
  gender: null,
  avatarConfig: null,
  dateOfBirth: null,
  phone: "",
  allergies: [],
  allergyNotes: "",
  emailReminders: true,
  marketingEmails: false,
  marketingConsent: false,
};

export function useUserOnboardingForm() {
  const { isAuthenticated } = useConvexAuth();
  const userProfile = useQuery(
    api.userProfile.get,
    isAuthenticated ? {} : "skip",
  );
  const updateProfile = useMutation(api.userProfile.updateProfile);
  const completeOnboarding = useMutation(api.userProfile.completeOnboarding);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<StepDirection>("forward");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [formData, setFormData] = useState<WizardFormData>(DEFAULT_FORM_DATA);

  // Sync form data when profile first loads (runs only once)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (userProfile && !initializedRef.current) {
      initializedRef.current = true;
      setFormData({
        gender: userProfile.gender ?? null,
        avatarConfig: (userProfile.avatarConfig as AvatarConfig | null) ?? null,
        dateOfBirth: userProfile.dateOfBirth ?? null,
        phone: userProfile.phone ?? "",
        allergies: userProfile.allergies ?? [],
        allergyNotes: userProfile.allergyNotes ?? "",
        emailReminders: userProfile.emailReminders ?? true,
        marketingEmails: userProfile.marketingEmails ?? false,
        marketingConsent: userProfile.marketingConsent ?? false,
      });
    }
  }, [userProfile]);

  const updateFormData = (patch: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection("forward");
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection("back");
      setStep((s) => s - 1);
    }
  };

  const goToStep = (target: number) => {
    if (target >= 0 && target < TOTAL_STEPS && target !== step) {
      setDirection(target > step ? "forward" : "back");
      setStep(target);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        gender:
          (formData.gender as "male" | "female" | "unspecified") || undefined,
        avatarConfig: formData.avatarConfig || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        phone: formData.phone || undefined,
        allergies:
          formData.allergies.length > 0 ? formData.allergies : undefined,
        allergyNotes: formData.allergyNotes || undefined,
        emailReminders: formData.emailReminders,
        marketingEmails: formData.marketingEmails,
        marketingConsent: formData.marketingConsent,
      });
      await completeOnboarding({});
      setIsSubmitting(false);
      setIsComplete(true);
    } catch (error: unknown) {
      toast.error(getConvexErrorMessage(error, "Something went wrong. Please try again."));
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (step < TOTAL_STEPS - 1) {
      handleNext();
    } else {
      handleComplete();
    }
  };

  return {
    step,
    direction,
    formData,
    updateFormData,
    isSubmitting,
    isComplete,
    handleNext,
    handleBack,
    handleContinue,
    goToStep,
    userProfile,
  };
}
