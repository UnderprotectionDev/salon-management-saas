"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { MergedRegion } from "./merge-utils";
import type { NumberFormat } from "./number-format";
import type {
  CellData,
  CellMap,
  ColumnWidths,
  ContextMenuState,
} from "./spreadsheet-types";

export interface SpreadsheetContextValue {
  // Cell data
  cells: CellMap;
  onCellChange: (ref: string, data: CellData) => void;

  // Selection
  selectedCell: string;
  setSelectedCell: (ref: string) => void;
  selectionRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  setSelectionRange: (
    range: {
      startRow: number;
      startCol: number;
      endRow: number;
      endCol: number;
    } | null,
  ) => void;

  // Editing
  editingValue: string;
  setEditingValue: (val: string) => void;

  // Zoom
  zoom: number;
  setZoom: (z: number) => void;

  // Formatting state (reflects active cell)
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  fontSize: string;
  fontFamily: string;

  // Formatting actions
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onAlignChange: (align: "left" | "center" | "right") => void;
  onFontSizeChange: (size: string) => void;
  onFontFamilyChange: (family: string) => void;

  // Color
  onFillColor: (color: string | null) => void;
  onTextColor: (color: string | null) => void;

  // Number format
  numberFormat: NumberFormat;
  onNumberFormatChange: (format: NumberFormat) => void;

  // Clipboard
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: () => void;

  // Read-only cells
  readOnlyCells: Set<string>;

  // Column count
  columnCount: number;
  onAddColumn: () => void;
  onDeleteLastColumn: () => void;

  // Row count
  rowCount: number;
  onAddRow: () => void;
  onDeleteLastRow: () => void;

  // Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  // Column widths
  columnWidths: ColumnWidths;
  setColumnWidth: (col: number, width: number) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Context menu
  contextMenu: ContextMenuState | null;
  setContextMenu: (state: ContextMenuState | null) => void;

  // Column filters
  columnFilters: Record<number, Set<string>>;
  setColumnFilter: (col: number, values: Set<string> | null) => void;
  clearAllFilters: () => void;
  filteredRowIndices: Set<number> | null;

  // --- Phase 1: Formula mode ---
  isFormulaMode: boolean;
  formulaCursorPos: number;
  setFormulaCursorPos: (pos: number) => void;
  insertCellRefInFormula: (ref: string) => void;
  insertRangeRefInFormula: (startRef: string, endRef: string) => void;
  /** Map of cell ref -> highlight color for formula references */
  formulaRefHighlights: Map<string, string>;

  // --- Phase 1D: Row/Column insert/delete ---
  insertRowAbove: (row: number) => void;
  insertRowBelow: (row: number) => void;
  deleteRow: (row: number) => void;
  insertColumnLeft: (col: number) => void;
  insertColumnRight: (col: number) => void;
  deleteColumn: (col: number) => void;

  // --- Phase 2A: Fill handle ---
  fillHandleActive: boolean;
  fillHandleRange: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null;
  onFillHandleStart: () => void;
  onFillHandleDrag: (row: number, col: number) => void;
  onFillHandleEnd: () => void;

  // --- Phase 2D: Paste special ---
  pasteSpecial: (mode: "all" | "values" | "format") => void;

  // --- Phase 3A: Freeze panes ---
  freezeRow: number;
  freezeCol: number;
  setFreeze: (row: number, col: number) => void;

  // --- Phase 3B: Merged cells ---
  mergedRegions: MergedRegion[];
  mergeCells: () => void;
  unmergeCells: () => void;

  // --- Formula sidebar ---
  formulaSidebarOpen: boolean;
  setFormulaSidebarOpen: (open: boolean) => void;

  // --- Custom formulas ---
  customFormulas: Record<string, string>;

  // --- Keyboard shortcuts ---
  onOpenShortcuts: () => void;
}

const SpreadsheetContext = createContext<SpreadsheetContextValue | null>(null);

export function useSpreadsheet() {
  const ctx = useContext(SpreadsheetContext);
  if (!ctx)
    throw new Error("useSpreadsheet must be used within SpreadsheetProvider");
  return ctx;
}

export function SpreadsheetProvider({
  value,
  children,
}: {
  value: SpreadsheetContextValue;
  children: ReactNode;
}) {
  return (
    <SpreadsheetContext.Provider value={value}>
      {children}
    </SpreadsheetContext.Provider>
  );
}
