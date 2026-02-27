"use client";

import { Lock, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { variantStockKey } from "../lib/variant-helpers";
import { VARIANT_PRESETS } from "../lib/variant-presets";

export type VariantOption = {
  name: string;
  values: string[];
};

type VariantOptionsEditorProps = {
  options: VariantOption[];
  onChange: (options: VariantOption[]) => void;
  disabled?: boolean;
  variantStockMap?: Map<string, number>;
};

export function VariantOptionsEditor({
  options,
  onChange,
  disabled,
  variantStockMap,
}: VariantOptionsEditorProps) {
  const [newValueInputs, setNewValueInputs] = useState<Record<number, string>>(
    {},
  );

  // Stable IDs for option blocks to avoid stale UI after mid-list removal
  const idCounterRef = useRef(options.length);
  const [optionKeys, setOptionKeys] = useState<number[]>(() =>
    options.map((_, i) => i),
  );

  // Keep optionKeys in sync if options length changes externally (e.g. preset applied)
  if (optionKeys.length !== options.length) {
    const newKeys: number[] = [];
    for (let i = 0; i < options.length; i++) {
      newKeys.push(
        i < optionKeys.length ? optionKeys[i] : idCounterRef.current++,
      );
    }
    setOptionKeys(newKeys);
  }

  const addOption = () => {
    if (options.length >= 3) return;
    onChange([...options, { name: "", values: [] }]);
    setOptionKeys((prev) => [...prev, idCounterRef.current++]);
  };

  const removeOption = (index: number) => {
    // In edit mode, check if any value in this option has stock
    if (variantStockMap) {
      const option = options[index];
      for (const val of option.values) {
        const stock =
          variantStockMap.get(variantStockKey(option.name, val)) ?? 0;
        if (stock > 0) return; // blocked
      }
    }
    onChange(options.filter((_, i) => i !== index));
    setOptionKeys((prev) => prev.filter((_, i) => i !== index));
    setNewValueInputs((prev) => {
      const next: Record<number, string> = {};
      for (const [key, val] of Object.entries(prev)) {
        const k = Number(key);
        if (k < index) next[k] = val;
        else if (k > index) next[k - 1] = val;
      }
      return next;
    });
  };

  const applyPreset = (index: number, presetId: string) => {
    const preset = VARIANT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const updated = [...options];
    if (preset.id === "custom") {
      updated[index] = { name: "", values: [] };
    } else {
      updated[index] = {
        name: preset.label,
        values: [...preset.defaultValues],
      };
    }
    onChange(updated);
  };

  const updateOptionName = (index: number, name: string) => {
    const updated = [...options];
    updated[index] = { ...updated[index], name };
    onChange(updated);
  };

  const addValue = (index: number) => {
    const value = (newValueInputs[index] ?? "").trim();
    if (!value) return;
    if (options[index].values.includes(value)) return;
    if (options[index].values.length >= 10) return;

    const updated = [...options];
    updated[index] = {
      ...updated[index],
      values: [...updated[index].values, value],
    };
    onChange(updated);
    setNewValueInputs((prev) => ({ ...prev, [index]: "" }));
  };

  const removeValue = (optionIndex: number, valueIndex: number) => {
    const option = options[optionIndex];
    const value = option.values[valueIndex];

    // In edit mode, check stock
    if (variantStockMap) {
      const stock =
        variantStockMap.get(variantStockKey(option.name, value)) ?? 0;
      if (stock > 0) return; // blocked
    }

    const updated = [...options];
    updated[optionIndex] = {
      ...updated[optionIndex],
      values: updated[optionIndex].values.filter((_, i) => i !== valueIndex),
    };
    onChange(updated);
  };

  // Check if removing an option is blocked by stock
  const isOptionRemoveBlocked = (index: number) => {
    if (!variantStockMap) return false;
    const option = options[index];
    return option.values.some(
      (val) =>
        (variantStockMap.get(variantStockKey(option.name, val)) ?? 0) > 0,
    );
  };

  // Check if a value removal is blocked by stock
  const isValueRemoveBlocked = (optionIndex: number, valueIndex: number) => {
    if (!variantStockMap) return false;
    const option = options[optionIndex];
    const value = option.values[valueIndex];
    return (variantStockMap.get(variantStockKey(option.name, value)) ?? 0) > 0;
  };

  // Compute total combinations for preview
  const totalCombinations =
    options.length > 0 && options.every((o) => o.values.length > 0)
      ? options.reduce((acc, o) => acc * o.values.length, 1)
      : 0;

  return (
    <div className="space-y-4">
      {options.map((option, index) => (
        <div
          key={optionKeys[index] ?? index}
          className="rounded-lg border p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            {/* Preset selector */}
            <div className="w-[140px] shrink-0">
              <Label className="text-xs text-muted-foreground">Preset</Label>
              <Select
                onValueChange={(v) => applyPreset(index, v)}
                disabled={disabled}
              >
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Choose..." />
                </SelectTrigger>
                <SelectContent>
                  {VARIANT_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Option name */}
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">
                Option name
              </Label>
              <Input
                value={option.name}
                onChange={(e) => updateOptionName(index, e.target.value)}
                placeholder="e.g. Size, Color, Type"
                disabled={disabled}
                className="mt-1"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 mt-5 text-muted-foreground hover:text-destructive"
              onClick={() => removeOption(index)}
              disabled={disabled || isOptionRemoveBlocked(index)}
              aria-label={
                isOptionRemoveBlocked(index)
                  ? "Cannot remove — some values have stock"
                  : "Remove option"
              }
              title={
                isOptionRemoveBlocked(index)
                  ? "Cannot remove — some values have stock"
                  : "Remove option"
              }
            >
              {isOptionRemoveBlocked(index) ? (
                <Lock className="size-4" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>

          {/* Values */}
          <div>
            <Label className="text-xs text-muted-foreground">
              Values ({option.values.length}/10)
            </Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {option.values.map((value, vIndex) => {
                const blocked = isValueRemoveBlocked(index, vIndex);
                const stock = variantStockMap?.get(
                  variantStockKey(option.name, value),
                );
                return (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="gap-1 pr-1"
                    title={
                      blocked ? `${stock} units in stock — cannot remove` : ""
                    }
                  >
                    {value}
                    {blocked ? (
                      <Lock className="size-3 text-muted-foreground/60 ml-0.5" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => removeValue(index, vIndex)}
                        disabled={disabled}
                        aria-label={`Remove ${value}`}
                        className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </Badge>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                value={newValueInputs[index] ?? ""}
                onChange={(e) =>
                  setNewValueInputs((prev) => ({
                    ...prev,
                    [index]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addValue(index);
                  }
                }}
                placeholder="Add value..."
                disabled={disabled || option.values.length >= 10}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addValue(index)}
                disabled={
                  disabled ||
                  !newValueInputs[index]?.trim() ||
                  option.values.length >= 10
                }
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      ))}

      {options.length < 3 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addOption}
          disabled={disabled}
          className="w-full"
        >
          <Plus className="mr-1.5 size-3.5" />
          Add Option{options.length > 0 ? ` (${options.length}/3)` : ""}
        </Button>
      )}

      {totalCombinations > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {totalCombinations} variant{totalCombinations !== 1 ? "s" : ""} will
          be generated
          {totalCombinations > 100 && (
            <span className="text-destructive font-medium">
              {" "}
              (exceeds 100 limit)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
