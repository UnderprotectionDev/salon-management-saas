export type VariantPreset = {
  id: string;
  label: string;
  defaultValues: string[];
};

export const VARIANT_PRESETS: VariantPreset[] = [
  {
    id: "volume",
    label: "Volume",
    defaultValues: ["50ml", "100ml", "250ml", "500ml", "1000ml"],
  },
  {
    id: "weight",
    label: "Weight",
    defaultValues: ["50g", "100g", "250g", "500g"],
  },
  {
    id: "color",
    label: "Color",
    defaultValues: [
      "Black",
      "Brown",
      "Blonde",
      "Red",
      "Copper",
      "Platinum",
      "Ash",
      "Burgundy",
    ],
  },
  {
    id: "type",
    label: "Type / Formula",
    defaultValues: ["Normal", "Dry", "Oily", "Color-Treated", "Damaged"],
  },
  { id: "custom", label: "Custom", defaultValues: [] },
];
