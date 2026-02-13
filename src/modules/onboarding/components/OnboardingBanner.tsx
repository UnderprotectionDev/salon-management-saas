"use client";

import { useMutation } from "convex/react";
import { ChevronRight, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { api } from "../../../../convex/_generated/api";
import { calculateOnboardingProgress } from "../lib/constants";

type OnboardingBannerProps = {
  profile: {
    gender?: string | null;
    dateOfBirth?: string | null;
    hairType?: string | null;
    phone?: string | null;
    onboardingCompleted: boolean;
    onboardingDismissedAt?: number | null;
  };
  onStartWizard: () => void;
};

export function OnboardingBanner({
  profile,
  onStartWizard,
}: OnboardingBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const dismissOnboarding = useMutation(api.userProfile.dismissOnboarding);

  // Don't show if completed, dismissed locally, or dismissed in DB
  if (
    profile.onboardingCompleted ||
    isDismissed ||
    profile.onboardingDismissedAt
  ) {
    return null;
  }

  const progress = calculateOnboardingProgress(profile);

  // If progress is 100%, don't show banner
  if (progress === 100) return null;

  const handleDismiss = async () => {
    setIsDismissed(true);
    try {
      await dismissOnboarding({});
    } catch {
      // Silent fail - banner already hidden locally
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4">
      <div className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">
            Complete your profile for a personalized experience!
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Booking appointments will be much faster once you complete your
            info.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Progress value={progress} className="h-1.5 flex-1 max-w-48" />
            <span className="text-xs font-medium text-muted-foreground">
              %{progress}
            </span>
          </div>
        </div>

        <Button size="sm" onClick={onStartWizard} className="shrink-0">
          Complete
          <ChevronRight className="ml-1 size-3.5" />
        </Button>
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
