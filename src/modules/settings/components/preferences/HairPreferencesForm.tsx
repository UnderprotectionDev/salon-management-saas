"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HAIR_LENGTH_OPTIONS, HAIR_TYPE_OPTIONS } from "@/modules/onboarding";
import { useCategoryForm } from "../../hooks/useCategoryForm";
import {
  HAIR_COLOR_OPTIONS,
  HEAT_TOOL_USAGE_OPTIONS,
  SCALP_SENSITIVITY_OPTIONS,
  WASH_FREQUENCY_OPTIONS,
} from "../../lib/salon-preferences-constants";
import { PhotoUploadGrid } from "./PhotoUploadGrid";
import {
  DateField,
  PillSelect,
  SaveButton,
  SwitchField,
  TextareaField,
} from "./shared";

type HairData = {
  hairType?: string;
  hairLength?: string;
  naturalHairColor?: string;
  currentHairColor?: string;
  colorTreated?: boolean;
  scalpSensitivity?: string;
  photos?: string[];
  washFrequency?: string;
  heatToolUsage?: string;
  productsUsed?: string;
  lastChemicalTreatment?: string;
};

export function HairPreferencesForm({ data }: { data?: HairData }) {
  const [hairType, setHairType] = useState(data?.hairType ?? "");
  const [hairLength, setHairLength] = useState(data?.hairLength ?? "");
  const [naturalHairColor, setNaturalHairColor] = useState(
    data?.naturalHairColor ?? "",
  );
  const [currentHairColor, setCurrentHairColor] = useState(
    data?.currentHairColor ?? "",
  );
  const [colorTreated, setColorTreated] = useState(data?.colorTreated ?? false);
  const [scalpSensitivity, setScalpSensitivity] = useState(
    data?.scalpSensitivity ?? "",
  );
  const [photos, setPhotos] = useState<string[]>(data?.photos ?? []);
  const [washFrequency, setWashFrequency] = useState(data?.washFrequency ?? "");
  const [heatToolUsage, setHeatToolUsage] = useState(data?.heatToolUsage ?? "");
  const [productsUsed, setProductsUsed] = useState(data?.productsUsed ?? "");
  const [lastChemicalTreatment, setLastChemicalTreatment] = useState(
    data?.lastChemicalTreatment ?? "",
  );

  const initial: HairData = {
    hairType: data?.hairType ?? "",
    hairLength: data?.hairLength ?? "",
    naturalHairColor: data?.naturalHairColor ?? "",
    currentHairColor: data?.currentHairColor ?? "",
    colorTreated: data?.colorTreated ?? false,
    scalpSensitivity: data?.scalpSensitivity ?? "",
    photos: data?.photos ?? [],
    washFrequency: data?.washFrequency ?? "",
    heatToolUsage: data?.heatToolUsage ?? "",
    productsUsed: data?.productsUsed ?? "",
    lastChemicalTreatment: data?.lastChemicalTreatment ?? "",
  };

  const current: HairData = {
    hairType,
    hairLength,
    naturalHairColor,
    currentHairColor,
    colorTreated,
    scalpSensitivity,
    photos,
    washFrequency,
    heatToolUsage,
    productsUsed,
    lastChemicalTreatment,
  };

  const { isSubmitting, isDirty, handleSave } = useCategoryForm(
    "hair",
    initial,
  );

  const dirty = isDirty(current);

  const onSave = () =>
    handleSave({
      hairType: hairType || undefined,
      hairLength: hairLength || undefined,
      naturalHairColor: naturalHairColor || undefined,
      currentHairColor: currentHairColor || undefined,
      colorTreated,
      scalpSensitivity: scalpSensitivity || undefined,
      photos: photos.length > 0 ? photos : undefined,
      washFrequency: washFrequency || undefined,
      heatToolUsage: heatToolUsage || undefined,
      productsUsed: productsUsed.trim() || undefined,
      lastChemicalTreatment: lastChemicalTreatment || undefined,
    });

  return (
    <div className="space-y-4 p-4">
      <PhotoUploadGrid photos={photos} onPhotosChange={setPhotos} />

      <PillSelect
        label="Hair Type"
        options={HAIR_TYPE_OPTIONS}
        value={hairType}
        onChange={setHairType}
      />
      <PillSelect
        label="Hair Length"
        options={HAIR_LENGTH_OPTIONS}
        value={hairLength}
        onChange={setHairLength}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Natural Hair Color</Label>
          <Select value={naturalHairColor} onValueChange={setNaturalHairColor}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {HAIR_COLOR_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Current Hair Color</Label>
          <Select value={currentHairColor} onValueChange={setCurrentHairColor}>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {HAIR_COLOR_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <SwitchField
        label="Color Treated"
        checked={colorTreated}
        onCheckedChange={setColorTreated}
      />

      <PillSelect
        label="Scalp Sensitivity"
        options={SCALP_SENSITIVITY_OPTIONS}
        value={scalpSensitivity}
        onChange={setScalpSensitivity}
      />

      <PillSelect
        label="Wash Frequency"
        options={WASH_FREQUENCY_OPTIONS}
        value={washFrequency}
        onChange={setWashFrequency}
      />

      <PillSelect
        label="Heat Tool Usage"
        options={HEAT_TOOL_USAGE_OPTIONS}
        value={heatToolUsage}
        onChange={setHeatToolUsage}
      />

      <TextareaField
        label="Products Used"
        value={productsUsed}
        onChange={setProductsUsed}
        maxLength={500}
        placeholder="List your current hair products..."
      />

      <DateField
        label="Last Chemical Treatment"
        value={lastChemicalTreatment}
        onChange={setLastChemicalTreatment}
      />

      <SaveButton
        onClick={onSave}
        isSubmitting={isSubmitting}
        disabled={!dirty}
      />
    </div>
  );
}
