"use client";

import {
  BottomNav,
  CompletionOverlay,
  LeftPanel,
  MobileStepIndicator,
  PricingBanner,
  StepBasics,
  StepContact,
  StepHeading,
  StepHours,
  TopNav,
  useOnboardingForm,
} from "@/modules/org-onboarding";

export default function OnboardingPage() {
  const form = useOnboardingForm();

  const stepAnimationClass =
    form.direction === "forward"
      ? "onboarding-step-forward"
      : "onboarding-step-back";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel (desktop) */}
      <LeftPanel
        currentStep={form.step}
        onStepClick={form.handleStepClick}
        formData={form.formData}
        logoPreview={form.logoPreview}
        hoursSummary={form.hoursSummary}
      />

      {/* Right Panel */}
      <div className="flex-1 min-h-screen flex flex-col overflow-y-auto">
        <TopNav />
        <MobileStepIndicator currentStep={form.step} />

        {/* Form Content */}
        <div className="flex-1 px-6 sm:px-10 lg:px-14 xl:px-20 py-10 flex justify-center">
          <div className="w-full max-w-[600px]">
            <PricingBanner />
            <StepHeading
              currentStep={form.step}
              subtitle={
                form.step === 1
                  ? `${form.contactFieldsCount} of 6 details added`
                  : undefined
              }
            />

            <div key={form.step} className={stepAnimationClass}>
              {form.step === 0 && (
                <StepBasics
                  data={form.formData}
                  onChange={form.updateFormData}
                  slugAvailability={form.slugAvailability}
                  debouncedSlug={form.debouncedSlug}
                  updateDebouncedSlug={form.updateDebouncedSlug}
                  slugEdited={form.slugEdited}
                  setSlugEdited={form.setSlugEdited}
                  logoPreview={form.logoPreview}
                  onLogoSelect={form.handleLogoSelect}
                  onLogoRemove={form.handleLogoRemove}
                />
              )}
              {form.step === 1 && (
                <StepContact
                  data={form.formData}
                  onChange={form.updateFormData}
                  onPrefillEmail={form.prefillEmail}
                />
              )}
              {form.step === 2 && (
                <StepHours
                  data={form.formData}
                  onChange={form.updateFormData}
                  hoursSummary={form.hoursSummary}
                />
              )}
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav
          step={form.step}
          isCreating={form.isCreating}
          canContinue={
            form.step === 0 ? form.isStep1Valid() : form.isStep2Valid()
          }
          onBack={form.handleBack}
          onNext={form.handleNext}
          onCreate={form.handleCreateSalon}
        />
      </div>

      {/* Completion Overlay */}
      {form.isComplete && (
        <CompletionOverlay
          salonName={form.formData.name}
          slug={form.createdSlug}
        />
      )}
    </div>
  );
}
