"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PET_SIZE_OPTIONS } from "../../lib/salon-preferences-constants";
import { useCategoryForm } from "../../hooks/useCategoryForm";
import { PillSelect, SaveButton } from "./shared";
import { PhotoUploadGrid } from "./PhotoUploadGrid";

type SpecialtyData = {
  petType?: string;
  petBreed?: string;
  petSize?: string;
  photos?: string[];
};

export function SpecialtyPreferencesForm({ data }: { data?: SpecialtyData }) {
  const [petType, setPetType] = useState(data?.petType ?? "");
  const [petBreed, setPetBreed] = useState(data?.petBreed ?? "");
  const [petSize, setPetSize] = useState(data?.petSize ?? "");
  const [photos, setPhotos] = useState<string[]>(data?.photos ?? []);

  const initial: SpecialtyData = {
    petType: data?.petType ?? "",
    petBreed: data?.petBreed ?? "",
    petSize: data?.petSize ?? "",
    photos: data?.photos ?? [],
  };

  const current: SpecialtyData = { petType, petBreed, petSize, photos };

  const { isSubmitting, isDirty, handleSave } = useCategoryForm(
    "specialty",
    initial,
  );

  const dirty = isDirty(current);

  const onSave = () =>
    handleSave({
      petType: petType.trim() || undefined,
      petBreed: petBreed.trim() || undefined,
      petSize: petSize || undefined,
      photos: photos.length > 0 ? photos : undefined,
    });

  return (
    <div className="space-y-4 p-4">
      <PhotoUploadGrid photos={photos} onPhotosChange={setPhotos} />

      <div className="space-y-2">
        <Label className="text-sm font-medium">Pet Type</Label>
        <Input
          value={petType}
          onChange={(e) => setPetType(e.target.value)}
          placeholder="e.g. Dog, Cat..."
          maxLength={100}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Pet Breed</Label>
        <Input
          value={petBreed}
          onChange={(e) => setPetBreed(e.target.value)}
          placeholder="e.g. Golden Retriever..."
          maxLength={100}
        />
      </div>
      <PillSelect
        label="Pet Size"
        options={PET_SIZE_OPTIONS}
        value={petSize}
        onChange={setPetSize}
      />
      <SaveButton
        onClick={onSave}
        isSubmitting={isSubmitting}
        disabled={!dirty}
      />
    </div>
  );
}
