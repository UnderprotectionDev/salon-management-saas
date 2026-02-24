"use client";

import { useState } from "react";
import {
  NAIL_TYPE_OPTIONS,
  SKIN_TONE_OPTIONS,
} from "../../lib/salon-preferences-constants";
import { useCategoryForm } from "../../hooks/useCategoryForm";
import { PillSelect, SaveButton, SwitchField } from "./shared";

type NailsData = {
  nailType?: string;
  skinTone?: string;
  sensitiveSkin?: boolean;
};

export function NailsPreferencesForm({ data }: { data?: NailsData }) {
  const [nailType, setNailType] = useState(data?.nailType ?? "");
  const [skinTone, setSkinTone] = useState(data?.skinTone ?? "");
  const [sensitiveSkin, setSensitiveSkin] = useState(
    data?.sensitiveSkin ?? false,
  );

  const initial: NailsData = {
    nailType: data?.nailType ?? "",
    skinTone: data?.skinTone ?? "",
    sensitiveSkin: data?.sensitiveSkin ?? false,
  };

  const current: NailsData = { nailType, skinTone, sensitiveSkin };

  const { isSubmitting, isDirty, handleSave } = useCategoryForm(
    "nails",
    initial,
  );

  const dirty = isDirty(current);

  const onSave = () =>
    handleSave({
      nailType: nailType || undefined,
      skinTone: skinTone || undefined,
      sensitiveSkin,
    });

  return (
    <div className="space-y-4 p-4">
      <PillSelect
        label="Nail Type"
        options={NAIL_TYPE_OPTIONS}
        value={nailType}
        onChange={setNailType}
      />
      <PillSelect
        label="Skin Tone"
        options={SKIN_TONE_OPTIONS}
        value={skinTone}
        onChange={setSkinTone}
      />
      <SwitchField
        label="Sensitive Skin"
        checked={sensitiveSkin}
        onCheckedChange={setSensitiveSkin}
      />
      <SaveButton
        onClick={onSave}
        isSubmitting={isSubmitting}
        disabled={!dirty}
      />
    </div>
  );
}
