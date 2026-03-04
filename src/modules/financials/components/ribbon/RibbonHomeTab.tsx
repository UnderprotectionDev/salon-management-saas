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
  FunctionSquare,
  Italic,
  Merge,
  PaintBucket,
  Percent,
  Redo2,
  Scissors,
  Search,
  Sigma,
  Type,
  Underline,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { NUMBER_FORMATS, type NumberFormat } from "../../lib/number-format";
import { ColorPicker } from "../ColorPicker";
import { SectionLabel, TBtn } from "./TBtn";

interface RibbonHomeTabProps {
  // Formatting
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  fontSize: string;
  fontFamily: string;
  numberFormat: NumberFormat;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onAlignChange: (a: "left" | "center" | "right") => void;
  onFontSizeChange: (s: string) => void;
  onFontFamilyChange: (f: string) => void;
  onFillColor: (color: string | null) => void;
  onTextColor: (color: string | null) => void;
  onNumberFormatChange: (format: NumberFormat) => void;
  // Clipboard
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // Merge
  mergeCells: () => void;
  unmergeCells: () => void;
  hasSelectionRange: boolean;
  // Editing
  handleAutoSum: (fn: string) => void;
  handleSort: (ascending: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  // Formulas
  onToggleFormulaSidebar?: () => void;
  formulaSidebarOpen?: boolean;
}

export function RibbonHomeTab({
  bold,
  italic,
  underline,
  align,
  fontSize,
  fontFamily,
  numberFormat,
  onBold,
  onItalic,
  onUnderline,
  onAlignChange,
  onFontSizeChange,
  onFontFamilyChange,
  onFillColor,
  onTextColor,
  onNumberFormatChange,
  copySelection,
  cutSelection,
  pasteSelection,
  undo,
  redo,
  canUndo,
  canRedo,
  mergeCells,
  unmergeCells,
  hasSelectionRange,
  handleAutoSum,
  handleSort,
  setSearchOpen,
  hasActiveFilters,
  clearAllFilters,
  onToggleFormulaSidebar,
  formulaSidebarOpen,
}: RibbonHomeTabProps) {
  return (
    <>
      {/* Clipboard + Undo/Redo section */}
      <div className="flex flex-col items-center gap-0 shrink-0">
        <div className="flex items-center gap-0.5">
          <TBtn
            icon={<Undo2 className="w-3.5 h-3.5" />}
            label="Undo"
            shortcut="Ctrl+Z"
            onClick={undo}
            disabled={!canUndo}
          />
          <TBtn
            icon={<Redo2 className="w-3.5 h-3.5" />}
            label="Redo"
            shortcut="Ctrl+Y"
            onClick={redo}
            disabled={!canRedo}
          />
          <TBtn
            icon={<Clipboard className="w-3.5 h-3.5" />}
            label="Copy"
            shortcut="Ctrl+C"
            onClick={copySelection}
          />
          <TBtn
            icon={<Scissors className="w-3.5 h-3.5" />}
            label="Cut"
            shortcut="Ctrl+X"
            onClick={cutSelection}
          />
          <TBtn
            icon={<ClipboardPaste className="w-3.5 h-3.5" />}
            label="Paste"
            shortcut="Ctrl+V"
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
            <SelectTrigger className="h-7 text-xs w-16">
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
            label="Bold"
            shortcut="Ctrl+B"
            active={bold}
            onClick={onBold}
          />
          <TBtn
            icon={<Italic className="w-3.5 h-3.5" />}
            label="Italic"
            shortcut="Ctrl+I"
            active={italic}
            onClick={onItalic}
          />
          <TBtn
            icon={<Underline className="w-3.5 h-3.5" />}
            label="Underline"
            shortcut="Ctrl+U"
            active={underline}
            onClick={onUnderline}
          />
          <ColorPicker
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded text-foreground"
                aria-label="Fill Color"
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
                aria-label="Text Color"
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
                <SelectItem key={f.value} value={f.value} className="text-xs">
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
          {/* AutoSum split-button: direct SUM + dropdown */}
          <div className="flex items-center">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 rounded-r-none text-foreground"
                    onClick={() => handleAutoSum("SUM")}
                  >
                    <Sigma className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <span>AutoSum</span>
                  <kbd className="ml-1.5 px-1 py-0.5 text-[10px] font-mono bg-muted/50 border border-border/50 rounded">
                    Alt+=
                  </kbd>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-4 px-0 rounded-l-none text-foreground"
                >
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
          </div>
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
            label="Find"
            shortcut="Ctrl+F"
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

      {/* Formulas sidebar toggle */}
      {onToggleFormulaSidebar && (
        <>
          <Separator orientation="vertical" className="h-8 mx-1 shrink-0" />
          <div className="flex flex-col items-center gap-0 shrink-0">
            <TBtn
              icon={<FunctionSquare className="w-3.5 h-3.5" />}
              label="Formulas"
              active={formulaSidebarOpen}
              onClick={onToggleFormulaSidebar}
            />
            <SectionLabel>Formulas</SectionLabel>
          </div>
        </>
      )}
    </>
  );
}
