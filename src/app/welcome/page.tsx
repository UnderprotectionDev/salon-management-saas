"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  MobileStepIndicator,
  StepHeading,
  TopNav,
} from "@/modules/org-onboarding";
import {
  BottomNav,
  CompletionOverlay,
  LeftPanel,
  STEPS,
  useUserOnboardingForm,
} from "@/modules/user-onboarding";
import { StepAboutYou } from "@/modules/user-onboarding/components/StepAboutYou";
import { StepNotifications } from "@/modules/user-onboarding/components/StepNotifications";
import { StepSafety } from "@/modules/user-onboarding/components/StepSafety";
import { api } from "../../../convex/_generated/api";

export default function WelcomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const form = useUserOnboardingForm();
  const acceptConsent = useMutation(api.userProfile.acceptConsent);

  // Auto-create user profile if it doesn't exist yet
  // (mirrors dashboard behavior — handles direct /welcome navigation)
  useEffect(() => {
    if (form.userProfile === null && user) {
      acceptConsent({}).catch((error) => {
        console.error("Failed to create user profile:", error);
      });
    }
  }, [form.userProfile, user, acceptConsent]);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [authLoading, isAuthenticated, router]);

  // Onboarding guard: already completed → go to dashboard
  useEffect(() => {
    if (form.userProfile?.onboardingCompleted) {
      router.replace("/dashboard");
    }
  }, [form.userProfile, router]);

  // Loading state — also wait for profile to be created (null → acceptConsent on dashboard)
  if (
    authLoading ||
    user === undefined ||
    form.userProfile === undefined ||
    form.userProfile === null
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || user === null) {
    return null;
  }

  // Already completed
  if (form.userProfile.onboardingCompleted) {
    return null;
  }

  const stepAnimationClass =
    form.direction === "forward"
      ? "onboarding-step-forward"
      : "onboarding-step-back";

  // Determine canContinue per step
  const canContinue = (() => {
    switch (form.step) {
      case 0:
        // Always continuable (all optional), but if phone entered it must be valid
        if (form.formData.phone) {
          const phoneDigits = form.formData.phone
            .replace("+90 ", "")
            .replace(/\s/g, "");
          return phoneDigits.length === 0 || phoneDigits.length === 10;
        }
        return true;
      case 1:
        return true;
      case 2:
        // If marketing emails enabled, consent must be checked
        if (form.formData.marketingEmails && !form.formData.marketingConsent) {
          return false;
        }
        return true;
      default:
        return true;
    }
  })();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel (desktop) */}
      <LeftPanel
        currentStep={form.step}
        onStepClick={(s) => form.goToStep(s)}
        formData={form.formData}
        user={user}
      />

      {/* Right Panel */}
      <div className="flex-1 min-h-screen flex flex-col overflow-y-auto">
        <TopNav />
        <MobileStepIndicator
          currentStep={form.step}
          totalSteps={STEPS.length}
        />

        {/* Form Content */}
        <div className="flex-1 px-6 sm:px-10 lg:px-14 xl:px-20 py-10 flex justify-center">
          <div className="w-full max-w-[600px]">
            <StepHeading currentStep={form.step} steps={STEPS} />

            <div key={form.step} className={stepAnimationClass}>
              {form.step === 0 && (
                <StepAboutYou
                  data={form.formData}
                  onChange={form.updateFormData}
                />
              )}
              {form.step === 1 && (
                <StepSafety
                  data={form.formData}
                  onChange={form.updateFormData}
                />
              )}
              {form.step === 2 && (
                <StepNotifications
                  data={form.formData}
                  onChange={form.updateFormData}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav
          step={form.step}
          totalSteps={STEPS.length}
          isSubmitting={form.isSubmitting}
          canContinue={canContinue}
          onBack={form.handleBack}
          onContinue={form.handleContinue}
        />
      </div>

      {/* Completion Overlay */}
      {form.isComplete && <CompletionOverlay userName={user.name} />}
    </div>
  );
}
