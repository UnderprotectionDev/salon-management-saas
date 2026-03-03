"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import type {
  ValidationOperator,
  ValidationRule,
  ValidationRuleType,
} from "../lib/validation-types";

interface ValidationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRule?: ValidationRule;
  onSave: (rule: ValidationRule | undefined) => void;
  cellRef: string;
}

const RULE_TYPES: { value: ValidationRuleType; label: string }[] = [
  { value: "number", label: "Number" },
  { value: "dropdown", label: "List (Dropdown)" },
  { value: "date", label: "Date" },
  { value: "textLength", label: "Text Length" },
  { value: "custom", label: "Custom Formula" },
];

const OPERATORS: { value: ValidationOperator; label: string }[] = [
  { value: "between", label: "Between" },
  { value: "notBetween", label: "Not Between" },
  { value: "equal", label: "Equal To" },
  { value: "notEqual", label: "Not Equal To" },
  { value: "greaterThan", label: "Greater Than" },
  { value: "lessThan", label: "Less Than" },
  { value: "greaterThanOrEqual", label: "Greater Than or Equal" },
  { value: "lessThanOrEqual", label: "Less Than or Equal" },
];

export function ValidationRuleDialog({
  open,
  onOpenChange,
  currentRule,
  onSave,
  cellRef,
}: ValidationRuleDialogProps) {
  const [ruleType, setRuleType] = useState<ValidationRuleType>(
    currentRule?.type ?? "number",
  );
  const [operator, setOperator] = useState<ValidationOperator>(
    currentRule?.operator ?? "between",
  );
  const [value1, setValue1] = useState(currentRule?.value1 ?? "");
  const [value2, setValue2] = useState(currentRule?.value2 ?? "");
  const [dropdownValues, setDropdownValues] = useState(
    currentRule?.dropdownValues ?? "",
  );
  const [integerOnly, setIntegerOnly] = useState(
    currentRule?.integerOnly ?? false,
  );
  const [positiveOnly, setPositiveOnly] = useState(
    currentRule?.positiveOnly ?? false,
  );
  const [formula, setFormula] = useState(currentRule?.formula ?? "");
  const [errorMessage, setErrorMessage] = useState(
    currentRule?.errorMessage ?? "",
  );
  const [warningOnly, setWarningOnly] = useState(
    currentRule?.warningOnly ?? false,
  );

  const needsOperator =
    ruleType === "number" || ruleType === "date" || ruleType === "textLength";
  const needsTwoValues = operator === "between" || operator === "notBetween";

  function handleSave() {
    const rule: ValidationRule = {
      type: ruleType,
      ...(needsOperator && { operator }),
      ...(needsOperator && value1 && { value1 }),
      ...(needsOperator && needsTwoValues && value2 && { value2 }),
      ...(ruleType === "dropdown" && { dropdownValues }),
      ...(ruleType === "number" && integerOnly && { integerOnly }),
      ...(ruleType === "number" && positiveOnly && { positiveOnly }),
      ...(ruleType === "custom" && { formula }),
      ...(errorMessage && { errorMessage }),
      ...(warningOnly && { warningOnly }),
    };
    onSave(rule);
    onOpenChange(false);
  }

  function handleRemove() {
    onSave(undefined);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Data Validation — {cellRef}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Rule Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Allow</Label>
            <Select
              value={ruleType}
              onValueChange={(v) => setRuleType(v as ValidationRuleType)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Operator (for number, date, textLength) */}
          {needsOperator && (
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Select
                value={operator}
                onValueChange={(v) => setOperator(v as ValidationOperator)}
              >
                <SelectTrigger className="h-8 text-xs">
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
          )}

          {/* Value inputs */}
          {needsOperator && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {needsTwoValues ? "Minimum" : "Value"}
                </Label>
                <Input
                  type={ruleType === "date" ? "date" : "text"}
                  value={value1}
                  onChange={(e) => setValue1(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              {needsTwoValues && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Maximum</Label>
                  <Input
                    type={ruleType === "date" ? "date" : "text"}
                    value={value2}
                    onChange={(e) => setValue2(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {/* Number-specific options */}
          {ruleType === "number" && (
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="integerOnly"
                  checked={integerOnly}
                  onCheckedChange={setIntegerOnly}
                />
                <Label htmlFor="integerOnly" className="text-xs">
                  Integer only
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="positiveOnly"
                  checked={positiveOnly}
                  onCheckedChange={setPositiveOnly}
                />
                <Label htmlFor="positiveOnly" className="text-xs">
                  Positive only
                </Label>
              </div>
            </div>
          )}

          {/* Dropdown values */}
          {ruleType === "dropdown" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Source (comma-separated values)</Label>
              <Input
                value={dropdownValues}
                onChange={(e) => setDropdownValues(e.target.value)}
                placeholder="Option1, Option2, Option3"
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Custom formula */}
          {ruleType === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Formula (must return TRUE)</Label>
              <Input
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="A1>0"
                className="h-8 text-xs font-mono"
              />
            </div>
          )}

          {/* Error message */}
          <div className="space-y-1.5">
            <Label className="text-xs">Error Message (optional)</Label>
            <Input
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="Please enter a valid value"
              className="h-8 text-xs"
            />
          </div>

          {/* Warning only toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="warningOnly"
              checked={warningOnly}
              onCheckedChange={setWarningOnly}
            />
            <Label htmlFor="warningOnly" className="text-xs">
              Show as warning (allow entry, but highlight)
            </Label>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {currentRule && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              className="mr-auto"
            >
              Remove
            </Button>
          )}
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
