"use client";

import { FileDown } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useColumnFilters } from "../hooks/useColumnFilters";
import { useColumnWidths } from "../hooks/useColumnWidths";
import type { UndoEntry } from "../hooks/useUndoHistory";
import { useUndoHistory } from "../hooks/useUndoHistory";
import {
  shiftColsLeft,
  shiftColsRight,
  shiftRowsDown,
  shiftRowsUp,
} from "../lib/cell-shift";
import type { CondFormatRule } from "../lib/conditional-format-types";
import {
  adjustFormulaRefs,
  detectSeries,
  generateFillValue,
} from "../lib/fill-series";
import { assignRefColors, extractFormulaRefs } from "../lib/formula-refs";
import type { MergedRegion } from "../lib/merge-utils";
import {
  addMerge,
  adjustMergesOnColShift,
  adjustMergesOnRowShift,
  findMergeForCell,
  removeMerge,
} from "../lib/merge-utils";
import type { NumberFormat } from "../lib/number-format";
import { exportToPdf } from "../lib/pdf-export";
import { SpreadsheetProvider } from "../lib/spreadsheet-context";
import type {
  CellData,
  CellMap,
  ContextMenuState,
  SheetTab,
} from "../lib/spreadsheet-types";
import { GRID } from "../lib/spreadsheet-types";
import { cellRef } from "../lib/spreadsheet-utils";
import type { ValidationRule } from "../lib/validation-types";
import { ConditionalFormatDialog } from "./ConditionalFormatDialog";
import { FormulaBar } from "./FormulaBar";
import { PdfExportDialog } from "./PdfExportDialog";
import { Ribbon } from "./Ribbon";
import { SearchOverlay } from "./SearchOverlay";
import { SheetTabs } from "./SheetTabs";
import { SpreadsheetGrid } from "./SpreadsheetGrid";
import { ValidationRuleDialog } from "./ValidationRuleDialog";

interface SpreadsheetShellProps {
  tabs: SheetTab[];
  activeTab: string;
  onTabChange: (id: string) => void;

  /** Cell data for the active tab */
  cells: CellMap;
  /** Callback when a cell is changed */
  onCellChange: (ref: string, data: CellData) => void;
  /** Replace all cells atomically (for row/col insert/delete) */
  onBulkReplace?: (cells: CellMap) => void;
  /** Set of cell refs that cannot be edited */
  readOnlyCells?: Set<string>;

  /** Column count for the active tab */
  columnCount: number;
  /** Callback to add a column */
  onAddColumn?: () => void;
  /** Callback to remove the last column */
  onDeleteLastColumn?: () => void;

  /** Row count for the active tab */
  rowCount: number;
  /** Callback to add a row */
  onAddRow?: () => void;
  /** Callback to remove the last row */
  onDeleteLastRow?: () => void;

  /** Tab management callbacks */
  onAddSheet?: () => void;
  onRenameSheet?: (id: string, name: string) => void;
  onDeleteSheet?: (id: string) => void;

  /** Ribbon actions slot */
  ribbonActions?: ReactNode;

  /** Freeze pane callbacks */
  onSetFreeze?: (row: number, col: number) => void;
  /** Merged regions callback */
  onSetMergedRegions?: (regions: MergedRegion[]) => void;
  /** Conditional format rules callback */
  onSetConditionalFormats?: (rules: CondFormatRule[]) => void;
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
  onSetConditionalFormats,
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

  // New hooks
  const undoHistory = useUndoHistory();
  const { columnWidths, setColumnWidth, resetWidths } = useColumnWidths();
  const {
    columnFilters,
    setColumnFilter,
    clearAllFilters,
    getFilteredRowIndices,
  } = useColumnFilters();

  // Compute filtered row indices
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

  // Formula mode state
  const [formulaCursorPos, setFormulaCursorPos] = useState(0);

  // Fill handle state
  const [fillHandleActive, setFillHandleActive] = useState(false);
  const [fillHandleRange, setFillHandleRange] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);

  // Validation dialog state
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationDialogRef, setValidationDialogRef] = useState("A1");

  // Conditional formatting dialog state
  const [condFormatDialogOpen, setCondFormatDialogOpen] = useState(false);

  // PDF export dialog state
  const [pdfExportDialogOpen, setPdfExportDialogOpen] = useState(false);

  // Get active tab data
  const activeTabData = tabs.find((t) => t.id === activeTab);
  const freezeRow = activeTabData?.freezeRow ?? 0;
  const freezeCol = activeTabData?.freezeCol ?? 0;
  const mergedRegions: MergedRegion[] = activeTabData?.mergedRegions ?? [];
  const conditionalFormats: CondFormatRule[] = activeTabData?.conditionalFormats
    ? typeof activeTabData.conditionalFormats === "string"
      ? JSON.parse(activeTabData.conditionalFormats as string)
      : activeTabData.conditionalFormats
    : [];

  // Merge optimistic overlay on top of prop cells.
  const mergedCells =
    Object.keys(optimisticCells).length > 0
      ? { ...cells, ...optimisticCells }
      : cells;

  // Formula mode detection
  const isFormulaMode = editingValue.startsWith("=");

  // Formula reference highlights
  const formulaRefHighlights = isFormulaMode
    ? assignRefColors(extractFormulaRefs(editingValue))
    : new Map<string, string>();

  function handleCellChange(ref: string, data: CellData) {
    const before = mergedCells[ref] ?? { value: "" };
    undoHistory.pushChange(ref, before, data);
    setOptimisticCells((prev) => ({ ...prev, [ref]: data }));
    onCellChange(ref, data);
  }

  // Undo/Redo (now supports batch)
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
    setContextMenu(null);
    clearAllFilters();
    resetWidths();
    undoHistory.clear();
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

    for (const ref of refs) {
      if (!readOnlyCells.has(ref) && mergedCells[ref]) {
        handleCellChange(ref, { ...mergedCells[ref], value: "" });
      }
    }

    const text = refs.map((r) => mergedCells[r]?.value ?? "").join("\t");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  async function handlePaste() {
    // If internal clipboard has data, use it (preserves formatting)
    if (clipboardRef.current) {
      doPaste("all");
      return;
    }

    // Fallback: read plain text from system clipboard (e.g. copied formula)
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const { row: targetRow, col: targetCol } = getSelectedCoords();
      const targetRef = cellRef(targetRow, targetCol);
      if (readOnlyCells.has(targetRef)) return;
      const existing = mergedCells[targetRef] ?? { value: "" };
      handleCellChange(targetRef, { ...existing, value: text });
    } catch {
      // clipboard read denied — ignore
    }
  }

  function doPaste(mode: "all" | "values" | "format") {
    if (!clipboardRef.current) return;
    const { row: targetRow, col: targetCol } = getSelectedCoords();
    const sourceRefs = Object.keys(clipboardRef.current.cells);
    if (sourceRefs.length === 0) return;

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
        const existing = mergedCells[newRef] ?? { value: "" };
        if (mode === "all") {
          handleCellChange(newRef, { ...data });
        } else if (mode === "values") {
          handleCellChange(newRef, { ...existing, value: data.value });
        } else if (mode === "format") {
          const { value: _v, ...format } = data;
          handleCellChange(newRef, { ...existing, ...format });
        }
      }
    }

    if (clipboardRef.current.cut) {
      clipboardRef.current = null;
    }
  }

  // ---- Formula mode: click-to-insert references ----
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

  // ---- Row/Column insert/delete ----
  function handleInsertRowAbove(row: number) {
    if (rowCount >= GRID.MAX_ROWS || !onBulkReplace || !onAddRow) return;
    const undoEntries: UndoEntry[] = [];
    const newCells = shiftRowsDown(mergedCells, row, rowCount);
    // Record undo: save before/after for all affected cells
    const allRefs = new Set([
      ...Object.keys(mergedCells),
      ...Object.keys(newCells),
    ]);
    for (const ref of allRefs) {
      const before = mergedCells[ref] ?? { value: "" };
      const after = newCells[ref] ?? { value: "" };
      if (
        before.value !== after.value ||
        JSON.stringify(before) !== JSON.stringify(after)
      ) {
        undoEntries.push({ ref, before, after });
      }
    }
    undoHistory.pushBatch(undoEntries);
    setOptimisticCells(newCells);
    onBulkReplace(newCells);
    onAddRow();
    // Update merged regions
    if (onSetMergedRegions && mergedRegions.length > 0) {
      onSetMergedRegions(adjustMergesOnRowShift(mergedRegions, row, 1));
    }
  }

  function handleInsertRowBelow(row: number) {
    handleInsertRowAbove(row + 1);
  }

  function handleDeleteRow(row: number) {
    if (rowCount <= 1 || !onBulkReplace || !onDeleteLastRow) return;
    const undoEntries: UndoEntry[] = [];
    const newCells = shiftRowsUp(mergedCells, row);
    const allRefs = new Set([
      ...Object.keys(mergedCells),
      ...Object.keys(newCells),
    ]);
    for (const ref of allRefs) {
      const before = mergedCells[ref] ?? { value: "" };
      const after = newCells[ref] ?? { value: "" };
      if (
        before.value !== after.value ||
        JSON.stringify(before) !== JSON.stringify(after)
      ) {
        undoEntries.push({ ref, before, after });
      }
    }
    undoHistory.pushBatch(undoEntries);
    setOptimisticCells(newCells);
    onBulkReplace(newCells);
    onDeleteLastRow();
    if (onSetMergedRegions && mergedRegions.length > 0) {
      onSetMergedRegions(adjustMergesOnRowShift(mergedRegions, row, -1));
    }
  }

  function handleInsertColumnLeft(col: number) {
    if (columnCount >= GRID.MAX_COLS || !onBulkReplace || !onAddColumn) return;
    const undoEntries: UndoEntry[] = [];
    const newCells = shiftColsRight(mergedCells, col, columnCount);
    const allRefs = new Set([
      ...Object.keys(mergedCells),
      ...Object.keys(newCells),
    ]);
    for (const ref of allRefs) {
      const before = mergedCells[ref] ?? { value: "" };
      const after = newCells[ref] ?? { value: "" };
      if (
        before.value !== after.value ||
        JSON.stringify(before) !== JSON.stringify(after)
      ) {
        undoEntries.push({ ref, before, after });
      }
    }
    undoHistory.pushBatch(undoEntries);
    setOptimisticCells(newCells);
    onBulkReplace(newCells);
    onAddColumn();
    if (onSetMergedRegions && mergedRegions.length > 0) {
      onSetMergedRegions(adjustMergesOnColShift(mergedRegions, col, 1));
    }
  }

  function handleInsertColumnRight(col: number) {
    handleInsertColumnLeft(col + 1);
  }

  function handleDeleteColumn(col: number) {
    if (columnCount <= 1 || !onBulkReplace || !onDeleteLastColumn) return;
    const undoEntries: UndoEntry[] = [];
    const newCells = shiftColsLeft(mergedCells, col);
    const allRefs = new Set([
      ...Object.keys(mergedCells),
      ...Object.keys(newCells),
    ]);
    for (const ref of allRefs) {
      const before = mergedCells[ref] ?? { value: "" };
      const after = newCells[ref] ?? { value: "" };
      if (
        before.value !== after.value ||
        JSON.stringify(before) !== JSON.stringify(after)
      ) {
        undoEntries.push({ ref, before, after });
      }
    }
    undoHistory.pushBatch(undoEntries);
    setOptimisticCells(newCells);
    onBulkReplace(newCells);
    onDeleteLastColumn();
    if (onSetMergedRegions && mergedRegions.length > 0) {
      onSetMergedRegions(adjustMergesOnColShift(mergedRegions, col, -1));
    }
  }

  // ---- Fill handle ----
  function handleFillHandleStart() {
    setFillHandleActive(true);
    // Initialize fill range to current selection
    if (selectionRange) {
      setFillHandleRange({ ...selectionRange });
    } else {
      const { row, col } = getSelectedCoords();
      setFillHandleRange({
        startRow: row,
        startCol: col,
        endRow: row,
        endCol: col,
      });
    }
  }

  function handleFillHandleDrag(row: number, col: number) {
    if (!fillHandleActive) return;
    const sr =
      selectionRange ??
      (() => {
        const { row: r, col: c } = getSelectedCoords();
        return { startRow: r, startCol: c, endRow: r, endCol: c };
      })();
    const minR = Math.min(sr.startRow, sr.endRow);
    const maxR = Math.max(sr.startRow, sr.endRow);
    const minC = Math.min(sr.startCol, sr.endCol);
    const maxC = Math.max(sr.startCol, sr.endCol);

    // Lock to single axis: choose the dominant direction
    const rowDist = Math.abs(row - maxR) + Math.abs(row - minR);
    const colDist = Math.abs(col - maxC) + Math.abs(col - minC);

    if (rowDist >= colDist) {
      // Vertical fill
      setFillHandleRange({
        startRow: minR,
        startCol: minC,
        endRow: row,
        endCol: maxC,
      });
    } else {
      // Horizontal fill
      setFillHandleRange({
        startRow: minR,
        startCol: minC,
        endRow: maxR,
        endCol: col,
      });
    }
  }

  function handleFillHandleEnd() {
    if (!fillHandleActive || !fillHandleRange) {
      setFillHandleActive(false);
      setFillHandleRange(null);
      return;
    }

    const sr =
      selectionRange ??
      (() => {
        const { row: r, col: c } = getSelectedCoords();
        return { startRow: r, startCol: c, endRow: r, endCol: c };
      })();
    const srcMinR = Math.min(sr.startRow, sr.endRow);
    const srcMaxR = Math.max(sr.startRow, sr.endRow);
    const srcMinC = Math.min(sr.startCol, sr.endCol);
    const srcMaxC = Math.max(sr.startCol, sr.endCol);

    const fillMinR = Math.min(fillHandleRange.startRow, fillHandleRange.endRow);
    const fillMaxR = Math.max(fillHandleRange.startRow, fillHandleRange.endRow);
    const fillMinC = Math.min(fillHandleRange.startCol, fillHandleRange.endCol);
    const fillMaxC = Math.max(fillHandleRange.startCol, fillHandleRange.endCol);

    const undoEntries: UndoEntry[] = [];

    // Determine fill direction
    if (fillMaxR > srcMaxR) {
      // Fill down
      for (let c = srcMinC; c <= srcMaxC; c++) {
        const sourceVals: string[] = [];
        for (let r = srcMinR; r <= srcMaxR; r++) {
          sourceVals.push(mergedCells[cellRef(r, c)]?.value ?? "");
        }
        const series = detectSeries(sourceVals);
        for (let r = srcMaxR + 1; r <= fillMaxR; r++) {
          const ref = cellRef(r, c);
          if (readOnlyCells.has(ref)) continue;
          const before = mergedCells[ref] ?? { value: "" };
          let newValue: string;
          if (series.type === "formula") {
            const srcFormula =
              sourceVals[(r - srcMaxR - 1) % sourceVals.length];
            newValue = adjustFormulaRefs(
              srcFormula,
              r - srcMinR - ((r - srcMaxR - 1) % sourceVals.length),
              0,
            );
          } else {
            newValue = generateFillValue(sourceVals, r - srcMaxR - 1);
          }
          const after = { ...before, value: newValue };
          undoEntries.push({ ref, before, after });
          setOptimisticCells((prev) => ({ ...prev, [ref]: after }));
          onCellChange(ref, after);
        }
      }
    } else if (fillMinR < srcMinR) {
      // Fill up
      for (let c = srcMinC; c <= srcMaxC; c++) {
        const sourceVals: string[] = [];
        for (let r = srcMaxR; r >= srcMinR; r--) {
          sourceVals.push(mergedCells[cellRef(r, c)]?.value ?? "");
        }
        for (let r = srcMinR - 1; r >= fillMinR; r--) {
          const ref = cellRef(r, c);
          if (readOnlyCells.has(ref)) continue;
          const before = mergedCells[ref] ?? { value: "" };
          const newValue = generateFillValue(sourceVals, srcMinR - 1 - r);
          const after = { ...before, value: newValue };
          undoEntries.push({ ref, before, after });
          setOptimisticCells((prev) => ({ ...prev, [ref]: after }));
          onCellChange(ref, after);
        }
      }
    } else if (fillMaxC > srcMaxC) {
      // Fill right
      for (let r = srcMinR; r <= srcMaxR; r++) {
        const sourceVals: string[] = [];
        for (let c = srcMinC; c <= srcMaxC; c++) {
          sourceVals.push(mergedCells[cellRef(r, c)]?.value ?? "");
        }
        const series = detectSeries(sourceVals);
        for (let c = srcMaxC + 1; c <= fillMaxC; c++) {
          const ref = cellRef(r, c);
          if (readOnlyCells.has(ref)) continue;
          const before = mergedCells[ref] ?? { value: "" };
          let newValue: string;
          if (series.type === "formula") {
            const srcFormula =
              sourceVals[(c - srcMaxC - 1) % sourceVals.length];
            newValue = adjustFormulaRefs(
              srcFormula,
              0,
              c - srcMinC - ((c - srcMaxC - 1) % sourceVals.length),
            );
          } else {
            newValue = generateFillValue(sourceVals, c - srcMaxC - 1);
          }
          const after = { ...before, value: newValue };
          undoEntries.push({ ref, before, after });
          setOptimisticCells((prev) => ({ ...prev, [ref]: after }));
          onCellChange(ref, after);
        }
      }
    } else if (fillMinC < srcMinC) {
      // Fill left
      for (let r = srcMinR; r <= srcMaxR; r++) {
        const sourceVals: string[] = [];
        for (let c = srcMaxC; c >= srcMinC; c--) {
          sourceVals.push(mergedCells[cellRef(r, c)]?.value ?? "");
        }
        for (let c = srcMinC - 1; c >= fillMinC; c--) {
          const ref = cellRef(r, c);
          if (readOnlyCells.has(ref)) continue;
          const before = mergedCells[ref] ?? { value: "" };
          const newValue = generateFillValue(sourceVals, srcMinC - 1 - c);
          const after = { ...before, value: newValue };
          undoEntries.push({ ref, before, after });
          setOptimisticCells((prev) => ({ ...prev, [ref]: after }));
          onCellChange(ref, after);
        }
      }
    }

    if (undoEntries.length > 0) {
      undoHistory.pushBatch(undoEntries);
    }

    // Update selection to include filled area
    setSelectionRange({
      startRow: fillMinR,
      startCol: fillMinC,
      endRow: fillMaxR,
      endCol: fillMaxC,
    });

    setFillHandleActive(false);
    setFillHandleRange(null);
  }

  // ---- Freeze panes ----
  function handleSetFreeze(row: number, col: number) {
    onSetFreeze?.(row, col);
  }

  // ---- Merge cells ----
  function handleMergeCells() {
    if (!selectionRange || !onSetMergedRegions) return;
    const minR = Math.min(selectionRange.startRow, selectionRange.endRow);
    const maxR = Math.max(selectionRange.startRow, selectionRange.endRow);
    const minC = Math.min(selectionRange.startCol, selectionRange.endCol);
    const maxC = Math.max(selectionRange.startCol, selectionRange.endCol);
    if (minR === maxR && minC === maxC) return; // single cell, nothing to merge

    const newRegion: MergedRegion = {
      startRow: minR,
      startCol: minC,
      endRow: maxR,
      endCol: maxC,
    };
    const updated = addMerge(newRegion, mergedRegions);
    onSetMergedRegions(updated);

    // Move all content to primary cell, clear others
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
    // Center the primary cell
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

  // ---- Validation ----
  function handleOpenValidationDialog(ref: string) {
    setValidationDialogRef(ref);
    setValidationDialogOpen(true);
  }

  function handleSaveValidation(rule: ValidationRule | undefined) {
    const existing = mergedCells[validationDialogRef] ?? { value: "" };
    handleCellChange(validationDialogRef, {
      ...existing,
      validationRule: rule,
    });
  }

  // ---- Conditional Formatting ----
  function handleOpenCondFormatDialog() {
    setCondFormatDialogOpen(true);
  }

  function handleSaveConditionalFormats(rules: CondFormatRule[]) {
    onSetConditionalFormats?.(rules);
  }

  // ---- PDF Export ----
  function handleOpenPdfExportDialog() {
    setPdfExportDialogOpen(true);
  }

  function handlePdfExport(opts: {
    pageSize: "A4" | "LETTER";
    orientation: "portrait" | "landscape";
    exportRange: "all" | "selection";
    includeHeader: boolean;
    margins: "normal" | "narrow" | "wide";
    fileName: string;
  }) {
    const range =
      opts.exportRange === "selection" && selectionRange
        ? {
            startRow: Math.min(selectionRange.startRow, selectionRange.endRow),
            startCol: Math.min(selectionRange.startCol, selectionRange.endCol),
            endRow: Math.max(selectionRange.startRow, selectionRange.endRow),
            endCol: Math.max(selectionRange.startCol, selectionRange.endCol),
          }
        : undefined;

    exportToPdf({
      cells: mergedCells,
      columnCount,
      rowCount,
      mergedRegions,
      conditionalFormats,
      sheetName: activeTabData?.label ?? "Sheet",
      pageSize: opts.pageSize,
      orientation: opts.orientation,
      columnWidths,
      range,
      includeHeader: opts.includeHeader,
      margins: opts.margins,
      fileName: opts.fileName,
    });
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
        // Formula mode
        isFormulaMode,
        formulaCursorPos,
        setFormulaCursorPos,
        insertCellRefInFormula,
        insertRangeRefInFormula,
        formulaRefHighlights,
        // Row/Column operations
        insertRowAbove: handleInsertRowAbove,
        insertRowBelow: handleInsertRowBelow,
        deleteRow: handleDeleteRow,
        insertColumnLeft: handleInsertColumnLeft,
        insertColumnRight: handleInsertColumnRight,
        deleteColumn: handleDeleteColumn,
        // Fill handle
        fillHandleActive,
        fillHandleRange,
        onFillHandleStart: handleFillHandleStart,
        onFillHandleDrag: handleFillHandleDrag,
        onFillHandleEnd: handleFillHandleEnd,
        // Paste special
        pasteSpecial: doPaste,
        // Freeze
        freezeRow,
        freezeCol,
        setFreeze: handleSetFreeze,
        // Merge
        mergedRegions,
        mergeCells: handleMergeCells,
        unmergeCells: handleUnmergeCells,
        // Validation
        openValidationDialog: handleOpenValidationDialog,
        // Conditional formatting
        conditionalFormats,
        openConditionalFormatDialog: handleOpenCondFormatDialog,
        // PDF export
        openPdfExportDialog: handleOpenPdfExportDialog,
      }}
    >
      <div className="flex flex-col h-full">
        {/* Excel frame */}
        <div
          className="flex flex-col flex-1 min-h-0"
          data-spreadsheet-light=""
          style={{ border: "1px solid var(--sheet-grid)" }}
        >
          <Ribbon
            actions={
              <>
                {ribbonActions}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={handleOpenPdfExportDialog}
                >
                  <FileDown className="size-3.5" />
                  Export PDF
                </Button>
              </>
            }
          />
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

        {/* Validation Rule Dialog */}
        <ValidationRuleDialog
          open={validationDialogOpen}
          onOpenChange={setValidationDialogOpen}
          currentRule={mergedCells[validationDialogRef]?.validationRule}
          onSave={handleSaveValidation}
          cellRef={validationDialogRef}
        />

        {/* Conditional Format Dialog */}
        <ConditionalFormatDialog
          open={condFormatDialogOpen}
          onOpenChange={setCondFormatDialogOpen}
          rules={conditionalFormats}
          onSave={handleSaveConditionalFormats}
          selectionRange={selectionRange}
          selectedCell={selectedCell}
        />

        {/* PDF Export Dialog */}
        <PdfExportDialog
          open={pdfExportDialogOpen}
          onOpenChange={setPdfExportDialogOpen}
          onExport={handlePdfExport}
          selectionRange={selectionRange}
          sheetName={activeTabData?.label ?? "Sheet"}
        />
      </div>
    </SpreadsheetProvider>
  );
}
