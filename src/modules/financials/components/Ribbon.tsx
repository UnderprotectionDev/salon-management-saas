"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownAZ,
  ArrowUpZA,
  Bold,
  ChevronDown,
  Clipboard,
  ClipboardPaste,
  DollarSign,
  FilterX,
  Italic,
  Lock,
  Merge,
  PaintBucket,
  Palette,
  Percent,
  Redo2,
  Scissors,
  Search,
  ShieldCheck,
  Sigma,
  Type,
  Underline,
  Undo2,
  Unlock,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  buildSelectionFormula,
  copyFormulaToClipboard,
  type FormulaFn,
} from "../lib/formula-helpers";
import { NUMBER_FORMATS, type NumberFormat } from "../lib/number-format";
import { useSpreadsheet } from "../lib/spreadsheet-context";
import { parseRef } from "../lib/spreadsheet-formula";
import type { CellData } from "../lib/spreadsheet-types";
import { cellRef, colLabel } from "../lib/spreadsheet-utils";
import { ColorPicker } from "./ColorPicker";

interface TBtnProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

function TBtn({ icon, label, onClick, active, disabled }: TBtnProps) {
  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              "h-7 w-7 p-0 rounded text-foreground",
              active && "bg-accent text-accent-foreground",
            )}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[9px] text-muted-foreground font-medium tracking-wide uppercase select-none">
      {children}
    </span>
  );
}

const RIBBON_TABS = ["Home", "View", "Data"];

interface RibbonProps {
  actions?: ReactNode;
}

export function Ribbon({ actions }: RibbonProps) {
  const {
    bold,
    italic,
    underline,
    align,
    fontSize,
    fontFamily,
    onBold,
    onItalic,
    onUnderline,
    onAlignChange,
    onFontSizeChange,
    onFontFamilyChange,
    onFillColor,
    onTextColor,
    numberFormat,
    onNumberFormatChange,
    copySelection,
    cutSelection,
    pasteSelection,
    setSearchOpen,
    cells,
    selectedCell,
    selectionRange,
    onCellChange,
    readOnlyCells,
    setEditingValue,
    undo,
    redo,
    canUndo,
    canRedo,
    clearAllFilters,
    columnFilters,
    // Freeze
    freezeRow,
    freezeCol,
    setFreeze,
    rowCount,
    columnCount,
    // Merge
    mergeCells,
    unmergeCells,
    // Validation
    openValidationDialog,
    // Conditional formatting
    openConditionalFormatDialog,
  } = useSpreadsheet();

  const [activeTab, setActiveTab] = useState("Home");

  const hasActiveFilters = Object.keys(columnFilters).length > 0;
  const hasFrozen = freezeRow > 0 || freezeCol > 0;

  // Parsed selected cell for freeze menus
  const selectedRef = parseRef(selectedCell);
  const selectedRowIdx = selectedRef?.row ?? 0; // 0-indexed
  const selectedColIdx = selectedRef?.col ?? 0; // 0-indexed
  const selectedColLetter = colLabel(selectedColIdx);
  const selectedRowNum = selectedRowIdx + 1; // 1-indexed display

  // Check if selection has a merge
  const hasSelectionRange =
    selectionRange &&
    (Math.abs(selectionRange.startRow - selectionRange.endRow) > 0 ||
      Math.abs(selectionRange.startCol - selectionRange.endCol) > 0);

  // Strip currency/percent/locale formatting so we can detect numeric values
  function normalizeNumeric(val: string): number {
    const cleaned = val
      .replace(/[₺$€%\s]/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    return Number(cleaned);
  }

  // AutoSum helper — if multi-cell selection, copy formula to clipboard;
  // otherwise fall back to inserting into the active cell
  async function handleAutoSum(fn: string) {
    // Multi-cell selection → copy formula to clipboard
    if (hasSelectionRange && selectionRange) {
      const formula = buildSelectionFormula(fn as FormulaFn, selectionRange);
      if (formula) {
        const ok = await copyFormulaToClipboard(formula);
        if (ok) toast.success(`Copied ${formula}`);
      }
      return;
    }

    // Single cell — scan upward for contiguous numbers
    if (readOnlyCells.has(selectedCell)) return;
    const m = selectedCell.match(/^([A-Z]+)(\d+)$/);
    if (!m) return;
    const col = m[1];
    const row = Number.parseInt(m[2], 10);

    let startRow = row - 1;
    while (startRow >= 1) {
      const ref = `${col}${startRow}`;
      const val = cells[ref]?.value?.trim();
      if (!val || Number.isNaN(normalizeNumeric(val))) break;
      startRow--;
    }
    startRow++;

    if (startRow < row) {
      const formula = `=${fn}(${col}${startRow}:${col}${row - 1})`;
      const existing = cells[selectedCell] ?? { value: "" };
      onCellChange(selectedCell, { ...existing, value: formula });
      setEditingValue(formula);
    }
  }

  // Auto-detect contiguous data region from a cell
  function detectDataRegion(cellRefStr: string): {
    minR: number;
    maxR: number;
    minC: number;
    maxC: number;
    sortColOffset: number;
  } | null {
    const parsed = parseRef(cellRefStr);
    if (!parsed) return null;
    const { row: selRow, col: selCol } = parsed;

    const hasData = (r: number, c: number) =>
      !!cells[cellRef(r, c)]?.value?.trim();

    let minR = selRow;
    while (minR > 0 && hasData(minR - 1, selCol)) minR--;

    let maxR = selRow;
    while (maxR < 999 && hasData(maxR + 1, selCol)) maxR++;

    if (minR === maxR) return null;

    let minC = selCol;
    while (minC > 0) {
      let found = false;
      for (let r = minR; r <= maxR; r++) {
        if (hasData(r, minC - 1)) {
          found = true;
          break;
        }
      }
      if (!found) break;
      minC--;
    }

    let maxC = selCol;
    while (maxC < 51) {
      let found = false;
      for (let r = minR; r <= maxR; r++) {
        if (hasData(r, maxC + 1)) {
          found = true;
          break;
        }
      }
      if (!found) break;
      maxC++;
    }

    return { minR, maxR, minC, maxC, sortColOffset: selCol - minC };
  }

  // Sort helper
  function handleSort(ascending: boolean) {
    let minR: number;
    let maxR: number;
    let minC: number;
    let maxC: number;
    let sortColOffset = 0;

    const hasMultiRowSelection =
      selectionRange &&
      Math.abs(selectionRange.startRow - selectionRange.endRow) > 0;

    if (hasMultiRowSelection) {
      minR = Math.min(selectionRange.startRow, selectionRange.endRow);
      maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
      minC = Math.min(selectionRange.startCol, selectionRange.endCol);
      maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
      sortColOffset = 0;
    } else {
      if (!selectedCell) return;
      const region = detectDataRegion(selectedCell);
      if (!region) return;
      minR = region.minR;
      maxR = region.maxR;
      minC = region.minC;
      maxC = region.maxC;
      sortColOffset = region.sortColOffset;
    }

    const rows: { row: number; cells: (CellData | undefined)[] }[] = [];
    for (let r = minR; r <= maxR; r++) {
      const rowCells: (CellData | undefined)[] = [];
      for (let c = minC; c <= maxC; c++) {
        const ref = `${colLabel(c)}${r + 1}`;
        rowCells.push(cells[ref] ? { ...cells[ref] } : undefined);
      }
      rows.push({ row: r, cells: rowCells });
    }

    rows.sort((a, b) => {
      const aVal = a.cells[sortColOffset]?.value ?? "";
      const bVal = b.cells[sortColOffset]?.value ?? "";
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return ascending ? aNum - bNum : bNum - aNum;
      }
      return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const ref = `${colLabel(c)}${r + 1}`;
        if (readOnlyCells.has(ref)) return;
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const r = minR + i;
      for (let c = minC; c <= maxC; c++) {
        const ref = `${colLabel(c)}${r + 1}`;
        const cellData = rows[i].cells[c - minC];
        onCellChange(ref, cellData ?? { value: "" });
      }
    }
  }

  return (
    <div className="flex flex-col bg-background border-b border-border select-none shrink-0">
      {/* Tab bar */}
      <div className="flex items-end px-2 gap-0 bg-muted/30 border-b border-border">
        {RIBBON_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-colors cursor-default relative",
              activeTab === tab
                ? "text-primary after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:bg-primary after:rounded-t"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}

        {/* Right: tab-specific actions */}
        {actions && (
          <div className="flex items-center gap-2 ml-auto pb-1">{actions}</div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 h-10 overflow-x-auto bg-background">
        {activeTab === "Home" && (
          <>
            {/* Clipboard + Undo/Redo section */}
            <div className="flex flex-col items-center gap-0 shrink-0">
              <div className="flex items-center gap-0.5">
                <TBtn
                  icon={<Undo2 className="w-3.5 h-3.5" />}
                  label="Undo (Ctrl+Z)"
                  onClick={undo}
                  disabled={!canUndo}
                />
                <TBtn
                  icon={<Redo2 className="w-3.5 h-3.5" />}
                  label="Redo (Ctrl+Y)"
                  onClick={redo}
                  disabled={!canRedo}
                />
                <TBtn
                  icon={<Clipboard className="w-3.5 h-3.5" />}
                  label="Copy (Ctrl+C)"
                  onClick={copySelection}
                />
                <TBtn
                  icon={<Scissors className="w-3.5 h-3.5" />}
                  label="Cut (Ctrl+X)"
                  onClick={cutSelection}
                />
                <TBtn
                  icon={<ClipboardPaste className="w-3.5 h-3.5" />}
                  label="Paste (Ctrl+V)"
                  onClick={pasteSelection}
                />
              </div>
              <SectionLabel>Clipboard</SectionLabel>
            </div>

            {/* Font section */}
            <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />
            <div className="flex flex-col items-center gap-0 shrink-0">
              <div className="flex items-center gap-0.5">
                <Select value={fontFamily} onValueChange={onFontFamilyChange}>
                  <SelectTrigger className="h-7 text-xs w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Inter",
                      "Arial",
                      "Georgia",
                      "Verdana",
                      "Courier New",
                      "Times New Roman",
                    ].map((f) => (
                      <SelectItem key={f} value={f} className="text-xs">
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={fontSize} onValueChange={onFontSizeChange}>
                  <SelectTrigger className="h-7 text-xs w-14">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "8",
                      "9",
                      "10",
                      "11",
                      "12",
                      "14",
                      "16",
                      "18",
                      "20",
                      "24",
                      "28",
                      "36",
                      "48",
                    ].map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <TBtn
                  icon={<Bold className="w-3.5 h-3.5" />}
                  label="Bold (Ctrl+B)"
                  active={bold}
                  onClick={onBold}
                />
                <TBtn
                  icon={<Italic className="w-3.5 h-3.5" />}
                  label="Italic (Ctrl+I)"
                  active={italic}
                  onClick={onItalic}
                />
                <TBtn
                  icon={<Underline className="w-3.5 h-3.5" />}
                  label="Underline (Ctrl+U)"
                  active={underline}
                  onClick={onUnderline}
                />
                <ColorPicker
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded text-foreground"
                    >
                      <PaintBucket className="w-3.5 h-3.5" />
                    </Button>
                  }
                  onColorSelect={onFillColor}
                />
                <ColorPicker
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded text-foreground"
                    >
                      <Type className="w-3.5 h-3.5" />
                    </Button>
                  }
                  onColorSelect={onTextColor}
                />
              </div>
              <SectionLabel>Font</SectionLabel>
            </div>

            {/* Alignment */}
            <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />
            <div className="flex flex-col items-center gap-0 shrink-0">
              <div className="flex items-center gap-0.5">
                <TBtn
                  icon={<AlignLeft className="w-3.5 h-3.5" />}
                  label="Align Left"
                  active={align === "left"}
                  onClick={() => onAlignChange("left")}
                />
                <TBtn
                  icon={<AlignCenter className="w-3.5 h-3.5" />}
                  label="Center"
                  active={align === "center"}
                  onClick={() => onAlignChange("center")}
                />
                <TBtn
                  icon={<AlignRight className="w-3.5 h-3.5" />}
                  label="Align Right"
                  active={align === "right"}
                  onClick={() => onAlignChange("right")}
                />
                {/* Merge & Center */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5 gap-0.5 text-xs text-foreground"
                    >
                      <Merge className="w-3.5 h-3.5" />
                      <ChevronDown className="w-2.5 h-2.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onSelect={() => mergeCells()}
                      disabled={!hasSelectionRange}
                    >
                      Merge & Center
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => unmergeCells()}>
                      Unmerge Cells
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <SectionLabel>Alignment</SectionLabel>
            </div>

            {/* Number section */}
            <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />
            <div className="flex flex-col items-center gap-0 shrink-0">
              <div className="flex items-center gap-0.5">
                <Select
                  value={numberFormat}
                  onValueChange={(v) => onNumberFormatChange(v as NumberFormat)}
                >
                  <SelectTrigger className="h-7 text-xs w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NUMBER_FORMATS.map((f) => (
                      <SelectItem
                        key={f.value}
                        value={f.value}
                        className="text-xs"
                      >
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <TBtn
                  icon={<DollarSign className="w-3.5 h-3.5" />}
                  label="Currency"
                  active={numberFormat === "currency"}
                  onClick={() =>
                    onNumberFormatChange(
                      numberFormat === "currency" ? "general" : "currency",
                    )
                  }
                />
                <TBtn
                  icon={<Percent className="w-3.5 h-3.5" />}
                  label="Percent"
                  active={numberFormat === "percent"}
                  onClick={() =>
                    onNumberFormatChange(
                      numberFormat === "percent" ? "general" : "percent",
                    )
                  }
                />
              </div>
              <SectionLabel>Number</SectionLabel>
            </div>

            <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />

            {/* Editing section */}
            <div className="flex flex-col items-center gap-0 shrink-0">
              <div className="flex items-center gap-0.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5 gap-0.5 text-xs text-foreground"
                    >
                      <Sigma className="w-3.5 h-3.5" />
                      <ChevronDown className="w-2.5 h-2.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onSelect={() => handleAutoSum("SUM")}>
                      SUM
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleAutoSum("AVERAGE")}>
                      AVERAGE
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleAutoSum("COUNT")}>
                      COUNT
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleAutoSum("MAX")}>
                      MAX
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleAutoSum("MIN")}>
                      MIN
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <TBtn
                  icon={<ArrowDownAZ className="w-3.5 h-3.5" />}
                  label="Sort A-Z"
                  onClick={() => handleSort(true)}
                />
                <TBtn
                  icon={<ArrowUpZA className="w-3.5 h-3.5" />}
                  label="Sort Z-A"
                  onClick={() => handleSort(false)}
                />
                <TBtn
                  icon={<Search className="w-3.5 h-3.5" />}
                  label="Find (Ctrl+F)"
                  onClick={() => setSearchOpen(true)}
                />
                {hasActiveFilters && (
                  <TBtn
                    icon={<FilterX className="w-3.5 h-3.5" />}
                    label="Clear All Filters"
                    onClick={clearAllFilters}
                  />
                )}
              </div>
              <SectionLabel>Editing</SectionLabel>
            </div>
          </>
        )}

        {activeTab === "Data" && (
          <>
            {/* Data Validation */}
            <div className="flex flex-col items-center gap-0 shrink-0">
              <div className="flex items-center gap-0.5">
                <TBtn
                  icon={<ShieldCheck className="w-3.5 h-3.5" />}
                  label="Data Validation"
                  onClick={() => openValidationDialog(selectedCell)}
                />
              </div>
              <SectionLabel>Validation</SectionLabel>
            </div>

            <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />

            {/* Conditional Formatting */}
            <div className="flex flex-col items-center gap-0 shrink-0">
              <div className="flex items-center gap-0.5">
                <TBtn
                  icon={<Palette className="w-3.5 h-3.5" />}
                  label="Conditional Formatting"
                  onClick={openConditionalFormatDialog}
                />
              </div>
              <SectionLabel>Conditional Format</SectionLabel>
            </div>

          </>
        )}

        {activeTab === "View" && (
          <>
            {/* Freeze section */}
            <div className="flex flex-col items-center gap-0 shrink-0">
              <div className="flex items-center gap-0.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 px-1.5 gap-0.5 text-xs text-foreground",
                        hasFrozen && "bg-accent text-accent-foreground",
                      )}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span className="text-xs">Freeze</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {/* Freeze Rows submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        Freeze Rows
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuCheckboxItem
                          checked={freezeRow === 0}
                          onSelect={() => setFreeze(0, freezeCol)}
                        >
                          No rows
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={freezeRow === 1}
                          onSelect={() => setFreeze(1, freezeCol)}
                        >
                          1 row
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={freezeRow === 2}
                          onSelect={() => setFreeze(2, freezeCol)}
                        >
                          2 rows
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={
                            freezeRow === selectedRowIdx + 1 &&
                            selectedRowIdx > 0
                          }
                          disabled={selectedRowIdx === 0}
                          onSelect={() =>
                            setFreeze(selectedRowIdx + 1, freezeCol)
                          }
                        >
                          Up to row {selectedRowNum} ({selectedRowIdx + 1}{" "}
                          {selectedRowIdx + 1 === 1 ? "row" : "rows"})
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Freeze Columns submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        Freeze Columns
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuCheckboxItem
                          checked={freezeCol === 0}
                          onSelect={() => setFreeze(freezeRow, 0)}
                        >
                          No columns
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={freezeCol === 1}
                          onSelect={() => setFreeze(freezeRow, 1)}
                        >
                          1 column
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={freezeCol === 2}
                          onSelect={() => setFreeze(freezeRow, 2)}
                        >
                          2 columns
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={
                            freezeCol === selectedColIdx + 1 &&
                            selectedColIdx > 0
                          }
                          disabled={selectedColIdx === 0}
                          onSelect={() =>
                            setFreeze(freezeRow, selectedColIdx + 1)
                          }
                        >
                          Up to column {selectedColLetter} ({selectedColIdx + 1}{" "}
                          {selectedColIdx + 1 === 1 ? "column" : "columns"})
                        </DropdownMenuCheckboxItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    {/* Freeze at selection */}
                    <DropdownMenuItem
                      onSelect={() =>
                        setFreeze(selectedRowIdx + 1, selectedColIdx + 1)
                      }
                      disabled={selectedRowIdx === 0 && selectedColIdx === 0}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Freeze at {selectedCell}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Unfreeze All */}
                    <DropdownMenuItem
                      onSelect={() => setFreeze(0, 0)}
                      disabled={!hasFrozen}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Unfreeze All
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <SectionLabel>Freeze Panes</SectionLabel>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
