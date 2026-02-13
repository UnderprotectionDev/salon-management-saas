"use client";

import { useMutation } from "convex/react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import {
  COMMON_ALLERGENS,
  GENDER_OPTIONS,
  HAIR_LENGTH_OPTIONS,
  HAIR_TYPE_OPTIONS,
  ONBOARDING_STEPS,
} from "../lib/constants";

type OnboardingWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProfile?: {
    gender?: string | null;
    dateOfBirth?: string | null;
    hairType?: string | null;
    hairLength?: string | null;
    allergies?: string[] | null;
    allergyNotes?: string | null;
  };
};

type WizardState = {
  gender: string | null;
  dateOfBirth: string | null;
  hairType: string | null;
  hairLength: string | null;
  allergies: string[];
  allergyNotes: string;
};

export function OnboardingWizard({
  open,
  onOpenChange,
  initialProfile,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateProfile = useMutation(api.userProfile.updateProfile);
  const completeOnboarding = useMutation(api.userProfile.completeOnboarding);

  const [state, setState] = useState<WizardState>({
    gender: initialProfile?.gender ?? null,
    dateOfBirth: initialProfile?.dateOfBirth ?? null,
    hairType: initialProfile?.hairType ?? null,
    hairLength: initialProfile?.hairLength ?? null,
    allergies: initialProfile?.allergies ?? [],
    allergyNotes: initialProfile?.allergyNotes ?? "",
  });

  const totalSteps = ONBOARDING_STEPS.length;
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = async () => {
    if (isLastStep) {
      await handleComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSkip = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        gender:
          (state.gender as "male" | "female" | "unspecified") ?? undefined,
        dateOfBirth: state.dateOfBirth ?? undefined,
        hairType:
          (state.hairType as "straight" | "wavy" | "curly" | "very_curly") ??
          undefined,
        hairLength:
          (state.hairLength as "short" | "medium" | "long" | "very_long") ??
          undefined,
        allergies: state.allergies.length > 0 ? state.allergies : undefined,
        allergyNotes: state.allergyNotes.trim() || undefined,
      });
      await completeOnboarding({});
      toast.success("Profile saved successfully!");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAllergen = (allergenId: string) => {
    setState((s) => ({
      ...s,
      allergies: s.allergies.includes(allergenId)
        ? s.allergies.filter((a) => a !== allergenId)
        : [...s.allergies, allergenId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{ONBOARDING_STEPS[currentStep].label}</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {totalSteps}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <Progress value={progressPercent} className="h-1.5" />

        {/* Step content */}
        <div className="min-h-[200px] py-2">
          {currentStep === 0 && (
            <GenderStep
              value={state.gender}
              onChange={(v) => setState((s) => ({ ...s, gender: v }))}
            />
          )}
          {currentStep === 1 && (
            <BirthdayStep
              value={state.dateOfBirth}
              onChange={(v) => setState((s) => ({ ...s, dateOfBirth: v }))}
            />
          )}
          {currentStep === 2 && (
            <HairAllergyStep
              hairType={state.hairType}
              hairLength={state.hairLength}
              allergies={state.allergies}
              allergyNotes={state.allergyNotes}
              onHairTypeChange={(v) => setState((s) => ({ ...s, hairType: v }))}
              onHairLengthChange={(v) =>
                setState((s) => ({ ...s, hairLength: v }))
              }
              onToggleAllergen={toggleAllergen}
              onAllergyNotesChange={(v) =>
                setState((s) => ({ ...s, allergyNotes: v }))
              }
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {currentStep > 0 ? (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="mr-1 size-3.5" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button size="sm" onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : isLastStep ? (
                <>
                  <Check className="mr-1 size-3.5" />
                  Complete
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="ml-1 size-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Step Components
// =============================================================================

function GenderStep({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select your gender to receive personalized service recommendations.
      </p>
      <div className="grid grid-cols-1 gap-2">
        {GENDER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
              value === option.id &&
                "border-primary bg-primary/5 ring-1 ring-primary",
            )}
          >
            <div
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                value === option.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30",
              )}
            >
              {value === option.id && <Check className="size-3" />}
            </div>
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BirthdayStep({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Birthday surprises await you!
      </p>
      <div className="space-y-2">
        <Label htmlFor="dob">Date of Birth</Label>
        <Input
          id="dob"
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          max={
            new Date(
              new Date().getFullYear() - 13,
              new Date().getMonth(),
              new Date().getDate(),
            )
              .toISOString()
              .split("T")[0]
          }
          min="1920-01-01"
          className="max-w-48"
        />
        <p className="text-xs text-muted-foreground">
          You must be at least 13 years old.
        </p>
      </div>
    </div>
  );
}

function HairAllergyStep({
  hairType,
  hairLength,
  allergies,
  allergyNotes,
  onHairTypeChange,
  onHairLengthChange,
  onToggleAllergen,
  onAllergyNotesChange,
}: {
  hairType: string | null;
  hairLength: string | null;
  allergies: string[];
  allergyNotes: string;
  onHairTypeChange: (v: string) => void;
  onHairLengthChange: (v: string) => void;
  onToggleAllergen: (v: string) => void;
  onAllergyNotesChange: (v: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Hair Type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Hair Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {HAIR_TYPE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onHairTypeChange(option.id)}
              className={cn(
                "rounded-lg border p-2.5 text-center text-sm transition-colors hover:bg-accent",
                hairType === option.id &&
                  "border-primary bg-primary/5 ring-1 ring-primary font-medium",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hair Length */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Hair Length</Label>
        <div className="grid grid-cols-2 gap-2">
          {HAIR_LENGTH_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onHairLengthChange(option.id)}
              className={cn(
                "rounded-lg border p-2.5 text-center text-sm transition-colors hover:bg-accent",
                hairLength === option.id &&
                  "border-primary bg-primary/5 ring-1 ring-primary font-medium",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" />
          <Label className="text-sm font-medium">
            Allergies / Sensitivities
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          For your safety - let the salon use products suitable for you.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {COMMON_ALLERGENS.map((allergen) => (
            <div key={allergen.id} className="flex items-center gap-2">
              <Checkbox
                id={`allergen-${allergen.id}`}
                checked={allergies.includes(allergen.id)}
                onCheckedChange={() => onToggleAllergen(allergen.id)}
              />
              <Label
                htmlFor={`allergen-${allergen.id}`}
                className="text-sm cursor-pointer"
              >
                {allergen.label}
              </Label>
            </div>
          ))}
        </div>
        <Textarea
          value={allergyNotes}
          onChange={(e) => onAllergyNotesChange(e.target.value)}
          placeholder="List any other sensitivities..."
          rows={2}
          className="mt-2"
        />
      </div>
    </div>
  );
}
