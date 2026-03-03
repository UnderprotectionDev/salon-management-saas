"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CondFormatOperator,
  CondFormatRule,
  CondFormatRuleType,
  CondFormatStyle,
} from "../lib/conditional-format-types";
import { cellRef, colLabel } from "../lib/spreadsheet-utils";

interface ConditionalFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: CondFormatRule[];
  onSave: (rules: CondFormatRule[]) => void;
  selectionRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  selectedCell: string;
}

const RULE_TYPES: { value: CondFormatRuleType; label: string }[] = [
  { value: "value", label: "Cell Value" },
  { value: "colorScale", label: "Color Scale" },
  { value: "dataBar", label: "Data Bar" },
  { value: "formula", label: "Formula" },
  { value: "duplicates", label: "Duplicate Values" },
  { value: "topBottom", label: "Top/Bottom" },
];

const OPERATORS: { value: CondFormatOperator; label: string }[] = [
  { value: "greaterThan", label: "Greater Than" },
  { value: "lessThan", label: "Less Than" },
  { value: "equal", label: "Equal To" },
  { value: "notEqual", label: "Not Equal To" },
  { value: "between", label: "Between" },
  { value: "contains", label: "Contains" },
  { value: "beginsWith", label: "Begins With" },
  { value: "endsWith", label: "Ends With" },
];

const PRESET_FORMATS: { label: string; style: CondFormatStyle }[] = [
  { label: "Red Fill", style: { bgColor: "#fee2e2", textColor: "#991b1b" } },
  { label: "Yellow Fill", style: { bgColor: "#fef9c3", textColor: "#854d0e" } },
  { label: "Green Fill", style: { bgColor: "#dcfce7", textColor: "#166534" } },
  { label: "Blue Fill", style: { bgColor: "#dbeafe", textColor: "#1e40af" } },
  { label: "Bold Red", style: { textColor: "#dc2626", bold: true } },
  { label: "Bold Green", style: { textColor: "#16a34a", bold: true } },
];

function getDefaultRange(
  selectionRange: ConditionalFormatDialogProps["selectionRange"],
  selectedCell: string,
): string {
  if (selectionRange) {
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
    return `${cellRef(minR, minC)}:${cellRef(maxR, maxC)}`;
  }
  return selectedCell;
}

export function ConditionalFormatDialog({
  open,
  onOpenChange,
  rules,
  onSave,
  selectionRange,
  selectedCell,
}: ConditionalFormatDialogProps) {
  const [editingRules, setEditingRules] = useState<CondFormatRule[]>(rules);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Sync when dialog opens
  const prevOpen = useState(open)[0];
  if (open && !prevOpen) {
    setEditingRules([...rules]);
    setEditingIndex(null);
  }

  function addRule() {
    const newRule: CondFormatRule = {
      id: crypto.randomUUID(),
      type: "value",
      range: getDefaultRange(selectionRange, selectedCell),
      priority: editingRules.length,
      operator: "greaterThan",
      value1: "0",
      format: PRESET_FORMATS[0].style,
    };
    setEditingRules([...editingRules, newRule]);
    setEditingIndex(editingRules.length);
  }

  function removeRule(index: number) {
    const updated = editingRules.filter((_, i) => i !== index);
    setEditingRules(updated);
    if (editingIndex === index) setEditingIndex(null);
  }

  function updateRule(index: number, partial: Partial<CondFormatRule>) {
    const updated = [...editingRules];
    updated[index] = { ...updated[index], ...partial };
    setEditingRules(updated);
  }

  function handleSave() {
    onSave(editingRules);
    onOpenChange(false);
  }

  const editRule = editingIndex !== null ? editingRules[editingIndex] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Conditional Formatting Rules</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Rules list */}
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {editingRules.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">
                No rules defined. Click "Add Rule" to create one.
              </p>
            )}
            {editingRules.map((rule, i) => (
              <div
                key={rule.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer ${
                  editingIndex === i
                    ? "bg-accent border border-primary/30"
                    : "hover:bg-accent/50"
                }`}
                onClick={() => setEditingIndex(i)}
                onKeyDown={() => {}}
              >
                <div
                  className="w-4 h-4 rounded border shrink-0"
                  style={{
                    backgroundColor: rule.format?.bgColor ?? "#fff",
                    borderColor: rule.format?.textColor ?? "#ccc",
                  }}
                />
                <span className="flex-1 truncate">
                  {rule.type === "value" && rule.operator
                    ? `${OPERATORS.find((o) => o.value === rule.operator)?.label ?? rule.operator} ${rule.value1 ?? ""}`
                    : rule.type === "colorScale"
                      ? "Color Scale"
                      : rule.type === "dataBar"
                        ? "Data Bar"
                        : rule.type === "formula"
                          ? `Formula: ${rule.formula ?? ""}`
                          : rule.type === "duplicates"
                            ? "Duplicate Values"
                            : `${rule.type}`}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {rule.range}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRule(i);
                  }}
                >
                  <Trash2 className="size-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addRule}
            className="w-full"
          >
            <Plus className="size-3.5 mr-1" /> Add Rule
          </Button>

          {/* Edit selected rule */}
          {editRule && editingIndex !== null && (
            <div className="space-y-3 border-t pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Rule Type</Label>
                  <Select
                    value={editRule.type}
                    onValueChange={(v) =>
                      updateRule(editingIndex, {
                        type: v as CondFormatRuleType,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map((t) => (
                        <SelectItem
                          key={t.value}
                          value={t.value}
                          className="text-xs"
                        >
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Applies to</Label>
                  <Input
                    value={editRule.range}
                    onChange={(e) =>
                      updateRule(editingIndex, { range: e.target.value })
                    }
                    className="h-7 text-xs font-mono"
                  />
                </div>
              </div>

              {editRule.type === "value" && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={editRule.operator ?? "greaterThan"}
                      onValueChange={(v) =>
                        updateRule(editingIndex, {
                          operator: v as CondFormatOperator,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((o) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            className="text-xs"
                          >
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={editRule.value1 ?? ""}
                      onChange={(e) =>
                        updateRule(editingIndex, { value1: e.target.value })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  {editRule.operator === "between" && (
                    <div className="space-y-1">
                      <Label className="text-xs">And</Label>
                      <Input
                        value={editRule.value2 ?? ""}
                        onChange={(e) =>
                          updateRule(editingIndex, { value2: e.target.value })
                        }
                        className="h-7 text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {editRule.type === "formula" && (
                <div className="space-y-1">
                  <Label className="text-xs">Formula (must return TRUE)</Label>
                  <Input
                    value={editRule.formula ?? ""}
                    onChange={(e) =>
                      updateRule(editingIndex, { formula: e.target.value })
                    }
                    placeholder="A1>100"
                    className="h-7 text-xs font-mono"
                  />
                </div>
              )}

              {editRule.type === "colorScale" && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Min Color</Label>
                    <Input
                      type="color"
                      value={editRule.colorScale?.minColor ?? "#f87171"}
                      onChange={(e) =>
                        updateRule(editingIndex, {
                          colorScale: {
                            ...(editRule.colorScale ?? {
                              minColor: "#f87171",
                              maxColor: "#4ade80",
                            }),
                            minColor: e.target.value,
                          },
                        })
                      }
                      className="h-7 w-full p-0.5"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mid Color</Label>
                    <Input
                      type="color"
                      value={editRule.colorScale?.midColor ?? "#fbbf24"}
                      onChange={(e) =>
                        updateRule(editingIndex, {
                          colorScale: {
                            ...(editRule.colorScale ?? {
                              minColor: "#f87171",
                              maxColor: "#4ade80",
                            }),
                            midColor: e.target.value,
                          },
                        })
                      }
                      className="h-7 w-full p-0.5"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Color</Label>
                    <Input
                      type="color"
                      value={editRule.colorScale?.maxColor ?? "#4ade80"}
                      onChange={(e) =>
                        updateRule(editingIndex, {
                          colorScale: {
                            ...(editRule.colorScale ?? {
                              minColor: "#f87171",
                              maxColor: "#4ade80",
                            }),
                            maxColor: e.target.value,
                          },
                        })
                      }
                      className="h-7 w-full p-0.5"
                    />
                  </div>
                </div>
              )}

              {editRule.type === "dataBar" && (
                <div className="space-y-1">
                  <Label className="text-xs">Bar Color</Label>
                  <Input
                    type="color"
                    value={editRule.dataBar?.color ?? "#3b82f6"}
                    onChange={(e) =>
                      updateRule(editingIndex, {
                        dataBar: {
                          color: e.target.value,
                          showValue: editRule.dataBar?.showValue ?? true,
                        },
                      })
                    }
                    className="h-7 w-24 p-0.5"
                  />
                </div>
              )}

              {/* Format presets */}
              {(editRule.type === "value" ||
                editRule.type === "formula" ||
                editRule.type === "duplicates" ||
                editRule.type === "topBottom") && (
                <div className="space-y-1">
                  <Label className="text-xs">Format</Label>
                  <div className="flex gap-1 flex-wrap">
                    {PRESET_FORMATS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          updateRule(editingIndex, { format: preset.style })
                        }
                        className="px-2 py-0.5 rounded text-[10px] border transition-colors hover:ring-1 hover:ring-primary"
                        style={{
                          backgroundColor: preset.style.bgColor,
                          color: preset.style.textColor,
                          fontWeight: preset.style.bold ? 600 : 400,
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
