"use client";

import { useState } from "react";
import {
  SKIN_TYPE_OPTIONS,
  SKIN_CONDITIONS_OPTIONS,
  DAILY_ROUTINE_OPTIONS,
  SUNSCREEN_USAGE_OPTIONS,
  ACTIVE_INGREDIENT_OPTIONS,
} from "../../lib/salon-preferences-constants";
import { useCategoryForm } from "../../hooks/useCategoryForm";
import {
  PillSelect,
  CheckboxGroup,
  SaveButton,
  SwitchField,
  DateField,
} from "./shared";
import { PhotoUploadGrid } from "./PhotoUploadGrid";

type SkinData = {
  skinType?: string;
  skinConditions?: string[];
  lashExtensionsHistory?: boolean;
  photos?: string[];
  dailyRoutine?: string;
  sunscreenUsage?: string;
  activeIngredients?: string[];
  lastFacialDate?: string;
};

export function SkinPreferencesForm({ data }: { data?: SkinData }) {
  const [skinType, setSkinType] = useState(data?.skinType ?? "");
  const [skinConditions, setSkinConditions] = useState<string[]>(
    data?.skinConditions ?? [],
  );
  const [lashExtensionsHistory, setLashExtensionsHistory] = useState(
    data?.lashExtensionsHistory ?? false,
  );
  const [photos, setPhotos] = useState<string[]>(data?.photos ?? []);
  const [dailyRoutine, setDailyRoutine] = useState(data?.dailyRoutine ?? "");
  const [sunscreenUsage, setSunscreenUsage] = useState(
    data?.sunscreenUsage ?? "",
  );
  const [activeIngredients, setActiveIngredients] = useState<string[]>(
    data?.activeIngredients ?? [],
  );
  const [lastFacialDate, setLastFacialDate] = useState(
    data?.lastFacialDate ?? "",
  );

  const initial: SkinData = {
    skinType: data?.skinType ?? "",
    skinConditions: data?.skinConditions ?? [],
    lashExtensionsHistory: data?.lashExtensionsHistory ?? false,
    photos: data?.photos ?? [],
    dailyRoutine: data?.dailyRoutine ?? "",
    sunscreenUsage: data?.sunscreenUsage ?? "",
    activeIngredients: data?.activeIngredients ?? [],
    lastFacialDate: data?.lastFacialDate ?? "",
  };

  const current: SkinData = {
    skinType,
    skinConditions,
    lashExtensionsHistory,
    photos,
    dailyRoutine,
    sunscreenUsage,
    activeIngredients,
    lastFacialDate,
  };

  const { isSubmitting, isDirty, handleSave } = useCategoryForm(
    "skin",
    initial,
  );

  const dirty = isDirty(current);

  const toggleCondition = (id: string) => {
    setSkinConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleIngredient = (id: string) => {
    setActiveIngredients((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const onSave = () =>
    handleSave({
      skinType: skinType || undefined,
      skinConditions: skinConditions.length > 0 ? skinConditions : undefined,
      lashExtensionsHistory,
      photos: photos.length > 0 ? photos : undefined,
      dailyRoutine: dailyRoutine || undefined,
      sunscreenUsage: sunscreenUsage || undefined,
      activeIngredients:
        activeIngredients.length > 0 ? activeIngredients : undefined,
      lastFacialDate: lastFacialDate || undefined,
    });

  return (
    <div className="space-y-4 p-4">
      <PhotoUploadGrid photos={photos} onPhotosChange={setPhotos} />

      <PillSelect
        label="Skin Type"
        options={SKIN_TYPE_OPTIONS}
        value={skinType}
        onChange={setSkinType}
      />
      <CheckboxGroup
        label="Skin Conditions"
        options={SKIN_CONDITIONS_OPTIONS}
        selected={skinConditions}
        onToggle={toggleCondition}
        idPrefix="skin-cond"
      />
      <SwitchField
        label="Lash Extensions History"
        checked={lashExtensionsHistory}
        onCheckedChange={setLashExtensionsHistory}
      />

      <PillSelect
        label="Daily Routine"
        options={DAILY_ROUTINE_OPTIONS}
        value={dailyRoutine}
        onChange={setDailyRoutine}
      />
      <PillSelect
        label="Sunscreen Usage"
        options={SUNSCREEN_USAGE_OPTIONS}
        value={sunscreenUsage}
        onChange={setSunscreenUsage}
      />
      <CheckboxGroup
        label="Active Ingredients"
        options={ACTIVE_INGREDIENT_OPTIONS}
        selected={activeIngredients}
        onToggle={toggleIngredient}
        idPrefix="skin-ingr"
      />
      <DateField
        label="Last Facial Date"
        value={lastFacialDate}
        onChange={setLastFacialDate}
      />

      <SaveButton
        onClick={onSave}
        isSubmitting={isSubmitting}
        disabled={!dirty}
      />
    </div>
  );
}
