"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { NumberFormat } from "../lib/number-format";
import { SpreadsheetProvider } from "../lib/spreadsheet-context";
import type { CellData, CellMap, SheetTab } from "../lib/spreadsheet-types";
import { cellRef } from "../lib/spreadsheet-utils";
import { FormulaBar } from "./FormulaBar";
import { Ribbon } from "./Ribbon";
import { SearchOverlay } from "./SearchOverlay";
import { SheetTabs } from "./SheetTabs";
import { SpreadsheetGrid } from "./SpreadsheetGrid";

interface SpreadsheetShellProps {
  tabs: SheetTab[];
  activeTab: string;
  onTabChange: (id: string) => void;

  /** Cell data for the active tab */
  cells: CellMap;
  /** Callback when a cell is changed */
  onCellChange: (ref: string, data: CellData) => void;
  /** Set of cell refs that cannot be edited */
  readOnlyCells?: Set<string>;

  /** Column count for the active tab */
  columnCount: number;
  /** Whether the active tab is a fixed (non-editable columns) tab */
  isFixedTab: boolean;
  /** Callback to add a column (freeform only) */
  onAddColumn?: () => void;
  /** Callback to remove the last column (freeform only) */
  onDeleteLastColumn?: () => void;

  /** Row count for the active tab */
  rowCount: number;
  /** Callback to add a row (freeform only) */
  onAddRow?: () => void;
  /** Callback to remove the last row (freeform only) */
  onDeleteLastRow?: () => void;

  /** Tab management callbacks */
  onAddSheet?: () => void;
  onRenameSheet?: (id: string, name: string) => void;
  onDeleteSheet?: (id: string) => void;

  /** Ribbon actions slot (DateRangePicker, Add Expense, Export, etc.) */
  ribbonActions?: ReactNode;
  /** Dashboard slot (KPI cards) */
  dashboard?: ReactNode;
}

export function SpreadsheetShell({
  tabs,
  activeTab,
  onTabChange,
  cells,
  onCellChange,
  readOnlyCells = new Set(),
  columnCount,
  isFixedTab,
  onAddColumn,
  onDeleteLastColumn,
  rowCount,
  onAddRow,
  onDeleteLastRow,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
  ribbonActions,
  dashboard,
}: SpreadsheetShellProps) {
  const [selectedCell, setSelectedCell] = useState("A1");
  const [selectionRange, setSelectionRange] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);
  const [editingValue, setEditingValue] = useState(cells.A1?.value ?? "");
  const [zoom, setZoom] = useState(100);
  const [searchOpen, setSearchOpen] = useState(false);

  // Clamp selected cell when column/row count decreases
  useEffect(() => {
    const m = selectedCell.match(/^([A-Z]+)(\d+)$/);
    if (!m) return;
    let col = 0;
    for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
    const row = Number.parseInt(m[2], 10);
    const needClamp = col > columnCount || row > rowCount;
    if (needClamp) {
      setSelectedCell(
        cellRef(
          Math.max(0, Math.min(row - 1, rowCount - 1)),
          Math.max(0, Math.min(col - 1, columnCount - 1)),
        ),
      );
      setSelectionRange(null);
    }
  }, [columnCount, rowCount, selectedCell]);

  // Optimistic cell overlay: provides instant UI feedback in the same render
  // cycle as setEditingCell(null). Cleared when props.cells changes (DB caught up).
  const [optimisticCells, setOptimisticCells] = useState<CellMap>({});
  const prevCellsRef = useRef(cells);

  useEffect(() => {
    if (cells !== prevCellsRef.current) {
      prevCellsRef.current = cells;
      setOptimisticCells({});
    }
  }, [cells]);

  // Formatting state
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [align, setAlign] = useState<"left" | "center" | "right">("left");
  const [fontSize, setFontSize] = useState("12");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [numberFormat, setNumberFormat] = useState<NumberFormat>("general");

  // Clipboard buffer
  const clipboardRef = useRef<{
    cells: Record<string, CellData>;
    cut: boolean;
  } | null>(null);

  // Merge optimistic overlay on top of prop cells.
  // This ensures SpreadsheetGrid sees the new value in the SAME render
  // cycle as setEditingCell(null), without waiting for parent re-render.
  const mergedCells =
    Object.keys(optimisticCells).length > 0
      ? { ...cells, ...optimisticCells }
      : cells;

  function handleCellChange(ref: string, data: CellData) {
    // Write to local state so Grid sees the update immediately
    setOptimisticCells((prev) => ({ ...prev, [ref]: data }));
    // Forward to parent (triggers mutation + withOptimisticUpdate)
    onCellChange(ref, data);
  }

  // Get all refs in the current selection range
  function getSelectionRefs(): string[] {
    if (!selectionRange) return [selectedCell];
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
    const refs: string[] = [];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        refs.push(cellRef(r, c));
      }
    }
    return refs;
  }

  function getSelectedCoords(): { row: number; col: number } {
    const m = selectedCell.match(/^([A-Z]+)(\d+)$/);
    if (!m) return { row: 0, col: 0 };
    let col = 0;
    for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
    return { row: Number.parseInt(m[2], 10) - 1, col: col - 1 };
  }

  // Apply a format key/value to all selected cells
  function applyFormatToSelection(key: keyof CellData, value: unknown) {
    const refs = getSelectionRefs();
    for (const ref of refs) {
      if (readOnlyCells.has(ref)) continue;
      const existing = mergedCells[ref] ?? { value: "" };
      handleCellChange(ref, { ...existing, [key]: value });
    }
  }

  // Handle selecting a cell - sync formatting state
  function handleSetSelectedCell(ref: string) {
    setSelectedCell(ref);
    const cellData = mergedCells[ref];
    setEditingValue(cellData?.value ?? "");
    setBold(cellData?.bold ?? false);
    setItalic(cellData?.italic ?? false);
    setUnderline(cellData?.underline ?? false);
    setAlign(cellData?.align ?? "left");
    setFontSize(cellData?.fontSize ?? "12");
    setFontFamily(cellData?.fontFamily ?? "Inter");
    setNumberFormat(cellData?.numberFormat ?? "general");
  }

  // Handle tab change - reset selection state
  function handleTabChange(id: string) {
    setSelectedCell("A1");
    setSelectionRange(null);
    setEditingValue("");
    setBold(false);
    setItalic(false);
    setUnderline(false);
    setAlign("left");
    setFontSize("12");
    setFontFamily("Inter");
    setNumberFormat("general");
    onTabChange(id);
  }

  // Formatting callbacks
  function handleBold() {
    const next = !bold;
    setBold(next);
    applyFormatToSelection("bold", next);
  }

  function handleItalic() {
    const next = !italic;
    setItalic(next);
    applyFormatToSelection("italic", next);
  }

  function handleUnderline() {
    const next = !underline;
    setUnderline(next);
    applyFormatToSelection("underline", next);
  }

  function handleAlignChange(a: "left" | "center" | "right") {
    setAlign(a);
    applyFormatToSelection("align", a);
  }

  function handleFontSizeChange(s: string) {
    setFontSize(s);
    applyFormatToSelection("fontSize", s);
  }

  function handleFontFamilyChange(f: string) {
    setFontFamily(f);
    applyFormatToSelection("fontFamily", f);
  }

  function handleFillColor(color: string | null) {
    applyFormatToSelection("bgColor", color ?? undefined);
  }

  function handleTextColor(color: string | null) {
    applyFormatToSelection("textColor", color ?? undefined);
  }

  function handleNumberFormatChange(format: NumberFormat) {
    setNumberFormat(format);
    applyFormatToSelection("numberFormat", format);
  }

  // Clipboard operations
  function handleCopy() {
    const refs = getSelectionRefs();
    const copied: Record<string, CellData> = {};
    for (const ref of refs) {
      if (mergedCells[ref]) copied[ref] = { ...mergedCells[ref] };
    }
    clipboardRef.current = { cells: copied, cut: false };

    // Also copy plain text to system clipboard
    const text = refs.map((r) => mergedCells[r]?.value ?? "").join("\t");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function handleCut() {
    const refs = getSelectionRefs();
    const copied: Record<string, CellData> = {};
    for (const ref of refs) {
      if (mergedCells[ref]) copied[ref] = { ...mergedCells[ref] };
    }
    clipboardRef.current = { cells: copied, cut: true };

    // Clear cut cells
    for (const ref of refs) {
      if (!readOnlyCells.has(ref) && mergedCells[ref]) {
        handleCellChange(ref, { ...mergedCells[ref], value: "" });
      }
    }

    const text = refs.map((r) => mergedCells[r]?.value ?? "").join("\t");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function handlePaste() {
    if (!clipboardRef.current) return;
    const { row: targetRow, col: targetCol } = getSelectedCoords();
    const sourceRefs = Object.keys(clipboardRef.current.cells);
    if (sourceRefs.length === 0) return;

    // Find source origin
    let minRow = Number.MAX_SAFE_INTEGER;
    let minCol = Number.MAX_SAFE_INTEGER;
    for (const ref of sourceRefs) {
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) continue;
      let c = 0;
      for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
      minRow = Math.min(minRow, Number.parseInt(m[2], 10) - 1);
      minCol = Math.min(minCol, c - 1);
    }

    for (const [ref, data] of Object.entries(clipboardRef.current.cells)) {
      const m = ref.match(/^([A-Z]+)(\d+)$/);
      if (!m) continue;
      let c = 0;
      for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
      const r = Number.parseInt(m[2], 10) - 1;

      const newRow = targetRow + (r - minRow);
      const newCol = targetCol + (c - 1 - minCol);
      const newRef = cellRef(newRow, newCol);

      if (!readOnlyCells.has(newRef)) {
        handleCellChange(newRef, { ...data });
      }
    }

    if (clipboardRef.current.cut) {
      clipboardRef.current = null;
    }
  }

  return (
    <SpreadsheetProvider
      value={{
        cells: mergedCells,
        onCellChange: handleCellChange,
        selectedCell,
        setSelectedCell: handleSetSelectedCell,
        selectionRange,
        setSelectionRange,
        editingValue,
        setEditingValue,
        zoom,
        setZoom,
        bold,
        italic,
        underline,
        align,
        fontSize,
        fontFamily,
        onBold: handleBold,
        onItalic: handleItalic,
        onUnderline: handleUnderline,
        onAlignChange: handleAlignChange,
        onFontSizeChange: handleFontSizeChange,
        onFontFamilyChange: handleFontFamilyChange,
        onFillColor: handleFillColor,
        onTextColor: handleTextColor,
        numberFormat,
        onNumberFormatChange: handleNumberFormatChange,
        copySelection: handleCopy,
        cutSelection: handleCut,
        pasteSelection: handlePaste,
        readOnlyCells,
        columnCount,
        isFixedTab,
        onAddColumn: onAddColumn ?? (() => {}),
        onDeleteLastColumn: onDeleteLastColumn ?? (() => {}),
        rowCount,
        onAddRow: onAddRow ?? (() => {}),
        onDeleteLastRow: onDeleteLastRow ?? (() => {}),
        searchOpen,
        setSearchOpen,
      }}
    >
      <div className="flex flex-col h-full">
        {/* Dashboard slot */}
        {dashboard && <div className="shrink-0 px-1 pb-2">{dashboard}</div>}

        {/* Excel frame */}
        <div
          className="flex flex-col flex-1 min-h-0"
          data-spreadsheet-light=""
          style={{ border: "1px solid var(--sheet-grid)" }}
        >
          <Ribbon actions={ribbonActions} />
          <FormulaBar />

          {/* Grid area with zoom */}
          <div
            className="flex-1 overflow-hidden relative"
            style={
              zoom !== 100
                ? {
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "top left",
                    width: `${10000 / zoom}%`,
                    height: `${10000 / zoom}%`,
                  }
                : undefined
            }
          >
            <SpreadsheetGrid />
            <SearchOverlay
              open={searchOpen}
              onClose={() => setSearchOpen(false)}
            />
          </div>

          <SheetTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onAddSheet={onAddSheet}
            onRenameSheet={onRenameSheet}
            onDeleteSheet={onDeleteSheet}
          />
        </div>
      </div>
    </SpreadsheetProvider>
  );
}
