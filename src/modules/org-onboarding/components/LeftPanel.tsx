import { Check } from "lucide-react";
import type { WizardFormData } from "../hooks/useOnboardingForm";
import { STEPS } from "../lib/constants";
import { SalonPreviewCard } from "./SalonPreviewCard";

export function LeftPanel({
  currentStep,
  onStepClick,
  formData,
  logoPreview,
  hoursSummary,
}: {
  currentStep: number;
  onStepClick: (step: number) => void;
  formData: WizardFormData;
  logoPreview: string | null;
  hoursSummary: string;
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
                  ? "bg-brand text-brand-foreground"
                  : isCompleted
                    ? "text-background/60 hover:text-background/80 hover:bg-background/5 cursor-pointer"
                    : "cursor-not-allowed"
              }`}
            >
              <span className="flex items-center gap-3 flex-1">
                {isCompleted && <Check className="size-4 text-brand/70" />}
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

      {/* Live Preview Card */}
      <div className="flex-1 flex flex-col justify-center py-6">
        <SalonPreviewCard
          data={formData}
          logoPreview={logoPreview}
          hoursSummary={hoursSummary}
        />
      </div>

      {/* Footer */}
      <div className="px-8 py-6 border-t border-background/10">
        <div className="text-xs font-bold uppercase tracking-wide text-background/25">
          NEED HELP? SUPPORT@SALON.APP
        </div>
      </div>
    </div>
  );
}
