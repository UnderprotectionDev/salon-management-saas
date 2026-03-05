"use client";

import type { Editor } from "@tiptap/react";
import { Baseline } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ColorToolbarProps {
  editor: Editor;
}

// Tailwind-derived palette: 10 hues x 5 shades (darkest→lightest)
// Text colors need sufficient contrast on white (WCAG AA ≥ 4.5:1)
// Organized like Google Docs: grayscale column + 9 hue columns, 5 lightness rows
const COLORS = [
  { label: "Default", value: "" },
  // Row 1 — Grayscale (9 items to fill grid-cols-9)
  { label: "Black", value: "#000000" },
  { label: "Dark Charcoal", value: "#1f2937" },
  { label: "Dark Gray", value: "#374151" },
  { label: "Gray", value: "#6b7280" },
  { label: "Light Gray", value: "#9ca3af" },
  { label: "Silver", value: "#d1d5db" },
  { label: "Light Silver", value: "#e5e7eb" },
  { label: "Near White", value: "#f3f4f6" },
  { label: "White", value: "#ffffff" },
  // Row 2 — Darkest (Tailwind 900)
  { label: "Red 900", value: "#7f1d1d" },
  { label: "Orange 900", value: "#7c2d12" },
  { label: "Amber 900", value: "#78350f" },
  { label: "Green 900", value: "#14532d" },
  { label: "Teal 900", value: "#134e4a" },
  { label: "Blue 900", value: "#1e3a5f" },
  { label: "Indigo 900", value: "#312e81" },
  { label: "Purple 900", value: "#581c87" },
  { label: "Pink 900", value: "#831843" },
  // Row 3 — Dark (Tailwind 700)
  { label: "Red 700", value: "#b91c1c" },
  { label: "Orange 700", value: "#c2410c" },
  { label: "Amber 700", value: "#b45309" },
  { label: "Green 700", value: "#15803d" },
  { label: "Teal 700", value: "#0f766e" },
  { label: "Blue 700", value: "#1d4ed8" },
  { label: "Indigo 700", value: "#4338ca" },
  { label: "Purple 700", value: "#7e22ce" },
  { label: "Pink 700", value: "#be185d" },
  // Row 4 — Base (Tailwind 500)
  { label: "Red 500", value: "#ef4444" },
  { label: "Orange 500", value: "#f97316" },
  { label: "Amber 500", value: "#f59e0b" },
  { label: "Green 500", value: "#22c55e" },
  { label: "Teal 500", value: "#14b8a6" },
  { label: "Blue 500", value: "#3b82f6" },
  { label: "Indigo 500", value: "#6366f1" },
  { label: "Purple 500", value: "#a855f7" },
  { label: "Pink 500", value: "#ec4899" },
  // Row 5 — Light (Tailwind 300) — lower contrast, use on large text only
  { label: "Red 300", value: "#fca5a5" },
  { label: "Orange 300", value: "#fdba74" },
  { label: "Amber 300", value: "#fcd34d" },
  { label: "Green 300", value: "#86efac" },
  { label: "Teal 300", value: "#5eead4" },
  { label: "Blue 300", value: "#93c5fd" },
  { label: "Indigo 300", value: "#a5b4fc" },
  { label: "Purple 300", value: "#d8b4fe" },
  { label: "Pink 300", value: "#f9a8d4" },
];

export function ColorToolbar({ editor }: ColorToolbarProps) {
  const currentColor = editor.getAttributes("textStyle").color ?? "";

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 relative"
              aria-label="Text color"
            >
              <Baseline className="size-4" />
              {currentColor && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-3.5 rounded-full"
                  style={{ backgroundColor: currentColor }}
                />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Text Color</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Text Color
        </p>
        <button
          type="button"
          className={cn(
            "mb-1.5 w-full rounded border px-2 py-1 text-xs hover:bg-accent transition-colors",
            !currentColor
              ? "border-foreground ring-1 ring-foreground"
              : "border-border",
          )}
          aria-label="Default color"
          aria-pressed={!currentColor}
          onClick={() => editor.chain().focus().unsetColor().run()}
        >
          Default
        </button>
        <div className="grid grid-cols-9 gap-1">
          {COLORS.filter((c) => c.value).map((color) => {
            const isActive = currentColor === color.value;
            return (
              <button
                key={color.label}
                type="button"
                className={cn(
                  "size-6 rounded border hover:scale-110 transition-transform",
                  isActive
                    ? "border-foreground ring-1 ring-foreground"
                    : "border-border",
                )}
                style={{ backgroundColor: color.value }}
                title={color.label}
                aria-label={color.label}
                aria-pressed={isActive}
                onClick={() =>
                  editor.chain().focus().setColor(color.value).run()
                }
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
