"use client";

import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildSelectionFormula,
  copyFormulaToClipboard,
  type FormulaFn,
} from "../lib/formula-helpers";
import { type ColumnWidths, GRID } from "../lib/spreadsheet-types";

interface FormulaQuickBarProps {
  selectionRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  columnWidths: ColumnWidths;
}

const BUTTONS: { fn: FormulaFn; symbol: string; label: string }[] = [
  { fn: "SUM", symbol: "Σ", label: "SUM" },
  { fn: "AVERAGE", symbol: "x̄", label: "AVERAGE" },
  { fn: "COUNT", symbol: "#", label: "COUNT" },
  { fn: "MAX", symbol: "↑", label: "MAX" },
  { fn: "MIN", symbol: "↓", label: "MIN" },
];

export function FormulaQuickBar({
  selectionRange,
  columnWidths,
}: FormulaQuickBarProps) {
  if (!selectionRange) return null;

  const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
  const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
  const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
  const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);

  // Single cell — don't show
  if (minR === maxR && minC === maxC) return null;

  // Compute pixel position: bottom-right corner of selection
  // Inside the relative container, so no scroll offset needed
  let left = GRID.ROW_HEADER_WIDTH;
  for (let c = 0; c <= maxC; c++) {
    left += columnWidths[c] ?? GRID.DEFAULT_COL_WIDTH;
  }
  const top = GRID.COL_HEADER_HEIGHT + (maxR + 1) * GRID.ROW_HEIGHT + 4;

  async function handleClick(fn: FormulaFn) {
    const formula = buildSelectionFormula(fn, selectionRange);
    if (!formula) return;
    const ok = await copyFormulaToClipboard(formula);
    if (ok) toast.success(`Copied ${formula}`);
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: prevent grid mousedown from clearing selection
    <div
      style={{
        position: "absolute",
        left: left + 4,
        top,
        zIndex: 50,
      }}
      className="flex items-center gap-0.5 bg-popover border border-border rounded-md shadow-md px-1 py-0.5"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <TooltipProvider delayDuration={300}>
        {BUTTONS.map(({ fn, symbol, label }) => (
          <Tooltip key={fn}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleClick(fn)}
                className="w-6 h-6 flex items-center justify-center text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
              >
                {symbol}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Copy ={label}() formula
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
