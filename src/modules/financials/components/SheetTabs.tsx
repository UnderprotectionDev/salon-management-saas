"use client";

import { Plus, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSpreadsheet } from "../lib/spreadsheet-context";
import { evalFormula } from "../lib/spreadsheet-formula";
import type { SheetTab } from "../lib/spreadsheet-types";
import { colLabel } from "../lib/spreadsheet-utils";

interface SheetTabsProps {
  tabs: SheetTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onAddSheet?: () => void;
  onRenameSheet?: (id: string, name: string) => void;
  onDeleteSheet?: (id: string) => void;
}

export function SheetTabs({
  tabs,
  activeTab,
  onTabChange,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
}: SheetTabsProps) {
  const { cells, selectedCell, selectionRange, zoom, setZoom } =
    useSpreadsheet();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Compute stats for selected range
  const selectedValues: number[] = [];
  if (selectionRange) {
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const ref = `${colLabel(c)}${r + 1}`;
        const raw = cells[ref]?.value;
        if (raw) {
          let resolved: string;
          try {
            resolved = raw.startsWith("=") ? evalFormula(raw, cells) : raw;
          } catch {
            continue;
          }
          const n = Number(resolved);
          if (!Number.isNaN(n)) selectedValues.push(n);
        }
      }
    }
  } else {
    const raw = cells[selectedCell]?.value;
    if (raw) {
      let resolved: string;
      try {
        resolved = raw.startsWith("=") ? evalFormula(raw, cells) : raw;
      } catch {
        resolved = raw;
      }
      const n = Number(resolved);
      if (!Number.isNaN(n)) selectedValues.push(n);
    }
  }

  const sum = selectedValues.reduce((a, b) => a + b, 0);
  const avg = selectedValues.length > 0 ? sum / selectedValues.length : 0;
  const count = selectionRange
    ? (Math.abs(selectionRange.endRow - selectionRange.startRow) + 1) *
      (Math.abs(selectionRange.endCol - selectionRange.startCol) + 1)
    : 1;

  function startRename(tab: SheetTab) {
    setRenamingId(tab.id);
    setRenameValue(tab.label);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      onRenameSheet?.(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }

  return (
    <div className="border-t border-border bg-background shrink-0">
      {/* Sheet tabs row */}
      <div className="flex items-stretch h-9 border-b border-border">
        <div className="flex items-end flex-1 overflow-x-auto px-2 gap-0.5 pt-1.5">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                onDoubleClick={() => startRename(tab)}
                className={cn(
                  "relative px-3.5 h-full text-xs rounded-t-md border border-b-0 transition-colors cursor-default whitespace-nowrap select-none flex items-center gap-1",
                  isActive
                    ? "bg-background border-border text-foreground font-medium z-10 -mb-px"
                    : "bg-muted/50 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {isActive && (
                  <span className="absolute inset-x-0 top-0 h-0.5 rounded-t-md bg-[var(--sheet-active-ring)]" />
                )}
                {renamingId === tab.id ? (
                  <input
                    // biome-ignore lint/a11y/noAutofocus: needed for inline rename UX
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="text-xs outline-none bg-transparent w-20"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  tab.label
                )}
                {/* Delete button */}
                {isActive && onDeleteSheet && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSheet(tab.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onDeleteSheet(tab.id);
                      }
                    }}
                    className="ml-1 hover:text-destructive cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}

          {onAddSheet && (
            <TooltipProvider delayDuration={400}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAddSheet}
                    className="h-7 w-7 p-0 self-center ml-0.5 rounded-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Add Sheet
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 h-7 bg-muted/30">
        {/* Left: status + stats */}
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-muted-foreground font-medium">
            Ready
          </span>
          {selectedValues.length > 1 && (
            <>
              <span className="text-[11px] text-muted-foreground">
                Avg:{" "}
                <span className="text-foreground font-medium">
                  {avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Count:{" "}
                <span className="text-foreground font-medium">{count}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Sum:{" "}
                <span className="text-foreground font-medium">
                  {sum.toLocaleString()}
                </span>
              </span>
            </>
          )}
        </div>

        {/* Right: zoom */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setZoom(Math.max(25, zoom - 10))}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <div className="w-20">
            <Slider
              min={25}
              max={200}
              step={5}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              className="w-full"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => setZoom(Math.min(200, zoom + 10))}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="text-[11px] text-muted-foreground hover:text-foreground w-10 text-right tabular-nums transition-colors"
          >
            {zoom}%
          </button>
        </div>
      </div>
    </div>
  );
}
