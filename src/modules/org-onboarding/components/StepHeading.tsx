import { STEPS } from "../lib/constants";

type StepDef = { number: string; title: string; description: string };

export function StepHeading({
  currentStep,
  subtitle,
  steps,
}: {
  currentStep: number;
  subtitle?: string;
  steps?: readonly StepDef[];
}) {
  const resolvedSteps = steps && steps.length > 0 ? steps : STEPS;
  const totalSteps = resolvedSteps.length;
  const safeStep = Math.max(0, Math.min(currentStep, totalSteps - 1));
  const meta = resolvedSteps[safeStep];
  const progressPercent = ((safeStep + 1) / totalSteps) * 100;

  return (
    <div className="mb-10" aria-live="polite">
      <div className="text-xs font-bold tracking-[0.15em] text-muted-foreground mb-3">
        STEP {meta.number} OF {String(totalSteps).padStart(2, "0")}
      </div>
      <h1 className="text-5xl sm:text-6xl font-black uppercase tracking-tight leading-[0.9]">
        {meta.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-[460px]">
        {meta.description}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground/70">{subtitle}</p>
      )}
      {/* Continuous progress bar */}
      <div
        className="mt-6 h-0.5 bg-border overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-brand transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
