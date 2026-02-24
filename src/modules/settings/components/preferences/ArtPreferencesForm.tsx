"use client";

import { useState } from "react";
import { METAL_ALLERGY_OPTIONS } from "../../lib/salon-preferences-constants";
import { useCategoryForm } from "../../hooks/useCategoryForm";
import { CheckboxGroup, SaveButton, SwitchField } from "./shared";
import { PhotoUploadGrid } from "./PhotoUploadGrid";

type ArtData = {
  previousTattoos?: boolean;
  keloidTendency?: boolean;
  metalAllergies?: string[];
  photos?: string[];
};

export function ArtPreferencesForm({ data }: { data?: ArtData }) {
  const [previousTattoos, setPreviousTattoos] = useState(
    data?.previousTattoos ?? false,
  );
  const [keloidTendency, setKeloidTendency] = useState(
    data?.keloidTendency ?? false,
  );
  const [metalAllergies, setMetalAllergies] = useState<string[]>(
    data?.metalAllergies ?? [],
  );
  const [photos, setPhotos] = useState<string[]>(data?.photos ?? []);

  const initial: ArtData = {
    previousTattoos: data?.previousTattoos ?? false,
    keloidTendency: data?.keloidTendency ?? false,
    metalAllergies: data?.metalAllergies ?? [],
    photos: data?.photos ?? [],
  };

  const current: ArtData = {
    previousTattoos,
    keloidTendency,
    metalAllergies,
    photos,
  };

  const { isSubmitting, isDirty, handleSave } = useCategoryForm(
    "art",
    initial,
  );

  const dirty = isDirty(current);

  const toggleAllergy = (id: string) => {
    setMetalAllergies((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const onSave = () =>
    handleSave({
      previousTattoos,
      keloidTendency,
      metalAllergies: metalAllergies.length > 0 ? metalAllergies : undefined,
      photos: photos.length > 0 ? photos : undefined,
    });

  return (
    <div className="space-y-4 p-4">
      <PhotoUploadGrid photos={photos} onPhotosChange={setPhotos} />

      <SwitchField
        label="Previous Tattoos"
        checked={previousTattoos}
        onCheckedChange={setPreviousTattoos}
      />
      <SwitchField
        label="Keloid Tendency"
        checked={keloidTendency}
        onCheckedChange={setKeloidTendency}
      />
      <CheckboxGroup
        label="Metal Allergies"
        options={METAL_ALLERGY_OPTIONS}
        selected={metalAllergies}
        onToggle={toggleAllergy}
        idPrefix="art-allergy"
      />
      <SaveButton
        onClick={onSave}
        isSubmitting={isSubmitting}
        disabled={!dirty}
      />
    </div>
  );
}
