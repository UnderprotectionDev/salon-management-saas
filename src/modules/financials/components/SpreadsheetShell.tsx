"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useClipboard } from "../hooks/useClipboard";
import { useColumnFilters } from "../hooks/useColumnFilters";
import { useColumnWidths } from "../hooks/useColumnWidths";
import { useFillHandle } from "../hooks/useFillHandle";
import { useFormattingState } from "../hooks/useFormattingState";
import { useRowColOps } from "../hooks/useRowColOps";
import { useUndoHistory } from "../hooks/useUndoHistory";
import { assignRefColors, extractFormulaRefs } from "../lib/formula-refs";
import type { MergedRegion } from "../lib/merge-utils";
import { addMerge, findMergeForCell, removeMerge } from "../lib/merge-utils";
import { SpreadsheetProvider } from "../lib/spreadsheet-context";
import type {
  CellData,
  CellMap,
  ContextMenuState,
  SheetTab,
} from "../lib/spreadsheet-types";
import { cellRef } from "../lib/spreadsheet-utils";
import { FormulaBar } from "./FormulaBar";
import { FormulaSidebar } from "./FormulaSidebar";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { Ribbon } from "./Ribbon";
import { SearchOverlay } from "./SearchOverlay";
import { SheetTabs } from "./SheetTabs";
import { SpreadsheetGrid } from "./SpreadsheetGrid";
import { WelcomeOverlay } from "./WelcomeOverlay";

interface SpreadsheetShellProps {
  tabs: SheetTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  cells: CellMap;
  onCellChange: (ref: string, data: CellData) => void;
  onBulkReplace?: (cells: CellMap) => void;
  readOnlyCells?: Set<string>;
  columnCount: number;
  onAddColumn?: () => void;
  onDeleteLastColumn?: () => void;
  rowCount: number;
  onAddRow?: () => void;
  onDeleteLastRow?: () => void;
  onAddSheet?: () => void;
  onRenameSheet?: (id: string, name: string) => void;
  onDeleteSheet?: (id: string) => void;
  ribbonActions?: ReactNode;
  onSetFreeze?: (row: number, col: number) => void;
  onSetMergedRegions?: (regions: MergedRegion[]) => void;
  customFormulas?: Record<string, string>;
  customFormulasDocs?: Array<{
    _id: Id<"customFormulas">;
    name: string;
    body: string;
    description?: string;
  }>;
}

export function SpreadsheetShell({
  tabs,
  activeTab,
  onTabChange,
  cells,
  onCellChange,
  onBulkReplace,
  readOnlyCells = new Set(),
  columnCount,
  onAddColumn,
  onDeleteLastColumn,
  rowCount,
  onAddRow,
  onDeleteLastRow,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
  ribbonActions,
  onSetFreeze,
  onSetMergedRegions,
  customFormulas = {},
  customFormulasDocs = [],
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [formulaSidebarOpen, setFormulaSidebarOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const undoHistory = useUndoHistory();
  const { columnWidths, setColumnWidth, resetWidths } = useColumnWidths();
  const {
    columnFilters,
    setColumnFilter,
    clearAllFilters,
    getFilteredRowIndices,
  } = useColumnFilters();

  const filteredRowIndices = getFilteredRowIndices(
    cells,
    columnCount,
    rowCount,
  );

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

  // Optimistic cell overlay
  const [optimisticCells, setOptimisticCells] = useState<CellMap>({});
  const prevCellsRef = useRef(cells);

  useEffect(() => {
    if (cells !== prevCellsRef.current) {
      prevCellsRef.current = cells;
      setOptimisticCells({});
    }
  }, [cells]);

  // Formula mode state
  const [formulaCursorPos, setFormulaCursorPos] = useState(0);

  // Get active tab data
  const activeTabData = tabs.find((t) => t.id === activeTab);
  const freezeRow = activeTabData?.freezeRow ?? 0;
  const freezeCol = activeTabData?.freezeCol ?? 0;
  const mergedRegions: MergedRegion[] = activeTabData?.mergedRegions ?? [];

  const mergedCells =
    Object.keys(optimisticCells).length > 0
      ? { ...cells, ...optimisticCells }
      : cells;

  const isFormulaMode = editingValue.startsWith("=");
  const formulaRefHighlights = isFormulaMode
    ? assignRefColors(extractFormulaRefs(editingValue))
    : new Map<string, string>();

  function handleCellChange(ref: string, data: CellData) {
    const before = mergedCells[ref] ?? { value: "" };
    undoHistory.pushChange(ref, before, data);
    setOptimisticCells((prev) => ({ ...prev, [ref]: data }));
    onCellChange(ref, data);
  }

  function handleUndo() {
    const entries = undoHistory.undo();
    if (!entries) return;
    for (const entry of entries) {
      setOptimisticCells((prev) => ({ ...prev, [entry.ref]: entry.before }));
      onCellChange(entry.ref, entry.before);
    }
  }

  function handleRedo() {
    const entries = undoHistory.redo();
    if (!entries) return;
    for (const entry of entries) {
      setOptimisticCells((prev) => ({ ...prev, [entry.ref]: entry.after }));
      onCellChange(entry.ref, entry.after);
    }
  }

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

  // ---- Extracted Hooks ----
  const formatting = useFormattingState({
    getSelectionRefs,
    mergedCells,
    readOnlyCells,
    handleCellChange,
  });

  const clipboard = useClipboard({
    getSelectionRefs,
    getSelectedCoords,
    mergedCells,
    readOnlyCells,
    handleCellChange,
  });

  const rowColOps = useRowColOps({
    mergedCells,
    rowCount,
    columnCount,
    mergedRegions,
    onBulkReplace,
    onAddRow,
    onDeleteLastRow,
    onAddColumn,
    onDeleteLastColumn,
    onSetMergedRegions,
    undoHistory,
    setOptimisticCells,
  });

  const fillHandle = useFillHandle({
    selectionRange,
    getSelectedCoords,
    mergedCells,
    readOnlyCells,
    onCellChange,
    undoHistory,
    setOptimisticCells,
    setSelectionRange,
  });

  // Handle selecting a cell - sync formatting state
  function handleSetSelectedCell(ref: string) {
    setSelectedCell(ref);
    const cellData = mergedCells[ref];
    setEditingValue(cellData?.value ?? "");
    formatting.syncFormattingFromCell(cellData);
  }

  // Handle tab change - reset all state
  function handleTabChange(id: string) {
    setSelectedCell("A1");
    setSelectionRange(null);
    setEditingValue("");
    formatting.resetFormatting();
    setContextMenu(null);
    clearAllFilters();
    resetWidths();
    undoHistory.clear();
    onTabChange(id);
  }

  // Formula mode: click-to-insert references
  function insertCellRefInFormula(ref: string) {
    if (!isFormulaMode) return;
    const before = editingValue.slice(0, formulaCursorPos);
    const after = editingValue.slice(formulaCursorPos);
    const newVal = before + ref + after;
    setEditingValue(newVal);
    setFormulaCursorPos(before.length + ref.length);
  }

  function insertRangeRefInFormula(startRef: string, endRef: string) {
    if (!isFormulaMode) return;
    const rangeStr = `${startRef}:${endRef}`;
    const before = editingValue.slice(0, formulaCursorPos);
    const after = editingValue.slice(formulaCursorPos);
    const newVal = before + rangeStr + after;
    setEditingValue(newVal);
    setFormulaCursorPos(before.length + rangeStr.length);
  }

  // Freeze panes
  function handleSetFreeze(row: number, col: number) {
    onSetFreeze?.(row, col);
  }

  // Merge cells
  function handleMergeCells() {
    if (!selectionRange || !onSetMergedRegions) return;
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
    if (minR === maxR && minC === maxC) return;

    const newRegion: MergedRegion = {
      startRow: minR,
      startCol: minC,
      endRow: maxR,
      endCol: maxC,
    };
    const updated = addMerge(newRegion, mergedRegions);
    onSetMergedRegions(updated);

    const primaryRef = cellRef(minR, minC);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (r === minR && c === minC) continue;
        const ref = cellRef(r, c);
        if (mergedCells[ref]?.value) {
          handleCellChange(ref, { ...mergedCells[ref], value: "" });
        }
      }
    }
    const existing = mergedCells[primaryRef] ?? { value: "" };
    if (existing.align !== "center") {
      handleCellChange(primaryRef, { ...existing, align: "center" });
    }
  }

  function handleUnmergeCells() {
    if (!onSetMergedRegions) return;
    const { row, col } = getSelectedCoords();
    const region = findMergeForCell(row, col, mergedRegions);
    if (!region) return;
    const updated = removeMerge(row, col, mergedRegions);
    onSetMergedRegions(updated);
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
        bold: formatting.bold,
        italic: formatting.italic,
        underline: formatting.underline,
        align: formatting.align,
        fontSize: formatting.fontSize,
        fontFamily: formatting.fontFamily,
        onBold: formatting.handleBold,
        onItalic: formatting.handleItalic,
        onUnderline: formatting.handleUnderline,
        onAlignChange: formatting.handleAlignChange,
        onFontSizeChange: formatting.handleFontSizeChange,
        onFontFamilyChange: formatting.handleFontFamilyChange,
        onFillColor: formatting.handleFillColor,
        onTextColor: formatting.handleTextColor,
        numberFormat: formatting.numberFormat,
        onNumberFormatChange: formatting.handleNumberFormatChange,
        copySelection: clipboard.handleCopy,
        cutSelection: clipboard.handleCut,
        pasteSelection: clipboard.handlePaste,
        readOnlyCells,
        columnCount,
        onAddColumn: onAddColumn ?? (() => {}),
        onDeleteLastColumn: onDeleteLastColumn ?? (() => {}),
        rowCount,
        onAddRow: onAddRow ?? (() => {}),
        onDeleteLastRow: onDeleteLastRow ?? (() => {}),
        searchOpen,
        setSearchOpen,
        columnWidths,
        setColumnWidth,
        undo: handleUndo,
        redo: handleRedo,
        canUndo: undoHistory.canUndo,
        canRedo: undoHistory.canRedo,
        contextMenu,
        setContextMenu,
        columnFilters,
        setColumnFilter,
        clearAllFilters,
        filteredRowIndices,
        isFormulaMode,
        formulaCursorPos,
        setFormulaCursorPos,
        insertCellRefInFormula,
        insertRangeRefInFormula,
        formulaRefHighlights,
        insertRowAbove: rowColOps.handleInsertRowAbove,
        insertRowBelow: rowColOps.handleInsertRowBelow,
        deleteRow: rowColOps.handleDeleteRow,
        insertColumnLeft: rowColOps.handleInsertColumnLeft,
        insertColumnRight: rowColOps.handleInsertColumnRight,
        deleteColumn: rowColOps.handleDeleteColumn,
        fillHandleActive: fillHandle.fillHandleActive,
        fillHandleRange: fillHandle.fillHandleRange,
        onFillHandleStart: fillHandle.handleFillHandleStart,
        onFillHandleDrag: fillHandle.handleFillHandleDrag,
        onFillHandleEnd: fillHandle.handleFillHandleEnd,
        pasteSpecial: clipboard.doPaste,
        freezeRow,
        freezeCol,
        setFreeze: handleSetFreeze,
        mergedRegions,
        mergeCells: handleMergeCells,
        unmergeCells: handleUnmergeCells,
        formulaSidebarOpen,
        setFormulaSidebarOpen,
        customFormulas,
        onOpenShortcuts: () => setShortcutsOpen(true),
      }}
    >
      <div className="flex flex-col h-full">
        <div
          className="flex flex-col flex-1 min-h-0"
          data-spreadsheet-light=""
          style={{ border: "1px solid var(--sheet-grid)" }}
        >
          <Ribbon
            actions={ribbonActions}
            onToggleFormulaSidebar={() => setFormulaSidebarOpen((v) => !v)}
            formulaSidebarOpen={formulaSidebarOpen}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />
          <FormulaBar />

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-w-0 overflow-hidden relative">
              <div
                style={
                  zoom !== 100
                    ? {
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: "top left",
                        width: `${10000 / zoom}%`,
                        height: `${10000 / zoom}%`,
                      }
                    : { width: "100%", height: "100%" }
                }
              >
                <SpreadsheetGrid />
              </div>
              <SearchOverlay
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
              />
              <WelcomeOverlay cellCount={Object.keys(mergedCells).length} />
            </div>

            {formulaSidebarOpen && (
              <FormulaSidebar
                onClose={() => setFormulaSidebarOpen(false)}
                customFormulasDocs={customFormulasDocs}
              />
            )}
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

        <KeyboardShortcutsDialog
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
        />
      </div>
    </SpreadsheetProvider>
  );
}
