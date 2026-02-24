"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCategoryForm } from "../../hooks/useCategoryForm";
import { SaveButton, SwitchField } from "./shared";

type MedicalData = {
  currentMedications?: string;
  previousProcedures?: string;
  physicianClearance?: boolean;
};

export function MedicalPreferencesForm({ data }: { data?: MedicalData }) {
  const [currentMedications, setCurrentMedications] = useState(
    data?.currentMedications ?? "",
  );
  const [previousProcedures, setPreviousProcedures] = useState(
    data?.previousProcedures ?? "",
  );
  const [physicianClearance, setPhysicianClearance] = useState(
    data?.physicianClearance ?? false,
  );

  const initial: MedicalData = {
    currentMedications: data?.currentMedications ?? "",
    previousProcedures: data?.previousProcedures ?? "",
    physicianClearance: data?.physicianClearance ?? false,
  };

  const current: MedicalData = {
    currentMedications,
    previousProcedures,
    physicianClearance,
  };

  const { isSubmitting, isDirty, handleSave } = useCategoryForm(
    "medical",
    initial,
  );

  const dirty = isDirty(current);

  const onSave = () =>
    handleSave({
      currentMedications: currentMedications.trim() || undefined,
      previousProcedures: previousProcedures.trim() || undefined,
      physicianClearance,
    });

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Current Medications</Label>
        <Textarea
          value={currentMedications}
          onChange={(e) => setCurrentMedications(e.target.value)}
          placeholder="List any medications you are currently taking..."
          rows={2}
          maxLength={1000}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Previous Procedures</Label>
        <Textarea
          value={previousProcedures}
          onChange={(e) => setPreviousProcedures(e.target.value)}
          placeholder="List any previous medical/aesthetic procedures..."
          rows={2}
          maxLength={1000}
        />
      </div>
      <SwitchField
        label="Physician Clearance"
        checked={physicianClearance}
        onCheckedChange={setPhysicianClearance}
      />
      <SaveButton
        onClick={onSave}
        isSubmitting={isSubmitting}
        disabled={!dirty}
      />
    </div>
  );
}
