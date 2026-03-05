"use client";

import { Loader2, Save } from "lucide-react";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/** Reusable single-select pill button group with roving tabIndex */
export function PillSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (index + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      next = (index - 1 + options.length) % options.length;
    }
    if (next !== -1) {
      onChange(options[next].id);
      buttonRefs.current[next]?.focus();
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-2 flex-wrap"
      >
        {options.map((o, index) => (
          <button
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            tabIndex={value === o.id || (value === "" && index === 0) ? 0 : -1}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-accent",
              value === o.id && "border-primary bg-primary/5 font-medium",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Reusable multi-select checkbox grid */
export function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
  idPrefix,
}: {
  label: string;
  options: readonly { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <div key={o.id} className="flex items-center gap-2">
            <Checkbox
              id={`${idPrefix}-${o.id}`}
              checked={selected.includes(o.id)}
              onCheckedChange={() => onToggle(o.id)}
            />
            <Label
              htmlFor={`${idPrefix}-${o.id}`}
              className="text-sm cursor-pointer"
            >
              {o.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Reusable save button with loading state */
export function SaveButton({
  onClick,
  isSubmitting,
  disabled,
  label = "Save",
}: {
  onClick: () => void;
  isSubmitting: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isSubmitting || disabled}
      size="sm"
    >
      {isSubmitting ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <Save className="mr-2 size-4" />
      )}
      {label}
    </Button>
  );
}

/** Reusable date input field */
export function DateField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={max ?? new Date().toISOString().split("T")[0]}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

/** Reusable textarea with character counter */
export function TextareaField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  placeholder?: string;
}) {
  const id = useId();
  const counterId = `${id}-counter`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <span
          id={counterId}
          className="text-xs text-muted-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {value.length}/{maxLength}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={3}
        aria-describedby={counterId}
        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

/** Reusable labeled switch row */
export function SwitchField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
