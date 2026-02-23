export function MobileStepIndicator({
  currentStep,
  totalSteps = 3,
}: {
  currentStep: number;
  totalSteps?: number;
}) {
  return (
    <div className="flex lg:hidden items-center justify-center gap-2 py-3 border-b border-border">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === currentStep
              ? "w-6 bg-brand"
              : i < currentStep
                ? "w-1.5 bg-brand/50"
                : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  );
}
