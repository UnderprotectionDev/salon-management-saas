"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BottomNav({
  step,
  totalSteps,
  isSubmitting,
  canContinue,
  onBack,
  onContinue,
}: {
  step: number;
  totalSteps: number;
  isSubmitting: boolean;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const isLastStep = step === totalSteps - 1;

  return (
    <div className="sticky bottom-0 bg-background z-10 border-t border-border px-6 sm:px-10 lg:px-14 xl:px-20 py-5 flex items-center justify-between">
      {step > 0 ? (
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="text-[11px] font-semibold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          BACK
        </button>
      ) : (
        <span />
      )}

      <Button
        type="button"
        onClick={onContinue}
        disabled={!canContinue || isSubmitting}
        size="lg"
        className="px-8 text-[11px] font-bold tracking-[0.15em] uppercase gap-2 bg-brand hover:bg-brand/90 text-brand-foreground"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            SAVING...
          </>
        ) : (
          <>
            {isLastStep ? "COMPLETE" : "CONTINUE"}
            <ArrowRight className="size-3.5" />
          </>
        )}
      </Button>
    </div>
  );
}
