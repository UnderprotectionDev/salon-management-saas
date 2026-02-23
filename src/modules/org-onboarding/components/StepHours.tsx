"use client";

import { Clock, Info } from "lucide-react";
import {
  BusinessHoursEditor,
  type BusinessHours,
} from "@/components/business-hours/BusinessHoursEditor";
import type { WizardFormData } from "../hooks/useOnboardingForm";
import { HOUR_PRESETS } from "../lib/constants";
import { SectionDivider } from "./SectionDivider";

export function StepHours({
  data,
  onChange,
  hoursSummary,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  hoursSummary: string;
}) {
  const applyPreset = (hours: BusinessHours) => {
    onChange({ businessHours: hours });
  };

  return (
    <div className="space-y-6">
      <SectionDivider title="Quick Templates" badge="OPTIONAL" />

      {/* Preset buttons */}
      <div className="grid grid-cols-3 gap-2">
        {HOUR_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.hours)}
            className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border border-border hover:border-brand/40 hover:bg-muted/30 transition-all"
          >
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wide">
              {preset.label}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {preset.description}
            </span>
          </button>
        ))}
      </div>

      {/* Reassurance note */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-muted/30 rounded text-xs text-muted-foreground">
        <Info className="size-3.5 shrink-0 mt-0.5" />
        <span>
          Default hours are already set. Customize now or adjust later in
          Settings.
        </span>
      </div>

      <SectionDivider title="Weekly Schedule" badge="OPTIONAL" />

      <BusinessHoursEditor
        value={data.businessHours}
        onChange={(hours) => onChange({ businessHours: hours })}
      />

      {/* Hours summary */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20 rounded border border-border/50">
        <Clock className="size-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">{hoursSummary}</span>
      </div>
    </div>
  );
}
