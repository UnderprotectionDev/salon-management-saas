"use client";

import type { Editor } from "@tiptap/react";
import { Highlighter } from "lucide-react";
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

interface HighlightToolbarProps {
  editor: Editor;
}

// Highlight colors: light pastels that keep dark text readable (WCAG AA ≥ 4.5:1)
// Inspired by Notion's subtle backgrounds + Tailwind 50/100/200 shades
// Row 1: Softest (Tailwind 100) — subtle like Notion
// Row 2: Medium (Tailwind 200) — visible highlight
// Row 3: Vivid (Tailwind 300) — strong emphasis
const HIGHLIGHTS = [
  { label: "Default", value: "" },
  // Row 1 — Softest (Tailwind 100)
  { label: "Gray 100", value: "#f3f4f6" },
  { label: "Red 100", value: "#fee2e2" },
  { label: "Orange 100", value: "#ffedd5" },
  { label: "Amber 100", value: "#fef3c7" },
  { label: "Yellow 100", value: "#fef9c3" },
  { label: "Green 100", value: "#dcfce7" },
  { label: "Teal 100", value: "#ccfbf1" },
  { label: "Blue 100", value: "#dbeafe" },
  { label: "Purple 100", value: "#f3e8ff" },
  { label: "Pink 100", value: "#fce7f3" },
  // Row 2 — Medium (Tailwind 200)
  { label: "Gray 200", value: "#e5e7eb" },
  { label: "Red 200", value: "#fecaca" },
  { label: "Orange 200", value: "#fed7aa" },
  { label: "Amber 200", value: "#fde68a" },
  { label: "Yellow 200", value: "#fef08a" },
  { label: "Green 200", value: "#bbf7d0" },
  { label: "Teal 200", value: "#99f6e4" },
  { label: "Blue 200", value: "#bfdbfe" },
  { label: "Purple 200", value: "#e9d5ff" },
  { label: "Pink 200", value: "#fbcfe8" },
  // Row 3 — Vivid (Tailwind 300)
  { label: "Gray 300", value: "#d1d5db" },
  { label: "Red 300", value: "#fca5a5" },
  { label: "Orange 300", value: "#fdba74" },
  { label: "Amber 300", value: "#fcd34d" },
  { label: "Yellow 300", value: "#fde047" },
  { label: "Green 300", value: "#86efac" },
  { label: "Teal 300", value: "#5eead4" },
  { label: "Blue 300", value: "#93c5fd" },
  { label: "Purple 300", value: "#d8b4fe" },
  { label: "Pink 300", value: "#f9a8d4" },
];

export function HighlightToolbar({ editor }: HighlightToolbarProps) {
  const currentColor =
    (editor.getAttributes("highlight").color as string) ?? "";

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
            >
              <Highlighter className="size-4" />
              {(currentColor || editor.isActive("highlight")) && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-3.5 rounded-full"
                  style={{
                    backgroundColor: currentColor || "#fef08a",
                  }}
                />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Highlight</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">
          Highlight
        </p>
        <div className="grid grid-cols-11 gap-1">
          {HIGHLIGHTS.map((color) => {
            const isActive = color.value
              ? editor.isActive("highlight", { color: color.value })
              : !editor.isActive("highlight");
            return (
              <button
                key={color.label}
                type="button"
                className={cn(
                  "size-6 rounded border hover:scale-110 transition-transform",
                  isActive ? "border-foreground ring-1 ring-foreground" : "border-border",
                )}
                style={{
                  backgroundColor: color.value || "transparent",
                }}
                title={color.label}
                aria-label={color.label}
                aria-pressed={isActive}
                onClick={() => {
                  if (color.value) {
                    editor
                      .chain()
                      .focus()
                      .toggleHighlight({ color: color.value })
                      .run();
                  } else {
                    editor.chain().focus().unsetHighlight().run();
                  }
                }}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
