"use client";

import { Check, Hand, Paintbrush, Plus, Scissors } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  type DesignSalonType,
  getCategories,
  getCategoryVisual,
  MULTI_SERVICE_AREAS,
  type OrgSalonType,
} from "./category-presets";

// =============================================================================
// Multi-service area selector (shown before categories for multi-salons)
// =============================================================================

const SERVICE_AREA_ICONS: Record<DesignSalonType, typeof Scissors> = {
  hair: Scissors,
  nail: Hand,
  makeup: Paintbrush,
  multi: Paintbrush,
};

function ServiceAreaSelector({
  value,
  onChange,
}: {
  value: DesignSalonType;
  onChange: (area: DesignSalonType) => void;
}) {
  return (
    <div className="mb-8">
      <h3 className="mb-3 font-medium text-sm text-muted-foreground">
        Service Area
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {MULTI_SERVICE_AREAS.map((area) => {
          const Icon = SERVICE_AREA_ICONS[area.value];
          const isSelected = value === area.value;
          return (
            <button
              key={area.value}
              type="button"
              onClick={() => onChange(area.value)}
              className={`group relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                isSelected
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:border-foreground/30 hover:bg-muted/50"
              }`}
            >
              <Icon
                className={`h-6 w-6 ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
              />
              <span
                className={`font-medium text-sm ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
              >
                {area.label}
              </span>
              <span className="text-center text-muted-foreground text-xs leading-tight">
                {area.description}
              </span>
              {isSelected && (
                <div className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Category Step
// =============================================================================

interface CategoryStepProps {
  orgSalonType: OrgSalonType | null;
  isMulti: boolean;
  serviceArea: DesignSalonType;
  selectedCategory: string;
  onServiceAreaChange: (area: DesignSalonType) => void;
  onCategorySelect: (category: string) => void;
}

export function CategoryStep({
  orgSalonType,
  isMulti,
  serviceArea,
  selectedCategory,
  onServiceAreaChange,
  onCategorySelect,
}: CategoryStepProps) {
  const [customMode, setCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const categories = getCategories(
    orgSalonType,
    isMulti ? serviceArea : undefined,
  );

  function handleCustomSubmit() {
    const trimmed = customValue.trim();
    if (trimmed) {
      onCategorySelect(trimmed);
      setCustomMode(false);
      setCustomValue("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Multi-service area selector */}
      {isMulti && (
        <ServiceAreaSelector
          value={serviceArea}
          onChange={onServiceAreaChange}
        />
      )}

      <h2 className="mb-1 font-semibold text-xl">Choose a Style Category</h2>
      <p className="mb-6 text-muted-foreground text-sm">
        Select the category that best describes your design
      </p>

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {categories.map((category) => {
          const visual = getCategoryVisual(category);
          const Icon = visual.icon;
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onCategorySelect(category)}
              className={`group relative flex flex-col items-center overflow-hidden rounded-lg border-2 transition-all hover:scale-[1.02] ${
                isSelected
                  ? "border-foreground ring-2 ring-foreground/20"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              {/* Gradient background */}
              <div
                className={`flex h-24 w-full items-center justify-center bg-gradient-to-br ${visual.gradient}`}
              >
                <Icon
                  className={`h-8 w-8 transition-transform group-hover:scale-110 ${
                    isSelected ? "text-foreground/80" : "text-foreground/40"
                  }`}
                />
              </div>

              {/* Label */}
              <div className="flex w-full items-center justify-center gap-1.5 px-2 py-2.5">
                <span
                  className={`truncate font-medium text-sm ${
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {category}
                </span>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}

        {/* Custom category card */}
        {customMode ? (
          <div className="flex flex-col overflow-hidden rounded-lg border-2 border-dashed border-foreground/30">
            <div className="flex h-24 w-full items-center justify-center bg-muted/50 px-3">
              <Input
                autoFocus
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCustomSubmit();
                  if (e.key === "Escape") {
                    setCustomMode(false);
                    setCustomValue("");
                  }
                }}
                onBlur={() => {
                  if (customValue.trim()) {
                    handleCustomSubmit();
                  } else {
                    setCustomMode(false);
                  }
                }}
                placeholder="Category name..."
                className="h-8 text-center text-sm"
              />
            </div>
            <div className="flex w-full items-center justify-center px-2 py-2.5">
              <span className="text-muted-foreground text-xs">
                Press Enter to confirm
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCustomMode(true)}
            className="group flex flex-col items-center overflow-hidden rounded-lg border-2 border-dashed border-border transition-all hover:border-foreground/30 hover:scale-[1.02]"
          >
            <div className="flex h-24 w-full items-center justify-center bg-muted/30">
              <Plus className="h-8 w-8 text-muted-foreground/40 transition-transform group-hover:scale-110" />
            </div>
            <div className="flex w-full items-center justify-center px-2 py-2.5">
              <span className="font-medium text-muted-foreground text-sm">
                Custom
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
