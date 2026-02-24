"use client";

import { useState } from "react";
import {
  CHRONIC_PAIN_OPTIONS,
  PRESSURE_PREFERENCE_OPTIONS,
  AROMATHERAPY_OPTIONS,
  FOCUS_AREA_OPTIONS,
} from "../../lib/salon-preferences-constants";
import { useCategoryForm } from "../../hooks/useCategoryForm";
import { PillSelect, CheckboxGroup, SaveButton, SwitchField } from "./shared";

type SpaData = {
  pregnancy?: boolean;
  bloodPressureIssues?: boolean;
  chronicPainAreas?: string[];
  pressurePreference?: string;
  aromatherapyPreference?: string[];
  focusAreas?: string[];
};

export function SpaPreferencesForm({ data }: { data?: SpaData }) {
  const [pregnancy, setPregnancy] = useState(data?.pregnancy ?? false);
  const [bloodPressureIssues, setBloodPressureIssues] = useState(
    data?.bloodPressureIssues ?? false,
  );
  const [chronicPainAreas, setChronicPainAreas] = useState<string[]>(
    data?.chronicPainAreas ?? [],
  );
  const [pressurePreference, setPressurePreference] = useState(
    data?.pressurePreference ?? "",
  );
  const [aromatherapyPreference, setAromatherapyPreference] = useState<
    string[]
  >(data?.aromatherapyPreference ?? []);
  const [focusAreas, setFocusAreas] = useState<string[]>(
    data?.focusAreas ?? [],
  );

  const initial: SpaData = {
    pregnancy: data?.pregnancy ?? false,
    bloodPressureIssues: data?.bloodPressureIssues ?? false,
    chronicPainAreas: data?.chronicPainAreas ?? [],
    pressurePreference: data?.pressurePreference ?? "",
    aromatherapyPreference: data?.aromatherapyPreference ?? [],
    focusAreas: data?.focusAreas ?? [],
  };

  const current: SpaData = {
    pregnancy,
    bloodPressureIssues,
    chronicPainAreas,
    pressurePreference,
    aromatherapyPreference,
    focusAreas,
  };

  const { isSubmitting, isDirty, handleSave } = useCategoryForm("spa", initial);

  const dirty = isDirty(current);

  const togglePain = (id: string) => {
    setChronicPainAreas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleAroma = (id: string) => {
    setAromatherapyPreference((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleFocus = (id: string) => {
    setFocusAreas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const onSave = () =>
    handleSave({
      pregnancy,
      bloodPressureIssues,
      chronicPainAreas:
        chronicPainAreas.length > 0 ? chronicPainAreas : undefined,
      pressurePreference: pressurePreference || undefined,
      aromatherapyPreference:
        aromatherapyPreference.length > 0 ? aromatherapyPreference : undefined,
      focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
    });

  return (
    <div className="space-y-4 p-4">
      <SwitchField
        label="Pregnancy"
        checked={pregnancy}
        onCheckedChange={setPregnancy}
      />
      <SwitchField
        label="Blood Pressure Issues"
        checked={bloodPressureIssues}
        onCheckedChange={setBloodPressureIssues}
      />
      <CheckboxGroup
        label="Chronic Pain Areas"
        options={CHRONIC_PAIN_OPTIONS}
        selected={chronicPainAreas}
        onToggle={togglePain}
        idPrefix="pain"
      />

      <PillSelect
        label="Pressure Preference"
        options={PRESSURE_PREFERENCE_OPTIONS}
        value={pressurePreference}
        onChange={setPressurePreference}
      />
      <CheckboxGroup
        label="Aromatherapy Preference"
        options={AROMATHERAPY_OPTIONS}
        selected={aromatherapyPreference}
        onToggle={toggleAroma}
        idPrefix="aroma"
      />
      <CheckboxGroup
        label="Focus Areas"
        options={FOCUS_AREA_OPTIONS}
        selected={focusAreas}
        onToggle={toggleFocus}
        idPrefix="focus"
      />

      <SaveButton
        onClick={onSave}
        isSubmitting={isSubmitting}
        disabled={!dirty}
      />
    </div>
  );
}
