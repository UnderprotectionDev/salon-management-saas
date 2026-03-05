"use client";

import { useState } from "react";
import { useCategoryForm } from "../../hooks/useCategoryForm";
import {
  HAIR_REMOVAL_METHOD_OPTIONS,
  PAIN_TOLERANCE_OPTIONS,
  SKIN_SENSITIVITY_LEVEL_OPTIONS,
  TANNING_HISTORY_OPTIONS,
  TREATMENT_AREA_OPTIONS,
} from "../../lib/salon-preferences-constants";
import {
  CheckboxGroup,
  DateField,
  PillSelect,
  SaveButton,
  SwitchField,
} from "./shared";

type BodyData = {
  skinSensitivityLevel?: string;
  previousLaserTreatments?: boolean;
  tanningHistory?: string;
  preferredMethod?: string;
  painTolerance?: string;
  lastTreatmentDate?: string;
  treatmentAreas?: string[];
};

export function BodyPreferencesForm({ data }: { data?: BodyData }) {
  const [skinSensitivityLevel, setSkinSensitivityLevel] = useState(
    data?.skinSensitivityLevel ?? "",
  );
  const [previousLaserTreatments, setPreviousLaserTreatments] = useState(
    data?.previousLaserTreatments ?? false,
  );
  const [tanningHistory, setTanningHistory] = useState(
    data?.tanningHistory ?? "",
  );
  const [preferredMethod, setPreferredMethod] = useState(
    data?.preferredMethod ?? "",
  );
  const [painTolerance, setPainTolerance] = useState(data?.painTolerance ?? "");
  const [lastTreatmentDate, setLastTreatmentDate] = useState(
    data?.lastTreatmentDate ?? "",
  );
  const [treatmentAreas, setTreatmentAreas] = useState<string[]>(
    data?.treatmentAreas ?? [],
  );

  const initial: BodyData = {
    skinSensitivityLevel: data?.skinSensitivityLevel ?? "",
    previousLaserTreatments: data?.previousLaserTreatments ?? false,
    tanningHistory: data?.tanningHistory ?? "",
    preferredMethod: data?.preferredMethod ?? "",
    painTolerance: data?.painTolerance ?? "",
    lastTreatmentDate: data?.lastTreatmentDate ?? "",
    treatmentAreas: data?.treatmentAreas ?? [],
  };

  const current: BodyData = {
    skinSensitivityLevel,
    previousLaserTreatments,
    tanningHistory,
    preferredMethod,
    painTolerance,
    lastTreatmentDate,
    treatmentAreas,
  };

  const { isSubmitting, isDirty, handleSave } = useCategoryForm(
    "body",
    initial,
  );

  const dirty = isDirty(current);

  const toggleArea = (id: string) => {
    setTreatmentAreas((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const onSave = () =>
    handleSave({
      skinSensitivityLevel: skinSensitivityLevel || undefined,
      previousLaserTreatments,
      tanningHistory: tanningHistory || undefined,
      preferredMethod: preferredMethod || undefined,
      painTolerance: painTolerance || undefined,
      lastTreatmentDate: lastTreatmentDate || undefined,
      treatmentAreas: treatmentAreas.length > 0 ? treatmentAreas : undefined,
    });

  return (
    <div className="space-y-4 p-4">
      <PillSelect
        label="Skin Sensitivity Level"
        options={SKIN_SENSITIVITY_LEVEL_OPTIONS}
        value={skinSensitivityLevel}
        onChange={setSkinSensitivityLevel}
      />
      <SwitchField
        label="Previous Laser Treatments"
        checked={previousLaserTreatments}
        onCheckedChange={setPreviousLaserTreatments}
      />
      <PillSelect
        label="Tanning History"
        options={TANNING_HISTORY_OPTIONS}
        value={tanningHistory}
        onChange={setTanningHistory}
      />

      <PillSelect
        label="Preferred Hair Removal Method"
        options={HAIR_REMOVAL_METHOD_OPTIONS}
        value={preferredMethod}
        onChange={setPreferredMethod}
      />
      <PillSelect
        label="Pain Tolerance"
        options={PAIN_TOLERANCE_OPTIONS}
        value={painTolerance}
        onChange={setPainTolerance}
      />
      <DateField
        label="Last Treatment Date"
        value={lastTreatmentDate}
        onChange={setLastTreatmentDate}
      />
      <CheckboxGroup
        label="Treatment Areas"
        options={TREATMENT_AREA_OPTIONS}
        selected={treatmentAreas}
        onToggle={toggleArea}
        idPrefix="body-area"
      />

      <SaveButton
        onClick={onSave}
        isSubmitting={isSubmitting}
        disabled={!dirty}
      />
    </div>
  );
}
