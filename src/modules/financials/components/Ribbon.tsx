"use client";

import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildSelectionFormula,
  copyFormulaToClipboard,
  type FormulaFn,
} from "../lib/formula-helpers";
import {
  type AutoSumDeps,
  handleAutoSum as handleAutoSumHelper,
  handleExportCsv,
  handleSort as handleSortHelper,
} from "../lib/ribbon-helpers";
import { useSpreadsheet } from "../lib/spreadsheet-context";
import { RibbonHomeTab } from "./ribbon/RibbonHomeTab";
import { RibbonViewTab } from "./ribbon/RibbonViewTab";

const RIBBON_TABS = ["Home", "View"];

interface RibbonProps {
  actions?: ReactNode;
  onToggleFormulaSidebar?: () => void;
  formulaSidebarOpen?: boolean;
  onOpenShortcuts?: () => void;
}

export function Ribbon({
  actions,
  onToggleFormulaSidebar,
  formulaSidebarOpen,
  onOpenShortcuts,
}: RibbonProps) {
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
    // Merge
    mergeCells,
    unmergeCells,
    // Grid size (for export)
    rowCount,
    columnCount,
  } = useSpreadsheet();

  const [activeTab, setActiveTab] = useState("Home");

  const hasActiveFilters = Object.keys(columnFilters).length > 0;
  const hasFrozen = freezeRow > 0 || freezeCol > 0;
  const hasSelectionRange =
    selectionRange != null &&
    (Math.abs(selectionRange.startRow - selectionRange.endRow) > 0 ||
      Math.abs(selectionRange.startCol - selectionRange.endCol) > 0);

  async function handleAutoSum(fn: string) {
    const deps: AutoSumDeps = {
      selectionRange,
      selectedCell,
      readOnlyCells,
      cells,
      onCellChange,
      setEditingValue,
      buildSelectionFormula: (fn, range) =>
        buildSelectionFormula(fn as FormulaFn, range),
      copyFormulaToClipboard,
    };
    await handleAutoSumHelper(fn, deps);
  }

  function handleSort(ascending: boolean) {
    handleSortHelper(ascending, {
      selectionRange,
      selectedCell,
      cells,
      readOnlyCells,
      onCellChange,
    });
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

        {actions && (
          <div className="flex items-center gap-2 ml-auto pb-1">{actions}</div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 h-10 overflow-hidden bg-background">
        {activeTab === "Home" && (
          <RibbonHomeTab
            bold={bold}
            italic={italic}
            underline={underline}
            align={align}
            fontSize={fontSize}
            fontFamily={fontFamily}
            numberFormat={numberFormat}
            onBold={onBold}
            onItalic={onItalic}
            onUnderline={onUnderline}
            onAlignChange={onAlignChange}
            onFontSizeChange={onFontSizeChange}
            onFontFamilyChange={onFontFamilyChange}
            onFillColor={onFillColor}
            onTextColor={onTextColor}
            onNumberFormatChange={onNumberFormatChange}
            copySelection={copySelection}
            cutSelection={cutSelection}
            pasteSelection={pasteSelection}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            mergeCells={mergeCells}
            unmergeCells={unmergeCells}
            hasSelectionRange={hasSelectionRange}
            handleAutoSum={handleAutoSum}
            handleSort={handleSort}
            setSearchOpen={setSearchOpen}
            hasActiveFilters={hasActiveFilters}
            clearAllFilters={clearAllFilters}
            onToggleFormulaSidebar={onToggleFormulaSidebar}
            formulaSidebarOpen={formulaSidebarOpen}
          />
        )}

        {activeTab === "View" && (
          <RibbonViewTab
            selectedCell={selectedCell}
            hasFrozen={hasFrozen}
            setFreeze={setFreeze}
            handleExportCsv={() =>
              handleExportCsv(cells, rowCount, columnCount)
            }
            onOpenShortcuts={onOpenShortcuts}
          />
        )}
      </div>
    </div>
  );
}
