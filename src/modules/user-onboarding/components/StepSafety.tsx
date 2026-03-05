"use client";

import { AlertTriangle } from "lucide-react";
import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMMON_ALLERGENS } from "@/modules/onboarding/lib/constants";
import { SectionDivider } from "@/modules/org-onboarding";
import type { WizardFormData } from "../hooks/useUserOnboardingForm";

export function StepSafety({
  data,
  onChange,
}: {
  data: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
}) {
  const notesId = useId();

  const toggleAllergen = (id: string) => {
    const next = data.allergies.includes(id)
      ? data.allergies.filter((a) => a !== id)
      : [...data.allergies, id];
    onChange({ allergies: next });
  };

  return (
    <div className="space-y-10">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <AlertTriangle
          className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          This information helps salons choose safe products for your
          treatments. You can update it anytime from your settings.
        </p>
      </div>

      {/* Allergens */}
      <div>
        <SectionDivider
          title="ALLERGIES"
          badge="OPTIONAL"
          complete={data.allergies.length > 0}
        />
        <div className="grid grid-cols-2 gap-3">
          {COMMON_ALLERGENS.map((allergen) => {
            const checked = data.allergies.includes(allergen.id);
            return (
              <div key={allergen.id} className="flex items-center gap-3">
                <Checkbox
                  id={`allergen-${allergen.id}`}
                  checked={checked}
                  onCheckedChange={() => toggleAllergen(allergen.id)}
                />
                <Label
                  htmlFor={`allergen-${allergen.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {allergen.label}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <SectionDivider
          title="ADDITIONAL NOTES"
          badge="OPTIONAL"
          complete={!!data.allergyNotes}
        />
        <Label htmlFor={notesId} className="sr-only">
          Additional allergy or sensitivity notes
        </Label>
        <Textarea
          id={notesId}
          placeholder="List any other sensitivities..."
          value={data.allergyNotes}
          onChange={(e) => onChange({ allergyNotes: e.target.value })}
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
}
